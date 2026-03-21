import type { BehavioralEvent, BehavioralBatch } from './types.js'

interface BehavioralTrackerConfig {
  sendBatch: (batch: BehavioralBatch) => Promise<void>
  sessionId: string
  visitorId: string
  flushIntervalMs?: number
  maxBufferSize?: number
}

const SCROLL_MILESTONES = [25, 50, 75, 100] as const
const TIME_MILESTONES = [30, 60, 120, 300] as const
const MOUSE_THROTTLE_MS = 200
const MOUSE_BUFFER_MAX = 100
const RAGE_CLICK_COUNT = 3
const RAGE_CLICK_RADIUS = 50
const RAGE_CLICK_WINDOW_MS = 2000
const MAX_CLICK_HISTORY = 10

export class BehavioralTracker {
  private buffer: BehavioralEvent[] = []
  private config: Required<BehavioralTrackerConfig>
  private pageUrl = ''
  private pagePath = ''
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private scrollMilestones = new Set<number>()
  private timeMilestones = new Set<number>()
  private timeTimers: ReturnType<typeof setTimeout>[] = []
  private exitIntentFired = false
  private startTime = 0
  private clickHistory: Array<{ x: number; y: number; t: number }> = []
  private mouseBuffer: Array<{ x: number; y: number; t: number }> = []
  private lastMouseTime = 0
  private listeners: Array<[EventTarget, string, EventListener]> = []
  private observer: IntersectionObserver | null = null
  private sentinels: HTMLElement[] = []

  constructor(config: BehavioralTrackerConfig) {
    this.config = {
      sendBatch: config.sendBatch,
      sessionId: config.sessionId,
      visitorId: config.visitorId,
      flushIntervalMs: config.flushIntervalMs ?? 10000,
      maxBufferSize: config.maxBufferSize ?? 500,
    }
  }

  start(): void {
    this.startTime = Date.now()

    this.addListener(document, 'click', this.handleClick)
    this.addListener(document, 'mousemove', this.handleMouseMove)
    this.addListener(document, 'mouseout', this.handleMouseOut)
    this.addListener(document, 'copy', this.handleCopy)
    this.addListener(document, 'visibilitychange', this.handleVisibilityChange)

    this.setupScrollTracking()
    this.setupTimeMilestones()

    this.flushTimer = setInterval(() => this.flush(), this.config.flushIntervalMs)
  }

  stop(): void {
    for (const [target, event, handler] of this.listeners) {
      target.removeEventListener(event, handler, { capture: true } as EventListenerOptions)
    }
    this.listeners = []

    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }

    this.clearTimeMilestones()
    this.cleanupScrollTracking()

    // Final flush with any remaining mouse data
    this.flushMouseBuffer()
    this.flush()
  }

  setPageContext(url: string, path: string): void {
    // Flush remaining data from previous page
    this.flushMouseBuffer()
    this.flush()

    this.pageUrl = url
    this.pagePath = path
    this.scrollMilestones.clear()
    this.timeMilestones.clear()
    this.exitIntentFired = false
    this.startTime = Date.now()
    this.clickHistory = []

    this.clearTimeMilestones()
    this.cleanupScrollTracking()

    this.setupTimeMilestones()
    // Delay scroll tracking setup to let the new page render
    requestAnimationFrame(() => this.setupScrollTracking())
  }

  // ---------------------------------------------------------------------------
  // Buffer management
  // ---------------------------------------------------------------------------

  private push(event: BehavioralEvent): void {
    this.buffer.push(event)
    if (this.buffer.length >= this.config.maxBufferSize) {
      this.flush()
    }
  }

  private flush(): void {
    if (this.buffer.length === 0) return

    const batch: BehavioralBatch = {
      session_id: this.config.sessionId,
      visitor_id: this.config.visitorId,
      events: this.buffer,
    }
    this.buffer = []

    this.config.sendBatch(batch).catch(() => {
      // sendBatch implementation handles retries and beacon fallback
    })
  }

  private addListener(target: EventTarget, event: string, handler: EventListener): void {
    target.addEventListener(event, handler, { passive: true, capture: true })
    this.listeners.push([target, event, handler])
  }

  // ---------------------------------------------------------------------------
  // Event handlers (arrow functions for stable `this`)
  // ---------------------------------------------------------------------------

  private handleClick = (e: Event): void => {
    const me = e as MouseEvent
    const target = me.target as Element | null
    if (!target) return

    const now = Date.now()
    const x = me.clientX
    const y = me.clientY

    // Record click for rage detection
    this.clickHistory.push({ x, y, t: now })
    if (this.clickHistory.length > MAX_CLICK_HISTORY) {
      this.clickHistory.shift()
    }

    // Standard click event
    const tag = target.tagName?.toLowerCase() ?? ''
    const rawText = (target as HTMLElement).textContent ?? ''
    const text = rawText.trim().slice(0, 50)

    this.push({
      data_type: 'click',
      data: {
        tag,
        text,
        selector: this.getSelector(target),
        x,
        y,
        timestamp: now,
      },
      page_url: this.pageUrl,
      page_path: this.pagePath,
    })

    // Rage click detection
    this.detectRageClick(x, y, now)
  }

  private handleMouseMove = (e: Event): void => {
    const me = e as MouseEvent
    const now = Date.now()

    if (now - this.lastMouseTime < MOUSE_THROTTLE_MS) return
    this.lastMouseTime = now

    this.mouseBuffer.push({ x: me.clientX, y: me.clientY, t: now })
    if (this.mouseBuffer.length > MOUSE_BUFFER_MAX) {
      this.mouseBuffer.shift()
    }
  }

  private handleMouseOut = (e: Event): void => {
    const me = e as MouseEvent
    if (this.exitIntentFired) return
    if (me.clientY > 0) return
    // Only fire when mouse actually leaves the document element (viewport top)
    if (me.relatedTarget !== null) return

    this.exitIntentFired = true
    this.push({
      data_type: 'exit_intent',
      data: {
        time_on_page_ms: Date.now() - this.startTime,
        timestamp: Date.now(),
      },
      page_url: this.pageUrl,
      page_path: this.pagePath,
    })
  }

  private handleCopy = (): void => {
    const selection = window.getSelection()
    const length = selection?.toString().length ?? 0

    this.push({
      data_type: 'copy',
      data: {
        text_length: length,
        timestamp: Date.now(),
      },
      page_url: this.pageUrl,
      page_path: this.pagePath,
    })
  }

  private handleVisibilityChange = (): void => {
    if (document.visibilityState !== 'hidden') return

    const timeSpent = Date.now() - this.startTime

    this.push({
      data_type: 'page_exit',
      data: {
        time_spent_ms: timeSpent,
        timestamp: Date.now(),
      },
      page_url: this.pageUrl,
      page_path: this.pagePath,
    })

    // Flush immediately — page may be closing
    this.flushMouseBuffer()
    this.flush()
  }

  // ---------------------------------------------------------------------------
  // Scroll tracking with IntersectionObserver
  // ---------------------------------------------------------------------------

  private setupScrollTracking(): void {
    if (typeof IntersectionObserver === 'undefined') return

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const milestone = Number(entry.target.getAttribute('data-scroll-milestone'))
          if (isNaN(milestone) || this.scrollMilestones.has(milestone)) continue

          this.scrollMilestones.add(milestone)
          this.push({
            data_type: 'scroll_depth',
            data: {
              depth_percent: milestone,
              timestamp: Date.now(),
            },
            page_url: this.pageUrl,
            page_path: this.pagePath,
          })
        }
      },
      { threshold: 0 },
    )

    const docHeight = document.documentElement.scrollHeight
    for (const pct of SCROLL_MILESTONES) {
      const sentinel = document.createElement('div')
      sentinel.setAttribute('data-scroll-milestone', String(pct))
      sentinel.style.position = 'absolute'
      sentinel.style.left = '0'
      sentinel.style.width = '1px'
      sentinel.style.height = '1px'
      sentinel.style.pointerEvents = 'none'
      sentinel.style.opacity = '0'
      sentinel.style.top = `${(docHeight * pct) / 100 - 1}px`
      document.body.appendChild(sentinel)
      this.sentinels.push(sentinel)
      this.observer.observe(sentinel)
    }
  }

  private cleanupScrollTracking(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
    for (const sentinel of this.sentinels) {
      sentinel.remove()
    }
    this.sentinels = []
  }

  // ---------------------------------------------------------------------------
  // Time milestones
  // ---------------------------------------------------------------------------

  private setupTimeMilestones(): void {
    for (const seconds of TIME_MILESTONES) {
      const timer = setTimeout(() => {
        if (this.timeMilestones.has(seconds)) return
        this.timeMilestones.add(seconds)
        this.push({
          data_type: 'time_on_page',
          data: {
            milestone_seconds: seconds,
            timestamp: Date.now(),
          },
          page_url: this.pageUrl,
          page_path: this.pagePath,
        })
      }, seconds * 1000)
      this.timeTimers.push(timer)
    }
  }

  private clearTimeMilestones(): void {
    for (const timer of this.timeTimers) {
      clearTimeout(timer)
    }
    this.timeTimers = []
  }

  // ---------------------------------------------------------------------------
  // Rage click detection
  // ---------------------------------------------------------------------------

  private detectRageClick(x: number, y: number, now: number): void {
    const windowStart = now - RAGE_CLICK_WINDOW_MS
    const nearby = this.clickHistory.filter((c) => {
      if (c.t < windowStart) return false
      const dx = c.x - x
      const dy = c.y - y
      return Math.sqrt(dx * dx + dy * dy) <= RAGE_CLICK_RADIUS
    })

    if (nearby.length >= RAGE_CLICK_COUNT) {
      this.push({
        data_type: 'rage_click',
        data: {
          x,
          y,
          click_count: nearby.length,
          timestamp: now,
        },
        page_url: this.pageUrl,
        page_path: this.pagePath,
      })
      // Reset history to avoid repeat detections for the same burst
      this.clickHistory = []
    }
  }

  // ---------------------------------------------------------------------------
  // Mouse buffer flush
  // ---------------------------------------------------------------------------

  private flushMouseBuffer(): void {
    if (this.mouseBuffer.length === 0) return

    this.push({
      data_type: 'mouse_movement',
      data: {
        points: [...this.mouseBuffer],
        timestamp: Date.now(),
      },
      page_url: this.pageUrl,
      page_path: this.pagePath,
    })
    this.mouseBuffer = []
  }

  // ---------------------------------------------------------------------------
  // CSS selector helper
  // ---------------------------------------------------------------------------

  private getSelector(el: Element): string {
    const parts: string[] = []
    let current: Element | null = el
    let depth = 0

    while (current && depth < 3) {
      let segment = current.tagName.toLowerCase()

      if (current.id) {
        segment += `#${current.id}`
      } else if (current.classList.length > 0) {
        segment += `.${Array.from(current.classList).join('.')}`
      }

      parts.unshift(segment)
      current = current.parentElement
      depth++
    }

    return parts.join(' > ')
  }
}
