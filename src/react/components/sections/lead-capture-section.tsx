'use client'

import { useState } from 'react'
import type { LandingSection } from '../../../types.js'
import type { SectionTheme, SectionData } from './shared.js'

export function LeadCaptureSection({ section, data, theme, onEvent }: {
  section: LandingSection; data: SectionData; theme: SectionTheme
  onEvent?: (event: string, data: Record<string, unknown>) => void
}) {
  const c = section.content as {
    heading?: string; subtitle?: string; button_text?: string
    success_heading?: string; success_message?: string; coupon_code?: string
    gateway_url?: string; store_id?: string; source?: string; landing_page_slug?: string
    tags?: string[]; show_newsletter_opt_in?: boolean
    newsletter_label?: string; newsletter_tag?: string; trust_line?: string
  }

  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [newsletterOptIn, setNewsletterOptIn] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const gatewayUrl = c.gateway_url || data.gatewayUrl || 'https://whale-gateway.fly.dev'
  const storeId = c.store_id || data.store?.id
  const slug = c.landing_page_slug || (data.landing_page as { slug?: string } | null)?.slug

  const heading = c.heading || 'get 10% off your first visit.'
  const subtitle = c.subtitle || 'drop your email and we will send you the code.'
  const buttonText = c.button_text || 'Claim My Discount'
  const successHeading = c.success_heading || 'You\u2019re in!'
  const successMessage = c.success_message || 'Check your inbox for the discount code.'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !storeId) return

    setStatus('loading')
    setErrorMsg('')

    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null

    try {
      const res = await fetch(`${gatewayUrl}/v1/stores/${storeId}/storefront/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          first_name: firstName || undefined,
          source: c.source || 'landing_page',
          landing_page_slug: slug || undefined,
          newsletter_opt_in: newsletterOptIn || undefined,
          tags: (() => {
            const t = [...(c.tags || [])]
            if (newsletterOptIn) t.push(c.newsletter_tag || 'newsletter-subscriber')
            return t.length > 0 ? t : undefined
          })(),
          visitor_id: data.analyticsContext?.visitorId || undefined,
          session_id: data.analyticsContext?.sessionId || undefined,
          utm_source: urlParams?.get('utm_source') || undefined,
          utm_medium: urlParams?.get('utm_medium') || undefined,
          utm_campaign: urlParams?.get('utm_campaign') || undefined,
          utm_content: urlParams?.get('utm_content') || undefined,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: { message?: string } })?.error?.message || 'Something went wrong. Please try again.')
      }

      setStatus('success')
      onEvent?.('lead', { email, first_name: firstName || undefined, source: c.source || 'landing_page', landing_page_slug: slug || undefined })
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  const inputStyle: React.CSSProperties = {
    flex: 1, minWidth: 0, padding: '0.875rem 1rem', background: theme.surface,
    border: `1px solid ${theme.fg}15`, color: theme.fg, fontSize: '0.95rem',
    fontWeight: 300, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  }

  if (status === 'success') return <SuccessState theme={theme} heading={successHeading} message={successMessage} couponCode={c.coupon_code} />

  return (
    <div style={{ padding: '3.5rem 1.5rem', maxWidth: 560, margin: '0 auto' }}>
      <style>{`@keyframes lc-spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ background: theme.surface, border: `1px solid ${theme.fg}12`, padding: 'clamp(2rem, 6vw, 3rem)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(1.5rem, 4vw, 2rem)' }}>
          <h2 style={{
            fontSize: 'clamp(1.5rem, 5vw, 2.25rem)', fontWeight: 300,
            fontFamily: theme.fontDisplay || 'inherit', margin: '0 0 0.5rem',
            lineHeight: 1.15, letterSpacing: '-0.02em', color: theme.fg,
          }}>
            {heading}
          </h2>
          <p style={{
            fontSize: '0.85rem', color: theme.accent, margin: 0,
            lineHeight: 1.6, textTransform: 'uppercase', letterSpacing: '0.15em',
          }}>
            {subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input type="text" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} />
            <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
          </div>

          {c.show_newsletter_opt_in !== false && (
            <label style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
              fontSize: '0.8rem', color: `${theme.fg}90`, fontWeight: 300, lineHeight: 1.4,
            }}>
              <input type="checkbox" checked={newsletterOptIn} onChange={(e) => setNewsletterOptIn(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: theme.accent, cursor: 'pointer', flexShrink: 0 }} />
              {c.newsletter_label || 'Also sign me up for the newsletter \u2014 new drops, deals, and company news.'}
            </label>
          )}

          {status === 'error' && errorMsg && (
            <p style={{ fontSize: '0.8rem', color: '#e55', margin: 0, fontWeight: 400 }}>{errorMsg}</p>
          )}

          <button type="submit" disabled={status === 'loading'} style={{
            width: '100%', padding: '0.875rem', background: theme.fg, color: theme.bg,
            border: 'none', fontSize: '0.85rem', fontWeight: 500,
            cursor: status === 'loading' ? 'wait' : 'pointer',
            letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            opacity: status === 'loading' ? 0.7 : 1, transition: 'opacity 0.2s',
          }}>
            {status === 'loading' && (
              <span style={{
                display: 'inline-block', width: 16, height: 16,
                border: `2px solid ${theme.bg}40`, borderTopColor: theme.bg,
                borderRadius: '50%', animation: 'lc-spin 0.8s linear infinite',
              }} />
            )}
            {buttonText}
          </button>
        </form>
      </div>
    </div>
  )
}

function SuccessState({ theme, heading, message, couponCode }: {
  theme: SectionTheme; heading: string; message: string; couponCode?: string
}) {
  return (
    <div style={{ padding: '3.5rem 1.5rem', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ background: theme.surface, border: `1px solid ${theme.fg}12`, padding: 'clamp(2rem, 6vw, 3rem)', textAlign: 'center' }}>
        <h2 style={{
          fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 300,
          fontFamily: theme.fontDisplay || 'inherit', margin: '0 0 0.75rem',
          lineHeight: 1.2, letterSpacing: '-0.02em', color: theme.fg,
        }}>
          {heading}
        </h2>
        <p style={{ fontSize: '0.9rem', color: `${theme.fg}99`, margin: '0 0 1.5rem', lineHeight: 1.6, fontWeight: 300 }}>
          {message}
        </p>
        {couponCode && (
          <div style={{
            display: 'inline-block', padding: '0.75rem 2rem', background: `${theme.fg}08`,
            border: `1px dashed ${theme.fg}30`, fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
            fontWeight: 500, fontFamily: 'monospace', letterSpacing: '0.12em', color: theme.accent,
          }}>
            {couponCode}
          </div>
        )}
      </div>
    </div>
  )
}
