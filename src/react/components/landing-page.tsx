'use client'

import { useEffect, useState } from 'react'
import type { LandingPageRenderData, LandingSection } from '../../types.js'
import { SectionRenderer, type SectionTheme } from './section-renderer.js'

export interface LandingPageProps {
  slug: string
  gatewayUrl?: string
  renderSection?: (section: LandingSection, defaultRenderer: () => React.ReactNode) => React.ReactNode
  onDataLoaded?: (data: LandingPageRenderData) => void
  onError?: (error: Error) => void
}

type LoadState = 'loading' | 'ready' | 'not_found' | 'expired' | 'error'

export function LandingPage({
  slug,
  gatewayUrl = 'https://whale-gateway.fly.dev',
  renderSection,
  onDataLoaded,
  onError,
}: LandingPageProps) {
  const [state, setState] = useState<LoadState>('loading')
  const [data, setData] = useState<LandingPageRenderData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!slug) return
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(`${gatewayUrl}/l/${encodeURIComponent(slug)}`)
        if (!cancelled) {
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
        }
      } catch (err) {
        if (!cancelled) {
          const e = err instanceof Error ? err : new Error(String(err))
          setErrorMsg(e.message)
          setState('error')
          onError?.(e)
        }
      }
    }

    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, gatewayUrl])

  if (state === 'loading') return <DefaultLoading />
  if (state === 'not_found') return <DefaultNotFound />
  if (state === 'expired') return <DefaultExpired />
  if (state === 'error') return <DefaultError message={errorMsg} />
  if (!data) return null

  return <PageLayout data={data} gatewayUrl={gatewayUrl} renderSection={renderSection} />
}

// ─── Page Layout ──────────────────────────────────────────────────────────────

function PageLayout({
  data,
  gatewayUrl,
  renderSection,
}: {
  data: LandingPageRenderData
  gatewayUrl: string
  renderSection?: LandingPageProps['renderSection']
}) {
  const { landing_page: lp, store } = data

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

  const sorted = [...lp.sections].sort((a, b) => a.order - b.order)

  const sectionData = { ...data, gatewayUrl, landing_page: { slug: lp.slug } }

  return (
    <div style={{ minHeight: '100dvh', background: theme.bg, color: theme.fg, fontFamily }}>
      {lp.custom_css && <style>{lp.custom_css}</style>}

      {logoUrl && (
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <img src={logoUrl} alt={store?.name || 'Store'} style={{ height: 40, objectFit: 'contain' }} />
        </div>
      )}

      {sorted.map((section) => {
        const defaultRenderer = () => (
          <SectionRenderer key={section.id} section={section} data={sectionData} theme={theme} />
        )

        if (renderSection) {
          return <div key={section.id}>{renderSection(section, defaultRenderer)}</div>
        }

        return <SectionRenderer key={section.id} section={section} data={sectionData} theme={theme} />
      })}

      {store?.name && (
        <div style={{ padding: '2rem 1.5rem', borderTop: `1px solid ${theme.surface}`, textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: theme.muted, margin: 0 }}>
            Powered by {store.name}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── State Screens ────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  minHeight: '100dvh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  background: '#050505',
  color: '#fafafa',
  textAlign: 'center',
  padding: '2rem',
}

function DefaultLoading() {
  return (
    <div style={containerStyle}>
      <div>
        <div style={{ width: 32, height: 32, border: '2px solid #333', borderTopColor: '#fafafa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}

function DefaultNotFound() {
  return (
    <div style={containerStyle}>
      <div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Page Not Found</h1>
        <p style={{ color: '#888' }}>This page does not exist or has been removed.</p>
      </div>
    </div>
  )
}

function DefaultExpired() {
  return (
    <div style={containerStyle}>
      <div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Page Expired</h1>
        <p style={{ color: '#888' }}>This page is no longer active.</p>
      </div>
    </div>
  )
}

function DefaultError({ message }: { message: string }) {
  return (
    <div style={containerStyle}>
      <div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Something Went Wrong</h1>
        <p style={{ color: '#888' }}>{message || 'Please try again later.'}</p>
      </div>
    </div>
  )
}
