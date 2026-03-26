'use client'

import type { LandingSection } from '../../../types.js'
import { AnimatedText, type SectionTheme, type ClickTrackingContext, trackClick } from './shared.js'

export function HeroSection({ section, theme, tracking, onEvent }: {
  section: LandingSection; theme: SectionTheme; tracking?: ClickTrackingContext
  onEvent?: (event: string, data: Record<string, unknown>) => void
}) {
  const { title, subtitle, background_image, cta_text, cta_url } = section.content as {
    title?: string; subtitle?: string; background_image?: string; cta_text?: string; cta_url?: string
  }

  return (
    <div style={{
      position: 'relative', minHeight: '60vh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '3rem 1.5rem',
      backgroundImage: background_image ? `url(${background_image})` : undefined,
      backgroundSize: 'cover', backgroundPosition: 'center',
    }}>
      {background_image && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 640 }}>
        {title && (
          <h1 style={{
            fontSize: 'clamp(2rem, 8vw, 3rem)', fontWeight: 300,
            fontFamily: theme.fontDisplay || 'inherit', margin: '0 0 1rem',
            lineHeight: 1.15, letterSpacing: '-0.02em', color: theme.fg,
          }}>
            <AnimatedText text={title} />
          </h1>
        )}
        {subtitle && (
          <p style={{
            fontSize: '0.85rem', color: theme.accent, margin: '0 0 2rem',
            lineHeight: 1.6, textTransform: 'uppercase', letterSpacing: '0.15em',
          }}>
            {subtitle}
          </p>
        )}
        {cta_text && cta_url && (
          <a
            href={cta_url}
            onClick={() => {
              trackClick(tracking, cta_text!, cta_url!)
              onEvent?.('cta_click', { label: cta_text!, url: cta_url! })
            }}
            style={{
              display: 'inline-block', padding: '0.875rem 2rem', background: theme.fg,
              color: theme.bg, textDecoration: 'none', fontSize: '0.85rem',
              fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
            }}
          >
            {cta_text}
          </a>
        )}
      </div>
    </div>
  )
}

export function TextSection({ section, theme }: { section: LandingSection; theme: SectionTheme }) {
  const { heading, body } = section.content as { heading?: string; body?: string }
  const align = (section.config?.align as string) || 'left'

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: 640, margin: '0 auto', textAlign: align as 'left' | 'center' | 'right' }}>
      {heading && (
        <h2 style={{
          fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
          letterSpacing: '0.25em', color: `${theme.fg}40`, margin: '0 0 0.75rem',
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

export function ImageSection({ section, theme }: { section: LandingSection; theme: SectionTheme }) {
  const { url, alt, caption } = section.content as { url?: string; alt?: string; caption?: string }
  const contained = section.config?.contained !== false
  if (!url) return null

  return (
    <div style={{ padding: contained ? '1.5rem' : 0, maxWidth: contained ? 640 : undefined, margin: contained ? '0 auto' : undefined }}>
      <img src={url} alt={alt || ''} style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
      {caption && (
        <p style={{ fontSize: '0.8rem', color: theme.muted, textAlign: 'center', marginTop: '0.75rem' }}>{caption}</p>
      )}
    </div>
  )
}

export function VideoSection({ section, theme }: { section: LandingSection; theme: SectionTheme }) {
  const { url, poster } = section.content as { url?: string; poster?: string }
  if (!url) return null

  const isEmbed = url.includes('youtube') || url.includes('youtu.be') || url.includes('vimeo')

  return (
    <div style={{ padding: '1.5rem', maxWidth: 640, margin: '0 auto' }}>
      {isEmbed ? (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
          <iframe src={toEmbedUrl(url)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allow="autoplay; fullscreen" title="Video" />
        </div>
      ) : (
        <video src={url} poster={poster} controls style={{ width: '100%', display: 'block', background: theme.surface }} />
      )}
    </div>
  )
}

export function CollageHeroSection({ section, theme, tracking, onEvent }: {
  section: LandingSection; theme: SectionTheme; tracking?: ClickTrackingContext
  onEvent?: (event: string, data: Record<string, unknown>) => void
}) {
  const c = section.content as {
    title?: string; subtitle?: string; cta_text?: string; cta_url?: string
    images?: Array<{ url: string; alt?: string }>
    overlay_opacity?: number
  }
  const images = c.images || []
  if (images.length === 0) return null
  const opacity = c.overlay_opacity ?? 0.45

  const count = Math.min(images.length, 5)

  // Full-viewport mosaic — aspect-ratio cells, no max-height cropping.
  // Grid: large left (spans 2 rows), 2 stacked right, 2 wide bottom.
  const imgStyle: React.CSSProperties = {
    width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top',
    display: 'block',
  }

  return (
    <div style={{ width: '100%', overflow: 'hidden', position: 'relative' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: count >= 3 ? '3fr 2fr' : '1fr',
        gridTemplateRows: count >= 3 ? '1fr 1fr' : 'auto',
        gap: '2px',
        height: '100vh',
        maxHeight: '900px',
      }}>
        {/* Main image — left side, spans full height */}
        {count > 0 && (
          <div style={{
            gridRow: count >= 3 ? '1 / -1' : undefined,
            overflow: 'hidden', background: theme.surface,
          }}>
            <img src={images[0].url} alt={images[0].alt || ''} loading="eager" style={imgStyle} />
          </div>
        )}
        {/* Right top */}
        {count >= 2 && (
          <div style={{ overflow: 'hidden', background: theme.surface }}>
            <img src={images[1].url} alt={images[1].alt || ''} loading="eager" style={imgStyle} />
          </div>
        )}
        {/* Right bottom */}
        {count >= 3 && (
          <div style={{
            overflow: 'hidden', background: theme.surface,
            ...(count >= 4 ? { display: 'grid', gridTemplateColumns: count >= 5 ? '1fr 1fr' : count >= 4 ? '1fr 1fr' : '1fr', gap: '2px' } : {}),
          }}>
            {count < 4 ? (
              <img src={images[2].url} alt={images[2].alt || ''} loading="lazy" style={imgStyle} />
            ) : (
              <>
                <div style={{ overflow: 'hidden' }}>
                  <img src={images[2].url} alt={images[2].alt || ''} loading="lazy" style={imgStyle} />
                </div>
                {count >= 4 && (
                  <div style={{ overflow: 'hidden' }}>
                    <img src={images[3].url} alt={images[3].alt || ''} loading="lazy" style={imgStyle} />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {/* Text overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 35%, transparent 55%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: 'clamp(1.25rem, 4vw, 2.5rem)',
        zIndex: 1,
      }}>
        {c.title && (
          <h1 style={{
            fontSize: 'clamp(1.75rem, 7vw, 3rem)', fontWeight: 300,
            fontFamily: theme.fontDisplay || 'inherit',
            margin: 0, lineHeight: 1.1, letterSpacing: '-0.03em', color: theme.fg,
          }}>
            <AnimatedText text={c.title} />
          </h1>
        )}
        {c.subtitle && (
          <p style={{
            fontSize: 'clamp(0.65rem, 1.8vw, 0.85rem)', color: `${theme.fg}BB`,
            margin: '0.5rem 0 0', letterSpacing: '0.12em', textTransform: 'uppercase',
            fontWeight: 400,
          }}>
            {c.subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

export function GallerySection({ section, theme }: { section: LandingSection; theme: SectionTheme }) {
  const { images } = section.content as { images?: Array<{ url: string; alt?: string }> }
  const columns = (section.config?.columns as number) || 3
  const layout = (section.config?.layout as string) || 'grid'
  if (!images || images.length === 0) return null

  if (layout === 'collage') {
    return (
      <div style={{ padding: '0.375rem', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>
          {images.map((img, i) => (
            <div key={i} style={{
              gridColumn: i === 0 ? '1 / -1' : undefined,
              aspectRatio: i === 0 ? '16/9' : (i % 3 === 0 ? '3/4' : '1'),
              overflow: 'hidden', background: theme.surface,
            }}>
              <img src={img.url} alt={img.alt || ''} loading={i < 2 ? 'eager' : 'lazy'}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '0.5rem' }}>
        {images.map((img, i) => (
          <div key={i} style={{ aspectRatio: '1', overflow: 'hidden', background: theme.surface }}>
            <img src={img.url} alt={img.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SocialLinksSection({ section, theme }: { section: LandingSection; theme: SectionTheme }) {
  const { links } = section.content as { links?: Array<{ platform: string; url: string }> }
  if (!links || links.length === 0) return null

  return (
    <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
      {links.map((link, i) => (
        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
          style={{ color: theme.muted, textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500, textTransform: 'capitalize', letterSpacing: '0.03em' }}>
          {link.platform}
        </a>
      ))}
    </div>
  )
}

export function DividerSection({ theme }: { theme: SectionTheme }) {
  return (
    <div style={{ padding: '1rem 1.5rem', maxWidth: 640, margin: '0 auto' }}>
      <hr style={{ border: 'none', borderTop: `1px solid ${theme.fg}0A`, margin: 0 }} />
    </div>
  )
}

function toEmbedUrl(url: string): string {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  return url
}
