'use client'

import { useState } from 'react'
import type { LandingSection } from '../../../types.js'
import { AnimatedText, type SectionTheme, type ClickTrackingContext, type SectionData, trackClick } from './shared.js'

export function CTASection({ section, theme, tracking, onEvent }: {
  section: LandingSection; theme: SectionTheme; tracking?: ClickTrackingContext
  onEvent?: (event: string, data: Record<string, unknown>) => void
}) {
  const { title, subtitle, buttons } = section.content as {
    title?: string; subtitle?: string
    buttons?: Array<{ text: string; url: string; style?: 'primary' | 'outline' }>
  }
  if (!buttons || buttons.length === 0) return null

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {title && (
        <h2 style={{
          fontSize: 'clamp(1.25rem, 4vw, 1.5rem)', fontWeight: 300,
          fontFamily: theme.fontDisplay || 'inherit', margin: '0 0 0.25rem',
          lineHeight: 1.2, letterSpacing: '-0.02em', color: theme.fg, textAlign: 'center',
        }}>
          {title}
        </h2>
      )}
      {subtitle && (
        <p style={{
          fontSize: '0.8rem', color: theme.accent, margin: '0 0 0.75rem',
          lineHeight: 1.6, textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'center',
        }}>
          {subtitle}
        </p>
      )}
      {buttons.map((btn, i) => {
        const isPrimary = btn.style !== 'outline'
        return (
          <a key={i} href={btn.url}
            onClick={() => {
              trackClick(tracking, btn.text, btn.url, i)
              onEvent?.('cta_click', { label: btn.text, url: btn.url })
            }}
            style={{
              display: 'block', width: '100%', padding: '0.875rem',
              background: isPrimary ? theme.fg : 'transparent',
              color: isPrimary ? theme.bg : theme.fg,
              border: isPrimary ? 'none' : `1px solid ${theme.fg}20`,
              fontSize: '0.85rem', fontWeight: 500, textAlign: 'center',
              textDecoration: 'none', boxSizing: 'border-box',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}
          >
            {btn.text}
          </a>
        )
      })}
    </div>
  )
}

export function StatsSection({ section, theme }: { section: LandingSection; theme: SectionTheme }) {
  const { stats } = section.content as { stats?: Array<{ label: string; value: string }> }
  const layout = section.config?.layout as string | undefined
  if (!stats || stats.length === 0) return null

  if (layout === 'list') {
    return (
      <div style={{ padding: '1.5rem', maxWidth: 640, margin: '0 auto' }}>
        {stats.map((stat, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0.625rem 0' }}>
              <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.15em', color: `${theme.fg}66` }}>
                {stat.label}
              </span>
              <span style={{ fontSize: 14, fontWeight: 300, color: `${theme.fg}CC` }}>
                <AnimatedText text={stat.value} />
              </span>
            </div>
            {i < stats.length - 1 && <hr style={{ border: 'none', borderTop: `1px solid ${theme.fg}0A`, margin: 0 }} />}
          </div>
        ))}
      </div>
    )
  }

  const columns = Math.min(stats.length, 4)
  return (
    <div style={{ padding: '1.5rem', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, border: `1px solid ${theme.fg}0F` }}>
        {stats.map((stat, i) => (
          <div key={i} style={{
            padding: '1.25rem 0.5rem', textAlign: 'center',
            borderRight: i < stats.length - 1 ? `1px solid ${theme.fg}0F` : undefined,
          }}>
            <div style={{
              fontFamily: theme.fontDisplay || 'inherit', fontSize: 'clamp(1.5rem, 5vw, 2rem)',
              fontWeight: 300, lineHeight: 1, color: theme.fg,
            }}>
              <AnimatedText text={stat.value} />
            </div>
            <div style={{
              fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
              letterSpacing: '0.25em', color: theme.accent, marginTop: '0.5rem',
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProductCardSection({ section, data, theme, tracking }: {
  section: LandingSection; data: SectionData; theme: SectionTheme; tracking?: ClickTrackingContext
}) {
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
          {description && <p style={{ fontSize: '0.9rem', color: theme.muted, margin: '0 0 1rem', lineHeight: 1.5 }}>{description}</p>}
          {url && (
            <a href={url} onClick={() => trackClick(tracking, 'View Product', url!)}
              style={{
                display: 'block', width: '100%', padding: '0.75rem', background: theme.fg,
                color: theme.bg, textAlign: 'center', textDecoration: 'none', fontSize: '0.85rem',
                fontWeight: 500, boxSizing: 'border-box', letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
              View Product
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export function COAViewerSection({ section, data, theme, onShowCOA, tracking }: {
  section: LandingSection; data: SectionData; theme: SectionTheme
  onShowCOA: () => void; tracking?: ClickTrackingContext
}) {
  const coa = data?.coa
  const c = section.content as { button_text?: string }
  if (!coa) return null

  const buttonStyle: React.CSSProperties = {
    width: '100%', padding: '0.875rem', background: theme.accent, color: theme.bg,
    border: 'none', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer',
    letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center',
    textDecoration: 'none', display: 'block', boxSizing: 'border-box',
  }
  const buttonLabel = c.button_text || 'View Lab Results'

  if (coa.viewer_url) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: 480, margin: '0 auto' }}>
        <a href={coa.viewer_url} target="_blank" rel="noopener noreferrer"
          onClick={() => trackClick(tracking, buttonLabel, coa.viewer_url!)} style={buttonStyle}>
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

export function COAModal({ coa, theme, onClose }: {
  coa: { url: string; document_name: string }; theme: SectionTheme; onClose: () => void
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.75rem 1rem', borderBottom: `1px solid ${theme.fg}10`,
      }}>
        <span style={{ color: '#fff', fontWeight: 500, fontSize: '0.85rem' }}>
          {coa.document_name || 'Lab Results'}
        </span>
        <button onClick={onClose} style={{
          background: `${theme.fg}10`, border: 'none', color: '#fff',
          fontSize: '0.85rem', cursor: 'pointer', padding: '0.375rem 0.75rem',
        }}>
          Close
        </button>
      </div>
      <iframe src={coa.url} style={{ flex: 1, border: 'none', background: '#fff' }} title="Lab Results" />
    </div>
  )
}
