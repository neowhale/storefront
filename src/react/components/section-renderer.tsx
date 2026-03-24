'use client'

import { useState, useEffect, useRef } from 'react'
import type { LandingSection } from '../../types.js'
import { HeroSection, TextSection, ImageSection, VideoSection, GallerySection, SocialLinksSection, DividerSection } from './sections/content-sections.js'
import { CTASection, StatsSection, ProductCardSection, COAViewerSection, COAModal } from './sections/interactive-sections.js'
import { LeadCaptureSection } from './sections/lead-capture-section.js'

// Re-export types for external consumers
export type { SectionTheme, ClickTrackingContext, SectionData } from './sections/shared.js'

/**
 * Routes a section to its renderer and tracks section visibility via IntersectionObserver.
 * Each section is wrapped in a div with data attributes for analytics targeting.
 */
export function SectionRenderer({
  section,
  data,
  theme,
  tracking,
  onEvent,
}: {
  section: LandingSection
  data: import('./sections/shared.js').SectionData
  theme: import('./sections/shared.js').SectionTheme
  tracking?: import('./sections/shared.js').ClickTrackingContext
  onEvent?: (event: string, data: Record<string, unknown>) => void
}) {
  const [showCOA, setShowCOA] = useState(false)

  const el = (() => {
    switch (section.type) {
      case 'hero': return <HeroSection section={section} theme={theme} tracking={tracking} onEvent={onEvent} />
      case 'text': return <TextSection section={section} theme={theme} />
      case 'image': return <ImageSection section={section} theme={theme} />
      case 'video': return <VideoSection section={section} theme={theme} />
      case 'gallery': return <GallerySection section={section} theme={theme} />
      case 'cta': return <CTASection section={section} theme={theme} tracking={tracking} onEvent={onEvent} />
      case 'stats': return <StatsSection section={section} theme={theme} />
      case 'product_card': return <ProductCardSection section={section} data={data} theme={theme} tracking={tracking} />
      case 'coa_viewer': return <COAViewerSection section={section} data={data} theme={theme} onShowCOA={() => setShowCOA(true)} tracking={tracking} />
      case 'social_links': return <SocialLinksSection section={section} theme={theme} />
      case 'lead_capture': return <LeadCaptureSection section={section} data={data} theme={theme} onEvent={onEvent} />
      case 'divider': return <DividerSection theme={theme} />
      default: return null
    }
  })()

  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onEvent?.('section_view', { section_id: section.id, section_type: section.type })
          obs.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [section.id, section.type, onEvent])

  return (
    <div ref={sectionRef} data-section-id={section.id} data-section-type={section.type}>
      {el}
      {showCOA && data?.coa && <COAModal coa={data.coa} theme={theme} onClose={() => setShowCOA(false)} />}
    </div>
  )
}
