'use client'

import { useState } from 'react'
import type { LandingSection } from '../../types.js'

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

// ─── Click tracking context ───────────────────────────────────────────────────

export interface ClickTrackingContext {
  gatewayUrl?: string
  code?: string
}

function trackClick(tracking: ClickTrackingContext | undefined, label: string, url: string, position?: number) {
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
}

// ─── Section Router ───────────────────────────────────────────────────────────

export function SectionRenderer({
  section,
  data,
  theme,
  tracking,
}: {
  section: LandingSection
  data: SectionData
  theme: SectionTheme
  tracking?: ClickTrackingContext
}) {
  const [showCOA, setShowCOA] = useState(false)

  const el = (() => {
    switch (section.type) {
      case 'hero': return <HeroSection section={section} theme={theme} tracking={tracking} />
      case 'text': return <TextSection section={section} theme={theme} />
      case 'image': return <ImageSection section={section} theme={theme} />
      case 'video': return <VideoSection section={section} theme={theme} />
      case 'gallery': return <GallerySection section={section} theme={theme} />
      case 'cta': return <CTASection section={section} theme={theme} tracking={tracking} />
      case 'stats': return <StatsSection section={section} theme={theme} />
      case 'product_card': return <ProductCardSection section={section} data={data} theme={theme} tracking={tracking} />
      case 'coa_viewer': return <COAViewerSection section={section} data={data} theme={theme} onShowCOA={() => setShowCOA(true)} tracking={tracking} />
      case 'social_links': return <SocialLinksSection section={section} theme={theme} />
      case 'lead_capture': return <LeadCaptureSection section={section} data={data} theme={theme} />
      case 'divider': return <DividerSection theme={theme} />
      default: return null
    }
  })()

  return (
    <>
      {el}
      {showCOA && data?.coa && <COAModal coa={data.coa} theme={theme} onClose={() => setShowCOA(false)} />}
    </>
  )
}

// ─── Section Renderers ────────────────────────────────────────────────────────

function HeroSection({ section, theme, tracking }: { section: LandingSection; theme: SectionTheme; tracking?: ClickTrackingContext }) {
  const { title, subtitle, background_image, cta_text, cta_url } = section.content as {
    title?: string; subtitle?: string; background_image?: string; cta_text?: string; cta_url?: string
  }

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '3rem 1.5rem',
        backgroundImage: background_image ? `url(${background_image})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {background_image && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      )}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 640 }}>
        {title && (
          <h1 style={{
            fontSize: 'clamp(2rem, 8vw, 3rem)',
            fontWeight: 300,
            fontFamily: theme.fontDisplay || 'inherit',
            margin: '0 0 1rem',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            color: theme.fg,
          }}>
            {title}
          </h1>
        )}
        {subtitle && (
          <p style={{
            fontSize: '0.85rem',
            color: theme.accent,
            margin: '0 0 2rem',
            lineHeight: 1.6,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
          }}>
            {subtitle}
          </p>
        )}
        {cta_text && cta_url && (
          <a
            href={cta_url}
            onClick={() => trackClick(tracking, cta_text!, cta_url!)}
            style={{
              display: 'inline-block',
              padding: '0.875rem 2rem',
              background: theme.fg,
              color: theme.bg,
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {cta_text}
          </a>
        )}
      </div>
    </div>
  )
}

function TextSection({ section, theme }: { section: LandingSection; theme: SectionTheme }) {
  const { heading, body } = section.content as { heading?: string; body?: string }
  const align = (section.config?.align as string) || 'left'

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: 640, margin: '0 auto', textAlign: align as 'left' | 'center' | 'right' }}>
      {heading && (
        <h2 style={{
          fontSize: 11,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.25em',
          color: `${theme.fg}40`,
          margin: '0 0 0.75rem',
        }}>
          {heading}
        </h2>
      )}
      {body && (
        <div style={{ color: `${theme.fg}99`, lineHeight: 1.7, fontSize: '0.9rem', fontWeight: 300, whiteSpace: 'pre-wrap' }}>
          {body}
        </div>
      )}
    </div>
  )
}

function ImageSection({ section, theme }: { section: LandingSection; theme: SectionTheme }) {
  const { url, alt, caption } = section.content as { url?: string; alt?: string; caption?: string }
  const contained = section.config?.contained !== false

  if (!url) return null

  return (
    <div style={{ padding: contained ? '1.5rem' : 0, maxWidth: contained ? 640 : undefined, margin: contained ? '0 auto' : undefined }}>
      <img
        src={url}
        alt={alt || ''}
        style={{ width: '100%', display: 'block', objectFit: 'cover' }}
      />
      {caption && (
        <p style={{ fontSize: '0.8rem', color: theme.muted, textAlign: 'center', marginTop: '0.75rem' }}>
          {caption}
        </p>
      )}
    </div>
  )
}

function VideoSection({ section, theme }: { section: LandingSection; theme: SectionTheme }) {
  const { url, poster } = section.content as { url?: string; poster?: string }

  if (!url) return null

  const isEmbed = url.includes('youtube') || url.includes('youtu.be') || url.includes('vimeo')

  return (
    <div style={{ padding: '1.5rem', maxWidth: 640, margin: '0 auto' }}>
      {isEmbed ? (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
          <iframe
            src={toEmbedUrl(url)}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            allow="autoplay; fullscreen"
            title="Video"
          />
        </div>
      ) : (
        <video
          src={url}
          poster={poster}
          controls
          style={{ width: '100%', display: 'block', background: theme.surface }}
        />
      )}
    </div>
  )
}

function GallerySection({ section, theme }: { section: LandingSection; theme: SectionTheme }) {
  const { images } = section.content as { images?: Array<{ url: string; alt?: string }> }
  const columns = (section.config?.columns as number) || 3

  if (!images || images.length === 0) return null

  return (
    <div style={{ padding: '1.5rem', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '0.5rem' }}>
        {images.map((img, i) => (
          <div key={i} style={{ aspectRatio: '1', overflow: 'hidden', background: theme.surface }}>
            <img
              src={img.url}
              alt={img.alt || ''}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function CTASection({ section, theme, tracking }: { section: LandingSection; theme: SectionTheme; tracking?: ClickTrackingContext }) {
  const { title, subtitle, buttons } = section.content as {
    title?: string; subtitle?: string
    buttons?: Array<{ text: string; url: string; style?: 'primary' | 'outline' }>
  }

  if (!buttons || buttons.length === 0) return null

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {title && (
        <h2 style={{
          fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
          fontWeight: 300,
          fontFamily: theme.fontDisplay || 'inherit',
          margin: '0 0 0.25rem',
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
          color: theme.fg,
          textAlign: 'center',
        }}>
          {title}
        </h2>
      )}
      {subtitle && (
        <p style={{
          fontSize: '0.8rem',
          color: theme.accent,
          margin: '0 0 0.75rem',
          lineHeight: 1.6,
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          textAlign: 'center',
        }}>
          {subtitle}
        </p>
      )}
      {buttons.map((btn, i) => {
        const isPrimary = btn.style !== 'outline'
        return (
          <a
            key={i}
            href={btn.url}
            onClick={() => trackClick(tracking, btn.text, btn.url, i)}
            style={{
              display: 'block',
              width: '100%',
              padding: '0.875rem',
              background: isPrimary ? theme.fg : 'transparent',
              color: isPrimary ? theme.bg : theme.fg,
              border: isPrimary ? 'none' : `1px solid ${theme.fg}20`,
              fontSize: '0.85rem',
              fontWeight: 500,
              textAlign: 'center',
              textDecoration: 'none',
              boxSizing: 'border-box',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {btn.text}
          </a>
        )
      })}
    </div>
  )
}

function StatsSection({ section, theme }: { section: LandingSection; theme: SectionTheme }) {
  const { stats } = section.content as { stats?: Array<{ label: string; value: string }> }
  const layout = section.config?.layout as string | undefined

  if (!stats || stats.length === 0) return null

  // List layout = vertical key-value pairs (for details like terpenes, batch, etc.)
  if (layout === 'list') {
    return (
      <div style={{ padding: '1.5rem', maxWidth: 640, margin: '0 auto' }}>
        {stats.map((stat, i) => (
          <div key={i}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              padding: '0.625rem 0',
            }}>
              <span style={{
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: `${theme.fg}66`,
              }}>
                {stat.label}
              </span>
              <span style={{ fontSize: 14, fontWeight: 300, color: `${theme.fg}CC` }}>
                {stat.value}
              </span>
            </div>
            {i < stats.length - 1 && (
              <hr style={{ border: 'none', borderTop: `1px solid ${theme.fg}0A`, margin: 0 }} />
            )}
          </div>
        ))}
      </div>
    )
  }

  // Default = grid of stat cards (cannabinoids, etc.)
  const columns = Math.min(stats.length, 4)

  return (
    <div style={{ padding: '1.5rem', maxWidth: 640, margin: '0 auto' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        border: `1px solid ${theme.fg}0F`,
      }}>
        {stats.map((stat, i) => (
          <div key={i} style={{
            padding: '1.25rem 0.5rem',
            textAlign: 'center',
            borderRight: i < stats.length - 1 ? `1px solid ${theme.fg}0F` : undefined,
          }}>
            <div style={{
              fontFamily: theme.fontDisplay || 'inherit',
              fontSize: 'clamp(1.5rem, 5vw, 2rem)',
              fontWeight: 300,
              lineHeight: 1,
              color: theme.fg,
            }}>
              {stat.value}
            </div>
            <div style={{
              fontSize: 11,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.25em',
              color: theme.accent,
              marginTop: '0.5rem',
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProductCardSection({ section, data, theme, tracking }: { section: LandingSection; data: SectionData; theme: SectionTheme; tracking?: ClickTrackingContext }) {
  const product = data?.product
  const c = section.content as { name?: string; description?: string; image_url?: string; url?: string }

  const name = c.name || (product?.name as string) || ''
  const description = c.description || (product?.description as string) || ''
  const imageUrl = c.image_url || (product?.featured_image as string) || null
  const url = c.url || null

  return (
    <div style={{ padding: '1.5rem', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ background: theme.surface, overflow: 'hidden' }}>
        {imageUrl && (
          <div style={{ width: '100%', aspectRatio: '1', overflow: 'hidden' }}>
            <img src={imageUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}
        <div style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem', color: theme.fg }}>{name}</h3>
          {description && (
            <p style={{ fontSize: '0.9rem', color: theme.muted, margin: '0 0 1rem', lineHeight: 1.5 }}>{description}</p>
          )}
          {url && (
            <a
              href={url}
              onClick={() => trackClick(tracking, 'View Product', url!)}
              style={{
                display: 'block',
                width: '100%',
                padding: '0.75rem',
                background: theme.fg,
                color: theme.bg,
                textAlign: 'center',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 500,
                boxSizing: 'border-box',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              View Product
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function COAViewerSection({
  section,
  data,
  theme,
  onShowCOA,
  tracking,
}: { section: LandingSection; data: SectionData; theme: SectionTheme; onShowCOA: () => void; tracking?: ClickTrackingContext }) {
  const coa = data?.coa
  const c = section.content as { button_text?: string }

  if (!coa) return null

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.875rem',
    background: theme.accent,
    color: theme.bg,
    border: 'none',
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    textAlign: 'center',
    textDecoration: 'none',
    display: 'block',
    boxSizing: 'border-box',
  }

  // If a viewer URL exists (e.g. Quantix COA page), link directly to it.
  // Otherwise fall back to the iframe modal with the raw PDF.
  const buttonLabel = c.button_text || 'View Lab Results'

  if (coa.viewer_url) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: 480, margin: '0 auto' }}>
        <a
          href={coa.viewer_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackClick(tracking, buttonLabel, coa.viewer_url!)}
          style={buttonStyle}
        >
          {buttonLabel}
        </a>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 480, margin: '0 auto' }}>
      <button onClick={() => { trackClick(tracking, buttonLabel, coa.url); onShowCOA() }} style={buttonStyle}>
        {buttonLabel}
      </button>
    </div>
  )
}

function LeadCaptureSection({ section, data, theme }: { section: LandingSection; data: SectionData; theme: SectionTheme }) {
  const c = section.content as {
    heading?: string
    subtitle?: string
    button_text?: string
    success_heading?: string
    success_message?: string
    coupon_code?: string
    gateway_url?: string
    store_id?: string
    source?: string
    landing_page_slug?: string
    tags?: string[]
  }

  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const gatewayUrl = c.gateway_url || data.gatewayUrl || 'https://whale-gateway.fly.dev'
  const storeId = c.store_id || data.store?.id
  const slug = c.landing_page_slug || (data.landing_page as { slug?: string } | null)?.slug

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !storeId) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch(`${gatewayUrl}/v1/stores/${storeId}/storefront/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          first_name: firstName || undefined,
          source: c.source || 'landing_page',
          landing_page_slug: slug || undefined,
          tags: c.tags || undefined,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: { message?: string } })?.error?.message || 'Something went wrong. Please try again.')
      }

      setStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  const heading = c.heading || 'get 10% off your first visit.'
  const subtitle = c.subtitle || 'drop your email and we will send you the code.'
  const buttonText = c.button_text || 'Claim My Discount'
  const successHeading = c.success_heading || 'You\u2019re in!'
  const successMessage = c.success_message || 'Check your inbox for the discount code.'

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: '0.875rem 1rem',
    background: theme.surface,
    border: `1px solid ${theme.fg}15`,
    color: theme.fg,
    fontSize: '0.95rem',
    fontWeight: 300,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  }

  return (
    <div style={{ padding: '3.5rem 1.5rem', maxWidth: 560, margin: '0 auto' }}>
      <style>{`@keyframes lc-spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{
        background: theme.surface,
        border: `1px solid ${theme.fg}12`,
        padding: 'clamp(2rem, 6vw, 3rem)',
      }}>
        {status === 'success' ? (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{
              fontSize: 'clamp(1.5rem, 5vw, 2rem)',
              fontWeight: 300,
              fontFamily: theme.fontDisplay || 'inherit',
              margin: '0 0 0.75rem',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              color: theme.fg,
            }}>
              {successHeading}
            </h2>
            <p style={{
              fontSize: '0.9rem',
              color: `${theme.fg}99`,
              margin: '0 0 1.5rem',
              lineHeight: 1.6,
              fontWeight: 300,
            }}>
              {successMessage}
            </p>
            {c.coupon_code && (
              <div style={{
                display: 'inline-block',
                padding: '0.75rem 2rem',
                background: `${theme.fg}08`,
                border: `1px dashed ${theme.fg}30`,
                fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
                fontWeight: 500,
                fontFamily: 'monospace',
                letterSpacing: '0.12em',
                color: theme.accent,
              }}>
                {c.coupon_code}
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 'clamp(1.5rem, 4vw, 2rem)' }}>
              <h2 style={{
                fontSize: 'clamp(1.5rem, 5vw, 2.25rem)',
                fontWeight: 300,
                fontFamily: theme.fontDisplay || 'inherit',
                margin: '0 0 0.5rem',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                color: theme.fg,
              }}>
                {heading}
              </h2>
              <p style={{
                fontSize: '0.85rem',
                color: theme.accent,
                margin: 0,
                lineHeight: 1.6,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
              }}>
                {subtitle}
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              {status === 'error' && errorMsg && (
                <p style={{ fontSize: '0.8rem', color: '#e55', margin: 0, fontWeight: 400 }}>
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  background: theme.fg,
                  color: theme.bg,
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: status === 'loading' ? 'wait' : 'pointer',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: status === 'loading' ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {status === 'loading' && (
                  <span style={{
                    display: 'inline-block',
                    width: 16,
                    height: 16,
                    border: `2px solid ${theme.bg}40`,
                    borderTopColor: theme.bg,
                    borderRadius: '50%',
                    animation: 'lc-spin 0.8s linear infinite',
                  }} />
                )}
                {buttonText}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function SocialLinksSection({ section, theme }: { section: LandingSection; theme: SectionTheme }) {
  const { links } = section.content as { links?: Array<{ platform: string; url: string }> }

  if (!links || links.length === 0) return null

  return (
    <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
      {links.map((link, i) => (
        <a
          key={i}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: theme.muted,
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 500,
            textTransform: 'capitalize',
            letterSpacing: '0.03em',
          }}
        >
          {link.platform}
        </a>
      ))}
    </div>
  )
}

function DividerSection({ theme }: { theme: SectionTheme }) {
  return (
    <div style={{ padding: '1rem 1.5rem', maxWidth: 640, margin: '0 auto' }}>
      <hr style={{ border: 'none', borderTop: `1px solid ${theme.fg}0A`, margin: 0 }} />
    </div>
  )
}

function COAModal({ coa, theme, onClose }: {
  coa: { url: string; document_name: string }; theme: SectionTheme; onClose: () => void
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.fg}10`,
      }}>
        <span style={{ color: '#fff', fontWeight: 500, fontSize: '0.85rem' }}>
          {coa.document_name || 'Lab Results'}
        </span>
        <button
          onClick={onClose}
          style={{
            background: `${theme.fg}10`,
            border: 'none',
            color: '#fff',
            fontSize: '0.85rem',
            cursor: 'pointer',
            padding: '0.375rem 0.75rem',
          }}
        >
          Close
        </button>
      </div>
      <iframe src={coa.url} style={{ flex: 1, border: 'none', background: '#fff' }} title="Lab Results" />
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toEmbedUrl(url: string): string {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

  return url
}
