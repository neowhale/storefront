import type { PixelProvider } from './types.js'

/** Map SDK event names → GA4 recommended event names */
const EVENT_MAP: Record<string, string> = {
  page_view: 'page_view',
  product_view: 'view_item',
  add_to_cart: 'add_to_cart',
  remove_from_cart: 'remove_from_cart',
  begin_checkout: 'begin_checkout',
  purchase: 'purchase',
  search: 'search',
  category_view: 'view_item_list',
}

export class GooglePixelProvider implements PixelProvider {
  readonly name = 'google'
  private measurementId: string
  private loaded = false

  constructor(measurementId: string) {
    this.measurementId = measurementId
  }

  async load(): Promise<void> {
    if (typeof window === 'undefined') return
    if (this.loaded) return

    const w = window as any

    // Initialize dataLayer
    w.dataLayer = w.dataLayer || []
    if (!w.gtag) {
      w.gtag = function (...args: any[]) {
        w.dataLayer.push(arguments)
      }
      w.gtag('js', new Date())
      w.gtag('config', this.measurementId)
    }

    // Inject gtag.js script
    await new Promise<void>((resolve) => {
      const script = document.createElement('script')
      script.async = true
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`
      script.onload = () => resolve()
      script.onerror = () => resolve()
      document.head.appendChild(script)
    })

    this.loaded = true
  }

  track(event: string, params?: Record<string, unknown>): void {
    if (typeof window === 'undefined') return
    const w = window as any
    if (typeof w.gtag !== 'function') return

    const ga4Event = EVENT_MAP[event]
    if (!ga4Event) return

    // Strip eventID (Meta-specific), map to GA4 params
    const { eventID, product_id, product_name, quantity, price, tier, total, order_id, order_number, cart_id, item_count, query, result_count, ...rest } = params ?? {}

    const ga4Params: Record<string, unknown> = { ...rest }

    if (total !== undefined) ga4Params.value = total
    if (order_id) ga4Params.transaction_id = order_id
    if (query) ga4Params.search_term = query

    // Build items array for e-commerce events
    if (product_id) {
      ga4Params.items = [{
        item_id: product_id,
        item_name: product_name,
        quantity: quantity ?? 1,
        price,
        item_variant: tier,
      }]
    }

    ga4Params.currency = 'USD'

    w.gtag('event', ga4Event, ga4Params)
  }

  isLoaded(): boolean {
    return this.loaded
  }
}
