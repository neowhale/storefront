'use client'

import { useState, useEffect, useRef } from 'react'
import type { LandingSection } from '../../../types.js'
import { AnimatedText, type SectionTheme } from './shared.js'

// ─── Testimonials ────────────────────────────────────────────────────────────

export function TestimonialsSection({ section, theme }: {
  section: LandingSection; theme: SectionTheme
}) {
  const c = section.content as {
    heading?: string; subtitle?: string
    rating?: number; review_count?: number
    reviews?: Array<{ name: string; text: string; rating?: number; location?: string }>
  }
  const layout = (section.config?.layout as string) || 'grid'
  const reviews = c.reviews || []
  if (reviews.length === 0) return null

  const overallRating = c.rating ?? 5
  const reviewCount = c.review_count ?? reviews.length

  return (
    <div style={{ padding: '3rem 1.5rem', maxWidth: 640, margin: '0 auto' }}>
      {/* Aggregate rating */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        {c.heading && (
          <h2 style={{
            fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', fontWeight: 300,
            fontFamily: theme.fontDisplay || 'inherit', margin: '0 0 0.75rem',
            lineHeight: 1.2, letterSpacing: '-0.02em', color: theme.fg,
          }}>
            <AnimatedText text={c.heading} />
          </h2>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Stars rating={overallRating} color={theme.accent} size={18} />
          <span style={{ fontSize: '1.1rem', fontWeight: 500, color: theme.fg }}>
            <AnimatedText text={overallRating.toFixed(1)} />
          </span>
        </div>
        {c.subtitle ? (
          <p style={{ fontSize: '0.8rem', color: theme.muted, margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {c.subtitle}
          </p>
        ) : (
          <p style={{ fontSize: '0.8rem', color: theme.muted, margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            from <AnimatedText text={String(reviewCount)} /> reviews
          </p>
        )}
      </div>

      {/* Review cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: layout === 'list' ? '1fr' : `repeat(${Math.min(reviews.length, 2)}, 1fr)`,
        gap: '0.75rem',
      }}>
        {reviews.map((review, i) => (
          <div key={i} style={{
            background: theme.surface, border: `1px solid ${theme.fg}08`,
            padding: '1.25rem',
          }}>
            <Stars rating={review.rating ?? 5} color={theme.accent} size={14} />
            <p style={{
              fontSize: '0.88rem', color: `${theme.fg}CC`, margin: '0.75rem 0',
              lineHeight: 1.6, fontWeight: 300, fontStyle: 'italic',
            }}>
              "{review.text}"
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 500, color: theme.fg }}>
                {review.name}
              </span>
              {review.location && (
                <span style={{ fontSize: '0.7rem', color: theme.muted }}>
                  {review.location}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stars({ rating, color, size }: { rating: number; color: string; size: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: '1px' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 20 20" fill={n <= Math.round(rating) ? color : 'none'}
          stroke={color} strokeWidth={1.5}>
          <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.26 5.06 16.7l.94-5.5-4-3.9 5.53-.8z" />
        </svg>
      ))}
    </span>
  )
}

// ─── Value Stack ──────────────────────────────────────────────────────────────

export function ValueStackSection({ section, theme }: {
  section: LandingSection; theme: SectionTheme
}) {
  const c = section.content as {
    heading?: string; subtitle?: string
    items?: Array<{ text: string; value?: string }>
    total_value?: string; offer_label?: string
  }
  const items = c.items || []
  if (items.length === 0) return null

  return (
    <div style={{ padding: '3rem 1.5rem', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ background: theme.surface, border: `1px solid ${theme.fg}08`, padding: 'clamp(1.5rem, 5vw, 2.5rem)' }}>
        {c.heading && (
          <h2 style={{
            fontSize: 'clamp(1.25rem, 4vw, 1.5rem)', fontWeight: 300,
            fontFamily: theme.fontDisplay || 'inherit', margin: '0 0 0.25rem',
            lineHeight: 1.2, letterSpacing: '-0.02em', color: theme.fg, textAlign: 'center',
          }}>
            {c.heading}
          </h2>
        )}
        {c.subtitle && (
          <p style={{
            fontSize: '0.8rem', color: theme.accent, margin: '0 0 1.5rem',
            letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center',
          }}>
            {c.subtitle}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
              padding: '0.5rem 0',
              borderBottom: i < items.length - 1 ? `1px solid ${theme.fg}08` : undefined,
            }}>
              <span style={{ color: theme.accent, fontSize: '1rem', lineHeight: 1, flexShrink: 0, marginTop: '0.1rem' }}>
                &#10003;
              </span>
              <span style={{ flex: 1, fontSize: '0.9rem', color: `${theme.fg}CC`, fontWeight: 300, lineHeight: 1.5 }}>
                {item.text}
              </span>
              {item.value && (
                <span style={{
                  fontSize: '0.8rem', color: theme.muted, fontWeight: 400,
                  textDecoration: 'line-through', flexShrink: 0,
                }}>
                  {item.value}
                </span>
              )}
            </div>
          ))}
        </div>

        {(c.total_value || c.offer_label) && (
          <div style={{
            marginTop: '1.5rem', padding: '1rem', background: `${theme.accent}0A`,
            border: `1px dashed ${theme.accent}30`, textAlign: 'center',
          }}>
            {c.total_value && (
              <div style={{ fontSize: '0.75rem', color: theme.muted, marginBottom: '0.25rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Total value: <span style={{ textDecoration: 'line-through' }}>{c.total_value}</span>
              </div>
            )}
            <div style={{
              fontSize: 'clamp(1.25rem, 4vw, 1.5rem)', fontWeight: 500,
              fontFamily: theme.fontDisplay || 'inherit', color: theme.accent,
            }}>
              {c.offer_label || 'Free'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── FAQ / Objection Handling ─────────────────────────────────────────────────

export function FAQSection({ section, theme }: {
  section: LandingSection; theme: SectionTheme
}) {
  const c = section.content as {
    heading?: string
    items?: Array<{ question: string; answer: string }>
  }
  const items = c.items || []
  if (items.length === 0) return null

  return (
    <div style={{ padding: '2.5rem 1.5rem', maxWidth: 580, margin: '0 auto' }}>
      {c.heading && (
        <h2 style={{
          fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
          letterSpacing: '0.25em', color: `${theme.fg}40`, margin: '0 0 1.25rem',
          textAlign: 'center',
        }}>
          {c.heading}
        </h2>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {items.map((item, i) => (
          <FAQItem key={i} question={item.question} answer={item.answer} theme={theme} />
        ))}
      </div>
    </div>
  )
}

function FAQItem({ question, answer, theme }: {
  question: string; answer: string; theme: SectionTheme
}) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ borderBottom: `1px solid ${theme.fg}0A` }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1rem 0', background: 'none', border: 'none', cursor: 'pointer',
          color: theme.fg, fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '0.9rem', fontWeight: 400, lineHeight: 1.4 }}>
          {question}
        </span>
        <span style={{
          fontSize: '1.25rem', fontWeight: 200, color: theme.muted,
          transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'none',
          flexShrink: 0, marginLeft: '1rem',
        }}>
          +
        </span>
      </button>
      <div style={{
        maxHeight: open ? '20rem' : 0, overflow: 'hidden',
        transition: 'max-height 0.3s ease',
      }}>
        <p style={{
          fontSize: '0.85rem', color: `${theme.fg}88`, lineHeight: 1.7,
          fontWeight: 300, margin: 0, padding: '0 0 1rem',
        }}>
          {answer}
        </p>
      </div>
    </div>
  )
}

// ─── Trust Badges ────────────────────────────────────────────────────────────

export function TrustBadgesSection({ section, theme }: {
  section: LandingSection; theme: SectionTheme
}) {
  const c = section.content as {
    badges?: Array<{ icon?: string; label: string }>
  }
  const badges = c.badges || []
  if (badges.length === 0) return null

  return (
    <div style={{
      padding: '1.25rem 1.5rem',
      borderTop: `1px solid ${theme.fg}08`, borderBottom: `1px solid ${theme.fg}08`,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: 'clamp(1rem, 4vw, 2.5rem)', flexWrap: 'wrap',
      }}>
        {badges.map((badge, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
          }}>
            {badge.icon && (
              <span style={{ fontSize: '0.9rem' }}>{badge.icon}</span>
            )}
            <span style={{
              fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase',
              letterSpacing: '0.15em', color: theme.muted,
            }}>
              {badge.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Countdown Timer ─────────────────────────────────────────────────────────

export function CountdownSection({ section, theme }: {
  section: LandingSection; theme: SectionTheme
}) {
  const c = section.content as {
    heading?: string; end_date: string
    expired_text?: string
  }
  const endDate = c.end_date ? new Date(c.end_date) : null
  const [remaining, setRemaining] = useState<{ d: number; h: number; m: number; s: number } | null>(null)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (!endDate) return
    function tick() {
      const diff = endDate!.getTime() - Date.now()
      if (diff <= 0) { setExpired(true); return }
      setRemaining({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endDate?.getTime()])

  if (!endDate) return null
  if (expired) {
    return c.expired_text ? (
      <div style={{ padding: '1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.85rem', color: theme.muted, margin: 0 }}>{c.expired_text}</p>
      </div>
    ) : null
  }
  if (!remaining) return null

  const units = [
    { label: 'Days', value: remaining.d },
    { label: 'Hours', value: remaining.h },
    { label: 'Min', value: remaining.m },
    { label: 'Sec', value: remaining.s },
  ]

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      {c.heading && (
        <p style={{
          fontSize: '0.8rem', color: theme.accent, margin: '0 0 1rem',
          letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>
          {c.heading}
        </p>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
        {units.map((u) => (
          <div key={u.label} style={{
            minWidth: 'clamp(3.5rem, 12vw, 4.5rem)', padding: '0.75rem 0.25rem',
            background: theme.surface, border: `1px solid ${theme.fg}08`,
          }}>
            <div style={{
              fontFamily: theme.fontDisplay || 'inherit',
              fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 300, lineHeight: 1, color: theme.fg,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {String(u.value).padStart(2, '0')}
            </div>
            <div style={{
              fontSize: '0.6rem', fontWeight: 500, textTransform: 'uppercase',
              letterSpacing: '0.2em', color: theme.muted, marginTop: '0.375rem',
            }}>
              {u.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
