import type { PixelProvider } from './types.js'

/** Map SDK event names → Meta standard event names */
const EVENT_MAP: Record<string, string> = {
  page_view: 'PageView',
  product_view: 'ViewContent',
  add_to_cart: 'AddToCart',
  remove_from_cart: 'RemoveFromCart',
  begin_checkout: 'InitiateCheckout',
  purchase: 'Purchase',
  search: 'Search',
  category_view: 'ViewContent',
  lead: 'Lead',
  cta_click: 'ViewContent',
}

export class MetaPixelProvider implements PixelProvider {
  readonly name = 'meta'
  private pixelId: string
  private loaded = false

  constructor(pixelId: string) {
    this.pixelId = pixelId
  }

  async load(): Promise<void> {
    if (typeof window === 'undefined') return
    if (this.loaded) return

    // Initialize fbq queue
    const w = window as any
    if (!w.fbq) {
      const n: any = (w.fbq = function (...args: any[]) {
        n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args)
      })
      if (!w._fbq) w._fbq = n
      n.push = n
      n.loaded = true
      n.version = '2.0'
      n.queue = []
    }

    // Inject script
    await new Promise<void>((resolve) => {
      const script = document.createElement('script')
      script.async = true
      script.src = 'https://connect.facebook.net/en_US/fbevents.js'
      script.onload = () => resolve()
      script.onerror = () => resolve() // don't block on load failure
      const first = document.getElementsByTagName('script')[0]
      first?.parentNode?.insertBefore(script, first)
    })

    w.fbq('init', this.pixelId)
    w.fbq('track', 'PageView')
    this.loaded = true
  }

  track(event: string, params?: Record<string, unknown>): void {
    if (typeof window === 'undefined') return
    const w = window as any
    if (typeof w.fbq !== 'function') return

    const metaEvent = EVENT_MAP[event]
    if (!metaEvent) return

    // Extract eventID for Meta dedup (fbq 4th arg), pass remaining as event params
    const { eventID, ...rest } = params ?? {}
    const hasParams = Object.keys(rest).length > 0
    const options = eventID ? { eventID } : undefined

    if (hasParams) {
      w.fbq('track', metaEvent, rest, options)
    } else {
      w.fbq('track', metaEvent, {}, options)
    }
  }

  isLoaded(): boolean {
    return this.loaded
  }
}
