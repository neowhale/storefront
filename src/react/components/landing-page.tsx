'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LandingPageRenderData, LandingSection } from '../../types.js'
import { SectionRenderer, type SectionTheme } from './section-renderer.js'

export interface LandingPageProps {
  slug: string
  gatewayUrl?: string
  renderSection?: (section: LandingSection, defaultRenderer: () => React.ReactNode) => React.ReactNode
  onDataLoaded?: (data: LandingPageRenderData) => void
  onError?: (error: Error) => void
  onEvent?: (event: string, data: Record<string, unknown>) => void
  analyticsContext?: { visitorId?: string; sessionId?: string }
  enableAnalytics?: boolean
}

type LoadState = 'loading' | 'ready' | 'not_found' | 'expired' | 'error'

/** Read pre-injected data synchronously to avoid flash of loading state */
function getInlinedData(): LandingPageRenderData | null {
  if (typeof window !== 'undefined' && (window as any).__LANDING_DATA__) {
    return (window as any).__LANDING_DATA__ as LandingPageRenderData
  }
  return null
}

export function LandingPage({
  slug,
  gatewayUrl = 'https://whale-gateway.fly.dev',
  renderSection,
  onDataLoaded,
  onError,
  onEvent,
  analyticsContext,
  enableAnalytics = true,
}: LandingPageProps) {
  const inlined = useRef(getInlinedData()).current
  const [state, setState] = useState<LoadState>(inlined ? 'ready' : 'loading')
  const [data, setData] = useState<LandingPageRenderData | null>(inlined)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!slug) return

    // Data already loaded from server-inlined __LANDING_DATA__
    if (data) {
      onDataLoaded?.(data)
      return
    }

    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`${gatewayUrl}/l/${encodeURIComponent(slug)}`)
        if (cancelled) return
        if (res.status === 404) { setState('not_found'); return }
        if (res.status === 410) { setState('expired'); return }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error?.message ?? `Failed to load: ${res.status}`)
        }
        const json: LandingPageRenderData = await res.json()
        setData(json)
        setState('ready')
        onDataLoaded?.(json)
      } catch (err) {
        if (cancelled) return
        const e = err instanceof Error ? err : new Error(String(err))
        setErrorMsg(e.message)
        setState('error')
        onError?.(e)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, gatewayUrl])

  if (state === 'loading') return <StateScreen title="" loading />
  if (state === 'not_found') return <StateScreen title="Page Not Found" subtitle="This page does not exist or has been removed." />
  if (state === 'expired') return <StateScreen title="Page Expired" subtitle="This page is no longer active." />
  if (state === 'error') return <StateScreen title="Something Went Wrong" subtitle={errorMsg || 'Please try again later.'} />
  if (!data) return null

  return (
    <PageLayout data={data} gatewayUrl={gatewayUrl} renderSection={renderSection}
      onEvent={onEvent} analyticsContext={analyticsContext} enableAnalytics={enableAnalytics} />
  )
}

// ─── Page Layout ──────────────────────────────────────────────────────────────

function isSectionVisible(section: LandingSection, urlParams: URLSearchParams): boolean {
  const vis = section.config?.visibility as { params?: Record<string, string[]> } | undefined
  if (!vis?.params) return true
  for (const [key, allowed] of Object.entries(vis.params)) {
    const val = urlParams.get(key)
    if (!val || !allowed.includes(val)) return false
  }
  return true
}

function PageLayout({
  data, gatewayUrl, renderSection, onEvent, analyticsContext, enableAnalytics,
}: {
  data: LandingPageRenderData; gatewayUrl: string
  renderSection?: LandingPageProps['renderSection']
  onEvent?: (event: string, data: Record<string, unknown>) => void
  analyticsContext?: LandingPageProps['analyticsContext']
  enableAnalytics?: boolean
}) {
  const { landing_page: lp, store } = data
  const trackerRef = useRef<any>(null)

  // ─── Analytics bootstrap ───
  useEffect(() => {
    if (!enableAnalytics || typeof window === 'undefined') return
    const config = (window as any).__LANDING_ANALYTICS__ as {
      gatewayUrl?: string; slug?: string; landingPageId?: string; campaignId?: string; storeId?: string
    } | undefined
    if (!config?.slug) return

    let visitorId = localStorage.getItem('wt_vid') || ''
    if (!visitorId) { visitorId = crypto.randomUUID(); localStorage.setItem('wt_vid', visitorId) }
    let sessionId = sessionStorage.getItem('wt_sid') || ''
    if (!sessionId) { sessionId = crypto.randomUUID(); sessionStorage.setItem('wt_sid', sessionId) }

    import('../../behavioral/tracker.js').then(({ BehavioralTracker }) => {
      const gwUrl = config.gatewayUrl || gatewayUrl
      const slug = config.slug!
      const utmParams = new URLSearchParams(window.location.search)

      const tracker = new BehavioralTracker({
        sessionId, visitorId,
        sendBatch: async (batch) => {
          const events = batch.events.map((e) => ({
            event_type: e.data_type, event_data: e.data,
            session_id: batch.session_id, visitor_id: batch.visitor_id,
            campaign_id: config.campaignId || utmParams.get('utm_campaign_id') || undefined,
            utm_source: utmParams.get('utm_source') || undefined,
            utm_medium: utmParams.get('utm_medium') || undefined,
            utm_campaign: utmParams.get('utm_campaign') || undefined,
          }))
          sendEvents(gwUrl, slug, events)
        },
      })

      tracker.setPageContext(window.location.href, window.location.pathname)
      tracker.start()
      trackerRef.current = tracker

      sendEvents(gwUrl, slug, [{
        event_type: 'page_view',
        event_data: { referrer: document.referrer, url: window.location.href },
        session_id: sessionId, visitor_id: visitorId,
        campaign_id: config.campaignId || undefined,
      }])
    }).catch(() => {})

    return () => { trackerRef.current?.stop(); trackerRef.current = null }
  }, [enableAnalytics, gatewayUrl])

  // ─── Event handler that sends section events to the analytics endpoint ───
  const handleEvent = useCallback((event: string, eventData: Record<string, unknown>) => {
    onEvent?.(event, eventData)
    if (!enableAnalytics || typeof window === 'undefined') return
    const config = (window as any).__LANDING_ANALYTICS__
    if (!config?.slug) return
    sendEvents(config.gatewayUrl || gatewayUrl, config.slug, [{
      event_type: event, event_data: eventData,
      session_id: sessionStorage.getItem('wt_sid') || undefined,
      visitor_id: localStorage.getItem('wt_vid') || undefined,
      campaign_id: config.campaignId || undefined,
    }])
  }, [onEvent, enableAnalytics, gatewayUrl])

  const theme: SectionTheme = {
    bg: lp.background_color || (store?.theme?.background as string) || '#050505',
    fg: lp.text_color || (store?.theme?.foreground as string) || '#fafafa',
    accent: lp.accent_color || (store?.theme?.accent as string) || '#E8E2D9',
    surface: (store?.theme?.surface as string) || '#111',
    muted: (store?.theme?.muted as string) || '#888',
    fontDisplay: (store?.theme?.fontDisplay as string) || undefined,
    fontBody: (store?.theme?.fontBody as string) || undefined,
  }

  const fontFamily = lp.font_family || theme.fontDisplay || 'system-ui, -apple-system, sans-serif'
  const logoUrl = store?.logo_url
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
  const sorted = [...lp.sections].sort((a, b) => a.order - b.order).filter((s) => isSectionVisible(s, urlParams))
  const sectionData = { ...data, gatewayUrl, landing_page: { slug: lp.slug }, analyticsContext }

  return (
    <div style={{ minHeight: '100dvh', background: theme.bg, color: theme.fg, fontFamily }}>
      {lp.custom_css && <style>{lp.custom_css}</style>}
      {logoUrl && (
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <img src={logoUrl} alt={store?.name || 'Store'} style={{ height: 40, objectFit: 'contain' }} />
        </div>
      )}
      {sorted.map((section) => {
        const defaultRenderer = () => <SectionRenderer key={section.id} section={section} data={sectionData} theme={theme} onEvent={handleEvent} />
        if (renderSection) return <div key={section.id}>{renderSection(section, defaultRenderer)}</div>
        return <SectionRenderer key={section.id} section={section} data={sectionData} theme={theme} onEvent={handleEvent} />
      })}
      {store?.name && (
        <div style={{ padding: '2rem 1.5rem', borderTop: `1px solid ${theme.surface}`, textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: theme.muted, margin: 0 }}>Powered by {store.name}</p>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sendEvents(gwUrl: string, slug: string, events: Record<string, unknown>[]) {
  const body = JSON.stringify({ events })
  const url = `${gwUrl}/l/${encodeURIComponent(slug)}/events`
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
  } else {
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
  }
}

// ─── State Screens ───────────────────────────────────────────────────────────

const screenStyle: React.CSSProperties = {
  minHeight: '100dvh', display: 'flex', justifyContent: 'center', alignItems: 'center',
  fontFamily: 'system-ui, -apple-system, sans-serif', background: '#050505',
  color: '#fafafa', textAlign: 'center', padding: '2rem',
}

function StateScreen({ title, subtitle, loading }: { title: string; subtitle?: string; loading?: boolean }) {
  return (
    <div style={screenStyle}>
      <div>
        {loading && (
          <>
            <div style={{ width: 32, height: 32, border: '2px solid #333', borderTopColor: '#fafafa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </>
        )}
        {title && <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{title}</h1>}
        {subtitle && <p style={{ color: '#888' }}>{subtitle}</p>}
      </div>
    </div>
  )
}
