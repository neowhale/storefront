'use client'

import { useEffect, useState } from 'react'
import type { QRLandingData, LandingSection, LandingPageConfig } from '../../types.js'
import { SectionRenderer, type SectionTheme, type ClickTrackingContext } from './section-renderer.js'

export interface QRLandingPageProps {
  code: string
  gatewayUrl?: string
  /** Override rendering for any section type */
  renderSection?: (section: LandingSection, defaultRenderer: () => React.ReactNode) => React.ReactNode
  onDataLoaded?: (data: QRLandingData) => void
  onError?: (error: Error) => void
}

type LoadState = 'loading' | 'ready' | 'not_found' | 'expired' | 'error'

export function QRLandingPage({
  code,
  gatewayUrl = 'https://whale-gateway.fly.dev',
  renderSection,
  onDataLoaded,
  onError,
}: QRLandingPageProps) {
  const [state, setState] = useState<LoadState>('loading')
  const [data, setData] = useState<QRLandingData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!code) return
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(`${gatewayUrl}/q/${encodeURIComponent(code)}/page`)
        if (!cancelled) {
          if (res.status === 404) { setState('not_found'); return }
          if (res.status === 410) { setState('expired'); return }
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body?.error?.message ?? `Failed to load: ${res.status}`)
          }
          const json: QRLandingData = await res.json()
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
  }, [code, gatewayUrl])

  if (state === 'loading') return <DefaultLoading />
  if (state === 'not_found') return <DefaultNotFound />
  if (state === 'expired') return <DefaultExpired />
  if (state === 'error') return <DefaultError message={errorMsg} />
  if (!data) return null

  // If a landing page template is linked, use its sections.
  // Otherwise, auto-generate sections from product/COA data.
  const lp = data.landing_page
  const sections = lp?.sections ?? buildDefaultSections(data)

  const theme = extractTheme(data, lp)
  const fontFamily = lp?.font_family
    || (data.store?.theme?.fontDisplay as string)
    || 'system-ui, -apple-system, sans-serif'

  const logoUrl = data.qr_code.logo_url || data.store?.logo_url
  const storeName = data.store?.name

  const sorted = [...sections].sort((a, b) => a.order - b.order)
  const tracking: ClickTrackingContext = { gatewayUrl, code }

  return (
    <div style={{ minHeight: '100dvh', background: theme.bg, color: theme.fg, fontFamily }}>
      {lp?.custom_css && <style>{lp.custom_css}</style>}

      {/* Header */}
      {logoUrl && (
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <img src={logoUrl} alt={storeName || 'Store'} style={{ height: 40, objectFit: 'contain' }} />
        </div>
      )}

      {/* Sections */}
      {sorted.map((section) => {
        const defaultRenderer = () => (
          <SectionRenderer key={section.id} section={section} data={data} theme={theme} tracking={tracking} />
        )

        if (renderSection) {
          return <div key={section.id}>{renderSection(section, defaultRenderer)}</div>
        }

        return <SectionRenderer key={section.id} section={section} data={data} theme={theme} tracking={tracking} />
      })}

      {/* Footer */}
      {storeName && (
        <div style={{ padding: '2rem 1.5rem', borderTop: `1px solid ${theme.surface}`, textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: theme.muted, margin: 0 }}>
            {storeName}{data.store?.tagline ? ` — ${data.store.tagline}` : ''}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Theme Extraction ─────────────────────────────────────────────────────────

function extractTheme(data: QRLandingData, lp: LandingPageConfig | null): SectionTheme {
  const t = data.store?.theme as Record<string, unknown> | null | undefined
  const qrLp = data.qr_code.landing_page
  return {
    bg: lp?.background_color || qrLp.background_color || (t?.background as string) || '#050505',
    fg: lp?.text_color || qrLp.text_color || (t?.foreground as string) || '#fafafa',
    accent: lp?.accent_color || (t?.accent as string) || '#E8E2D9',
    surface: (t?.surface as string) || '#111',
    muted: (t?.muted as string) || '#888',
    fontDisplay: (t?.fontDisplay as string) || 'system-ui, -apple-system, sans-serif',
    fontBody: (t?.fontBody as string) || 'system-ui, -apple-system, sans-serif',
  }
}

// ─── Default Sections Builder ─────────────────────────────────────────────────
// When no landing page template is linked, generate sections from product data.

function buildDefaultSections(data: QRLandingData): LandingSection[] {
  const { product, coa, qr_code: qr } = data
  const cf = product?.custom_fields as Record<string, unknown> | null | undefined
  const sections: LandingSection[] = []
  let order = 0

  const productName = qr.landing_page.title || (product?.name as string) || qr.name
  const productImage = qr.landing_page.image_url || (product?.featured_image as string) || null
  const description = (product?.description as string) || ''
  const categoryName = (product?.category_name as string) ?? null
  const strainType = toStr(cf?.strain_type)
  const tagline = toStr(cf?.tagline)

  // Hero — product image with name and category/strain subtitle (no CTA here)
  if (productImage) {
    sections.push({
      id: 'auto-hero',
      type: 'hero',
      order: order++,
      content: {
        title: productName,
        subtitle: [categoryName, strainType].filter(Boolean).join(' · '),
        background_image: productImage,
      },
    })
  } else {
    sections.push({
      id: 'auto-header',
      type: 'text',
      order: order++,
      content: {
        heading: productName,
        body: [categoryName, strainType].filter(Boolean).join(' · ') || undefined,
      },
      config: { align: 'center' },
    })
  }

  // Tagline
  if (tagline) {
    sections.push({
      id: 'auto-tagline',
      type: 'text',
      order: order++,
      content: { body: tagline },
      config: { align: 'center' },
    })
  }

  // Cannabinoid stats
  const thca = toNum(cf?.thca_percentage)
  const thc = toNum(cf?.d9_percentage)
  const cbd = toNum(cf?.cbd_total)
  const stats: Array<{ label: string; value: string }> = []
  if (thca != null) stats.push({ label: 'THCa', value: `${thca.toFixed(thca >= 1 ? 1 : 2)}%` })
  if (thc != null) stats.push({ label: 'Δ9 THC', value: `${thc.toFixed(thc >= 1 ? 1 : 2)}%` })
  if (cbd != null) stats.push({ label: 'CBD', value: `${cbd.toFixed(cbd >= 1 ? 1 : 2)}%` })

  if (stats.length > 0) {
    sections.push({
      id: 'auto-stats',
      type: 'stats',
      order: order++,
      content: { stats },
    })
  }

  // Product details — genetics, terpenes, effects
  const profileDetails: Array<{ label: string; value: string }> = []
  const genetics = toStr(cf?.genetics)
  const terpenes = toStr(cf?.terpenes)
  const effects = toStr(cf?.effects)
  const flavorProfile = toStr(cf?.flavor_profile)
  const bestFor = toStr(cf?.best_for)

  if (genetics) profileDetails.push({ label: 'Genetics', value: genetics })
  if (terpenes) profileDetails.push({ label: 'Terpenes', value: terpenes })
  if (effects) profileDetails.push({ label: 'Effects', value: effects })
  if (flavorProfile) profileDetails.push({ label: 'Flavor', value: flavorProfile })
  if (bestFor) profileDetails.push({ label: 'Best For', value: bestFor })

  if (profileDetails.length > 0) {
    sections.push({
      id: 'auto-profile',
      type: 'stats',
      order: order++,
      content: { stats: profileDetails },
      config: { layout: 'list' },
    })
  }

  // Description
  if (description) {
    sections.push({
      id: 'auto-description',
      type: 'text',
      order: order++,
      content: { heading: 'About', body: description },
    })
  }

  // Lab results — single COA viewer button (the only "View Lab Results" on the page)
  if (coa) {
    sections.push({
      id: 'auto-coa',
      type: 'coa_viewer',
      order: order++,
      content: { button_text: 'View Lab Results' },
    })
  }

  // Batch & testing info — below the COA button for reference
  const labDetails: Array<{ label: string; value: string }> = []
  const batchNumber = toStr(cf?.batch_number)
  const dateTested = toStr(cf?.date_tested)

  if (batchNumber) labDetails.push({ label: 'Batch', value: batchNumber })
  if (dateTested) labDetails.push({ label: 'Tested', value: formatDate(dateTested) })

  if (labDetails.length > 0) {
    sections.push({
      id: 'auto-lab-info',
      type: 'stats',
      order: order++,
      content: { stats: labDetails },
      config: { layout: 'list' },
    })
  }

  // Shop link — only if product has a slug (link to storefront product page, not COA)
  const productSlug = product?.slug as string | undefined
  if (productSlug) {
    const storeDomain = data.store?.name === 'Flora Distro' ? 'floradistro.com' : null
    if (storeDomain) {
      sections.push({
        id: 'auto-shop',
        type: 'cta',
        order: order++,
        content: {
          buttons: [{ text: 'Shop This Product', url: `https://${storeDomain}/shop/${productSlug}`, style: 'outline' as const }],
        },
      })
    }
  }

  return sections
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNum(v: unknown): number | null {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function toStr(v: unknown): string | null {
  if (v == null || v === '') return null
  return String(v)
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return dateStr }
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
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>QR Code Not Found</h1>
        <p style={{ color: '#888' }}>This QR code does not exist or has been deactivated.</p>
      </div>
    </div>
  )
}

function DefaultExpired() {
  return (
    <div style={containerStyle}>
      <div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>QR Code Expired</h1>
        <p style={{ color: '#888' }}>This QR code is no longer active.</p>
      </div>
    </div>
  )
}

function DefaultError({ message }: { message: string }) {
  return (
    <div style={containerStyle}>
      <div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Something Went Wrong</h1>
        <p style={{ color: '#888' }}>{message || 'Please try scanning again.'}</p>
      </div>
    </div>
  )
}
