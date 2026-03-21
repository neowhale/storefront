/**
 * Lightweight session recorder — captures DOM mutations, scroll, mouse,
 * input changes, and viewport resizes without any external dependency.
 *
 * Events are buffered locally and flushed to the backend at a configurable
 * interval (default 5 s) or immediately when the page is being unloaded.
 */

export interface RecordingEvent {
  /** 0=full_snapshot, 1=mutation, 2=mouse, 3=scroll, 4=input, 5=resize, 6=custom */
  type: number
  timestamp: number
  data: Record<string, unknown>
}

interface RecorderConfig {
  sendChunk: (events: RecordingEvent[], sequence: number) => Promise<void>
  /** How often buffered events are flushed (ms). Default 5 000. */
  flushIntervalMs?: number
  /** Maximum events per chunk. Default 200. */
  maxChunkSize?: number
}

type RequiredConfig = Required<RecorderConfig>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now(): number {
  return Date.now()
}

function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number,
): T {
  let last = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  const throttled = (...args: unknown[]) => {
    const elapsed = now() - last
    if (elapsed >= ms) {
      last = now()
      fn(...args)
    } else if (!timer) {
      timer = setTimeout(() => {
        last = now()
        timer = null
        fn(...args)
      }, ms - elapsed)
    }
  }
  return throttled as unknown as T
}

/** Build a short CSS selector for an element (used in mutation / input payloads). */
function shortSelector(el: Element): string {
  if (el.id) return `#${el.id}`
  let sel = el.tagName.toLowerCase()
  if (el.className && typeof el.className === 'string') {
    const cls = el.className
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .join('.')
    if (cls) sel += `.${cls}`
  }
  return sel
}

// ---------------------------------------------------------------------------
// SessionRecorder
// ---------------------------------------------------------------------------

export class SessionRecorder {
  private events: RecordingEvent[] = []
  private sequence = 0
  private observer: MutationObserver | null = null
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private config: RequiredConfig
  private listeners: Array<[EventTarget, string, EventListener, boolean | AddEventListenerOptions | undefined]> = []
  private started = false
  private flushing = false
  /** Pending mutations collected within the current animation frame. */
  private pendingMutations: MutationRecord[] = []
  private mutationRafId: number | null = null

  constructor(config: RecorderConfig) {
    this.config = {
      sendChunk: config.sendChunk,
      flushIntervalMs: config.flushIntervalMs ?? 5_000,
      maxChunkSize: config.maxChunkSize ?? 200,
    }
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  start(): void {
    if (this.started) return
    this.started = true

    this.captureFullSnapshot()
    this.setupMutationObserver()
    this.setupEventListeners()

    this.flushTimer = setInterval(() => {
      void this.flush()
    }, this.config.flushIntervalMs)
  }

  stop(): void {
    if (!this.started) return
    this.started = false

    // Tear down mutation observer
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }

    // Cancel pending mutation raf
    if (this.mutationRafId !== null) {
      cancelAnimationFrame(this.mutationRafId)
      this.mutationRafId = null
    }

    // Remove all event listeners
    for (const [target, event, handler, options] of this.listeners) {
      target.removeEventListener(event, handler, options as EventListenerOptions | undefined)
    }
    this.listeners = []

    // Stop flush timer
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }

    // Final flush
    void this.flush()
  }

  // -----------------------------------------------------------------------
  // Full Snapshot (type 0)
  // -----------------------------------------------------------------------

  private captureFullSnapshot(): void {
    const tree = this.serializeNode(document.documentElement)
    this.push({
      type: 0,
      timestamp: now(),
      data: {
        href: location.href,
        width: window.innerWidth,
        height: window.innerHeight,
        tree: tree ?? {},
      },
    })
  }

  private serializeNode(node: Node): Record<string, unknown> | null {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element

      // Skip <script> and <link rel="preload"> to reduce payload size
      const tag = el.tagName.toLowerCase()
      if (tag === 'script' || tag === 'noscript') return null

      const attrs: Record<string, string> = {}
      for (const attr of Array.from(el.attributes)) {
        // Mask sensitive inputs
        if (
          attr.name === 'value' &&
          el instanceof HTMLInputElement &&
          el.type === 'password'
        ) {
          continue
        }
        attrs[attr.name] = attr.value
      }

      const children: Record<string, unknown>[] = []
      for (const child of Array.from(el.childNodes)) {
        const serialized = this.serializeNode(child)
        if (serialized) children.push(serialized)
      }

      return { tag, attrs, children }
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ''
      // Skip empty text nodes
      if (!text.trim()) return null
      return { text }
    }

    return null
  }

  // -----------------------------------------------------------------------
  // Mutation Observer (type 1)
  // -----------------------------------------------------------------------

  private setupMutationObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      // Batch mutations that arrive in the same animation frame
      this.pendingMutations.push(...mutations)
      if (this.mutationRafId === null) {
        this.mutationRafId = requestAnimationFrame(() => {
          this.processMutations(this.pendingMutations)
          this.pendingMutations = []
          this.mutationRafId = null
        })
      }
    })

    this.observer.observe(document.documentElement, {
      childList: true,
      attributes: true,
      characterData: true,
      subtree: true,
      attributeOldValue: false,
    })
  }

  private processMutations(mutations: MutationRecord[]): void {
    const ts = now()

    const adds: Record<string, unknown>[] = []
    const removes: Record<string, unknown>[] = []
    const attrs: Record<string, unknown>[] = []
    const texts: Record<string, unknown>[] = []

    for (const m of mutations) {
      if (m.type === 'childList') {
        for (const node of Array.from(m.addedNodes)) {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            const serialized = this.serializeNode(node)
            if (serialized) {
              adds.push({
                parentSelector: m.target.nodeType === Node.ELEMENT_NODE
                  ? shortSelector(m.target as Element)
                  : null,
                node: serialized,
              })
            }
          }
        }
        for (const node of Array.from(m.removedNodes)) {
          removes.push({
            parentSelector: m.target.nodeType === Node.ELEMENT_NODE
              ? shortSelector(m.target as Element)
              : null,
            tag: node.nodeType === Node.ELEMENT_NODE
              ? (node as Element).tagName.toLowerCase()
              : '#text',
          })
        }
      } else if (m.type === 'attributes' && m.target.nodeType === Node.ELEMENT_NODE) {
        const el = m.target as Element
        const name = m.attributeName || ''
        attrs.push({
          selector: shortSelector(el),
          name,
          value: el.getAttribute(name),
        })
      } else if (m.type === 'characterData') {
        texts.push({
          parentSelector: m.target.parentElement
            ? shortSelector(m.target.parentElement)
            : null,
          value: (m.target.textContent || '').slice(0, 200),
        })
      }
    }

    // Only push if there's actual data
    if (adds.length || removes.length || attrs.length || texts.length) {
      this.push({
        type: 1,
        timestamp: ts,
        data: {
          adds: adds.length ? adds : undefined,
          removes: removes.length ? removes : undefined,
          attrs: attrs.length ? attrs : undefined,
          texts: texts.length ? texts : undefined,
        },
      })
    }
  }

  // -----------------------------------------------------------------------
  // Event Listeners (types 2–5)
  // -----------------------------------------------------------------------

  private setupEventListeners(): void {
    // --- Mouse (type 2) ---
    const onMouseMove = throttle(((e: MouseEvent) => {
      this.push({
        type: 2,
        timestamp: now(),
        data: { source: 'move', x: e.clientX, y: e.clientY },
      })
    }) as (...args: unknown[]) => void, 100)

    const onClick = ((e: MouseEvent) => {
      const target = e.target as Element | null
      this.push({
        type: 2,
        timestamp: now(),
        data: {
          source: 'click',
          x: e.clientX,
          y: e.clientY,
          target: target ? shortSelector(target) : null,
        },
      })
    }) as EventListener

    this.addListener(document, 'mousemove', onMouseMove as EventListener, { passive: true, capture: true })
    this.addListener(document, 'click', onClick, { passive: true, capture: true })

    // --- Scroll (type 3) ---
    const onScroll = throttle(((e: Event) => {
      const target = e.target
      if (target === document || target === document.documentElement || target === window) {
        this.push({
          type: 3,
          timestamp: now(),
          data: { target: 'window', x: window.scrollX, y: window.scrollY },
        })
      } else if (target instanceof Element) {
        this.push({
          type: 3,
          timestamp: now(),
          data: {
            target: shortSelector(target),
            x: target.scrollLeft,
            y: target.scrollTop,
          },
        })
      }
    }) as (...args: unknown[]) => void, 200)

    this.addListener(document, 'scroll', onScroll as EventListener, { passive: true, capture: true })

    // --- Input (type 4) ---
    const onInput = ((e: Event) => {
      const target = e.target
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
        return
      }
      const isPassword =
        target instanceof HTMLInputElement && target.type === 'password'

      this.push({
        type: 4,
        timestamp: now(),
        data: {
          selector: shortSelector(target),
          tag: target.tagName.toLowerCase(),
          inputType: target instanceof HTMLInputElement ? target.type : undefined,
          value: isPassword ? '***' : (target.value || '').slice(0, 100),
        },
      })
    }) as EventListener

    this.addListener(document, 'input', onInput, { passive: true, capture: true })
    this.addListener(document, 'change', onInput, { passive: true, capture: true })

    // --- Resize (type 5) ---
    const onResize = throttle((() => {
      this.push({
        type: 5,
        timestamp: now(),
        data: { width: window.innerWidth, height: window.innerHeight },
      })
    }) as (...args: unknown[]) => void, 500)

    this.addListener(window, 'resize', onResize as EventListener, { passive: true })

    // --- Visibility change (flush on hide) ---
    const onVisibility = (() => {
      if (document.visibilityState === 'hidden') {
        void this.flush()
      }
    }) as EventListener

    this.addListener(document, 'visibilitychange', onVisibility)
  }

  // -----------------------------------------------------------------------
  // Event buffer & flushing
  // -----------------------------------------------------------------------

  private push(event: RecordingEvent): void {
    if (!this.started) return

    this.events.push(event)

    // Auto-flush if we've hit the chunk limit
    if (this.events.length >= this.config.maxChunkSize) {
      void this.flush()
    }
  }

  private async flush(): Promise<void> {
    if (this.events.length === 0) return
    if (this.flushing) return

    this.flushing = true

    // Swap out the buffer so new events accumulate independently
    const chunk = this.events
    this.events = []
    const seq = this.sequence++

    try {
      await this.config.sendChunk(chunk, seq)
    } catch {
      // Best-effort — if sendChunk itself handles retries / beacon fallback,
      // there's nothing else to do here.
    } finally {
      this.flushing = false
    }
  }

  // -----------------------------------------------------------------------
  // Listener bookkeeping
  // -----------------------------------------------------------------------

  private addListener(
    target: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions,
  ): void {
    target.addEventListener(event, handler, options)
    this.listeners.push([target, event, handler, options])
  }
}
