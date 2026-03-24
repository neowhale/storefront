'use client'

import { useState, useEffect, useRef } from 'react'

// ─── Theme ────────────────────────────────────────────────────────────────────

export interface SectionTheme {
  bg: string
  fg: string
  accent: string
  surface: string
  muted: string
  fontDisplay?: string
  fontBody?: string
}

// ─── Click tracking context (QR/creation beacon system) ──────────────────────

export interface ClickTrackingContext {
  gatewayUrl?: string
  code?: string
}

export function trackClick(tracking: ClickTrackingContext | undefined, label: string, url: string, position?: number) {
  if (!tracking?.gatewayUrl || !tracking?.code) return
  const body = JSON.stringify({ label, url, position })
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(
      `${tracking.gatewayUrl}/q/${encodeURIComponent(tracking.code)}/click`,
      new Blob([body], { type: 'application/json' }),
    )
  }
}

// ─── Shared data shape passed to all section renderers ────────────────────────

export interface SectionData {
  store?: { id?: string; name?: string | null; logo_url?: string | null; tagline?: string | null; theme?: Record<string, unknown> | null } | null
  product?: Record<string, unknown> | null
  coa?: { url: string; viewer_url?: string | null; document_name: string } | null
  gatewayUrl?: string
  landing_page?: { slug?: string } | null
  analyticsContext?: { visitorId?: string; sessionId?: string }
}

// ─── Animated Number Counter ─────────────────────────────────────────────────

/** Global regex for splitting text into numeric + non-numeric segments */
const NUM_SPLIT = /(\$?[\d,]+\.?\d*[+★%]?)/g

/** Non-global regex for testing if a segment is numeric — avoids stateful lastIndex bug */
const NUM_TEST = /^\$?[\d,]+\.?\d*[+★%]?$/

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

function useCountUp(target: number, duration: number, start: boolean): number {
  const [value, setValue] = useState(0)
  const raf = useRef(0)

  useEffect(() => {
    if (!start) return
    const t0 = performance.now()
    function tick(now: number) {
      const elapsed = now - t0
      const progress = Math.min(elapsed / duration, 1)
      setValue(Math.round(easeOutQuart(progress) * target))
      if (progress < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration, start])

  return value
}

export function AnimatedNumber({ raw }: { raw: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const prefix = raw.startsWith('$') ? '$' : ''
  const suffix = raw.match(/[+★%]$/)?.[0] || ''
  const numeric = parseFloat(raw.replace(/[\$,+★%]/g, ''))
  const hasCommas = raw.includes(',')
  const decimals = raw.includes('.') ? (raw.split('.')[1]?.replace(/[+★%]/g, '').length || 0) : 0

  const count = useCountUp(
    decimals > 0 ? Math.round(numeric * Math.pow(10, decimals)) : numeric,
    1400,
    visible,
  )

  const display = decimals > 0
    ? (count / Math.pow(10, decimals)).toFixed(decimals)
    : hasCommas
      ? count.toLocaleString()
      : String(count)

  return <span ref={ref}>{prefix}{display}{suffix}</span>
}

/** Replace numeric segments in a string with animated counters */
export function AnimatedText({ text }: { text: string }) {
  const parts = text.split(NUM_SPLIT)
  return (
    <>
      {parts.map((part, i) =>
        NUM_TEST.test(part)
          ? <AnimatedNumber key={i} raw={part} />
          : part
      )}
    </>
  )
}
