'use client'

import { useEffect, useState, useCallback } from 'react'
import type { QRLandingData } from '../../types.js'

export interface QRLandingPageProps {
  /** QR code string (from URL param) */
  code: string
  /** Gateway URL — defaults to https://whale-gateway.fly.dev */
  gatewayUrl?: string
  /** Custom component for product display */
  renderProduct?: (data: QRLandingData) => React.ReactNode
  /** Custom component for COA/lab results */
  renderCOA?: (data: QRLandingData) => React.ReactNode
  /** Custom component for the full page (overrides default layout) */
  renderPage?: (data: QRLandingData) => React.ReactNode
  /** Called when data is loaded */
  onDataLoaded?: (data: QRLandingData) => void
  /** Called on error */
  onError?: (error: Error) => void
}

type LoadState = 'loading' | 'ready' | 'not_found' | 'expired' | 'error'

/**
 * QR Landing Page — drop-in component that renders a branded landing page
 * for any QR code. Fetches data from the gateway's public endpoint.
 *
 * Usage:
 * ```tsx
 * // In app/qr/[code]/page.tsx:
 * import { QRLandingPage } from '@neowhale/storefront/react'
 * export default function Page({ params }: { params: { code: string } }) {
 *   return <QRLandingPage code={params.code} />
 * }
 * ```
 */
export function QRLandingPage({
  code,
  gatewayUrl = 'https://whale-gateway.fly.dev',
  renderProduct,
  renderCOA,
  renderPage,
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
          if (res.status === 404) {
            setState('not_found')
            return
          }
          if (res.status === 410) {
            setState('expired')
            return
          }
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

  // Full custom rendering
  if (renderPage) return <>{renderPage(data)}</>

  // Default layout with optional slot overrides
  return <DefaultLayout data={data} renderProduct={renderProduct} renderCOA={renderCOA} />
}

// ─── Default Layout ─────────────────────────────────────────────────────────

function DefaultLayout({
  data,
  renderProduct,
  renderCOA,
}: {
  data: QRLandingData
  renderProduct?: (data: QRLandingData) => React.ReactNode
  renderCOA?: (data: QRLandingData) => React.ReactNode
}) {
  const { qr_code: qr, store, product, coa } = data
  const lp = qr.landing_page
  const [showCOA, setShowCOA] = useState(false)

  const bg = lp.background_color || store?.theme?.background as string || '#050505'
  const fg = lp.text_color || store?.theme?.foreground as string || '#fafafa'
  const accent = store?.theme?.accent as string || qr.brand_color || '#E8E2D9'
  const surface = store?.theme?.surface as string || '#111'
  const muted = store?.theme?.muted as string || '#888'
  const logoUrl = qr.logo_url || store?.logo_url
  const productImage = lp.image_url || (product?.featured_image as string) || (product?.image_gallery as string[])?.[0] || null
  const productName = lp.title || (product?.name as string) || qr.name
  const description = lp.description || (product?.description as string) || ''
  const ctaText = lp.cta_text || (coa ? 'View Lab Results' : 'Learn More')
  const ctaUrl = lp.cta_url || qr.destination_url

  // Cannabinoid data from custom_fields
  const cf = product?.custom_fields as Record<string, unknown> | null | undefined
  const thca = (cf?.thca_percentage as number) ?? null
  const thc = (cf?.d9_percentage as number) ?? null
  const cbd = (cf?.cbd_total as number) ?? null
  const strainType = (cf?.strain_type as string) ?? null
  const categoryName = (product?.category_name as string) ?? null

  const handleCOAClick = useCallback(() => {
    if (coa) setShowCOA(true)
  }, [coa])

  return (
    <div style={{ minHeight: '100dvh', background: bg, color: fg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
        {logoUrl && (
          <img
            src={logoUrl}
            alt={store?.name || 'Store'}
            style={{ height: 40, objectFit: 'contain' }}
          />
        )}
      </div>

      {/* Product Image */}
      {productImage && (
        <div style={{ width: '100%', aspectRatio: '1', overflow: 'hidden', background: surface }}>
          <img
            src={productImage}
            alt={productName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '1.5rem', maxWidth: 480, margin: '0 auto' }}>
        {/* Strain badge + category */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          {strainType && (
            <span style={{
              padding: '0.25rem 0.75rem',
              borderRadius: 999,
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: strainBadgeColor(strainType),
              color: '#fff',
            }}>
              {strainType}
            </span>
          )}
          {categoryName && (
            <span style={{
              padding: '0.25rem 0.75rem',
              borderRadius: 999,
              fontSize: '0.75rem',
              background: surface,
              color: muted,
            }}>
              {categoryName}
            </span>
          )}
        </div>

        {/* Product Name */}
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, margin: '0 0 0.5rem', lineHeight: 1.2 }}>
          {productName}
        </h1>

        {description && (
          <p style={{ color: muted, lineHeight: 1.6, margin: '0 0 1.5rem', fontSize: '0.95rem' }}>
            {description}
          </p>
        )}

        {/* Custom product render slot */}
        {renderProduct ? renderProduct(data) : null}

        {/* Cannabinoid stats */}
        {(thca || thc || cbd) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', margin: '1.5rem 0' }}>
            {thca != null && <StatCard label="THCa" value={`${thca.toFixed(1)}%`} bg={surface} fg={fg} accent={accent} />}
            {thc != null && <StatCard label="D9 THC" value={`${thc.toFixed(1)}%`} bg={surface} fg={fg} accent={accent} />}
            {cbd != null && <StatCard label="CBD" value={`${cbd.toFixed(1)}%`} bg={surface} fg={fg} accent={accent} />}
          </div>
        )}

        {/* CTA Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
          {coa && (
            <button
              onClick={handleCOAClick}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: accent,
                color: bg,
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: 0,
              }}
            >
              View Lab Results
            </button>
          )}
          {/* Custom COA render slot */}
          {renderCOA ? renderCOA(data) : null}
          <a
            href={ctaUrl}
            style={{
              display: 'block',
              width: '100%',
              padding: '0.875rem',
              background: 'transparent',
              color: fg,
              border: `1px solid ${muted}`,
              fontSize: '0.95rem',
              fontWeight: 500,
              textAlign: 'center',
              textDecoration: 'none',
              boxSizing: 'border-box',
              borderRadius: 0,
            }}
          >
            {ctaText === 'View Lab Results' ? 'Shop Online' : ctaText}
          </a>
        </div>

        {/* Authenticity footer */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: `1px solid ${surface}`, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Lab Tested
            </span>
            <span style={{ fontSize: '0.75rem', color: muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Authentic
            </span>
          </div>
          {store?.name && (
            <p style={{ fontSize: '0.75rem', color: muted, margin: 0 }}>
              Verified by {store.name}
            </p>
          )}
        </div>
      </div>

      {/* COA Modal */}
      {showCOA && coa && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
            <span style={{ color: '#fff', fontWeight: 600 }}>{coa.document_name || 'Lab Results'}</span>
            <button
              onClick={() => setShowCOA(false)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', padding: '0.5rem' }}
            >
              ✕
            </button>
          </div>
          <iframe
            src={coa.url}
            style={{ flex: 1, border: 'none', background: '#fff' }}
            title="Lab Results"
          />
        </div>
      )}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function StatCard({ label, value, bg, fg, accent }: { label: string; value: string; bg: string; fg: string; accent: string }) {
  return (
    <div style={{ background: bg, padding: '1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: fg }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>{label}</div>
    </div>
  )
}

function strainBadgeColor(strain: string): string {
  const s = strain.toLowerCase()
  if (s === 'sativa') return '#22c55e'
  if (s === 'indica') return '#8b5cf6'
  if (s === 'hybrid') return '#f59e0b'
  return '#6b7280'
}

// ─── State Screens ──────────────────────────────────────────────────────────

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
