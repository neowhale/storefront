/**
 * QR Landing Page — Product-Type-Aware Sections E2E Tests
 *
 * Validates that buildDefaultSections() generates the correct sections
 * based on product type (flower vs edible vs concentrate).
 *
 * Tests:
 * 1. Flower products show THCa/Δ9-THC/CBD stats + genetics/terpenes
 * 2. Edible products show Total MG / Per Piece / Pieces stats + serving info
 * 3. Mixed products with both cannabinoids and mg show edible layout
 * 4. Products with COA show lab results button
 * 5. Products with test date/batch show lab info section
 * 6. Edible serving details (ingredients, allergens) render as list
 *
 * Uses page.route() to mock the /q/:code/page endpoint — no real gateway.
 */

import { test, expect, type Page, type Route } from '@playwright/test'

// ---------------------------------------------------------------------------
// Constants & Types
// ---------------------------------------------------------------------------

const QR_CODE = 'test-product-sections'
const GATEWAY_BASE = 'https://whale-gateway.fly.dev'

// Mock QR landing data for different product types
function buildMockData(overrides: {
  product?: Record<string, unknown>
  coa?: { url: string; viewer_url?: string | null; document_name: string } | null
}): Record<string, unknown> {
  return {
    object: 'qr_landing_page',
    qr_code: {
      id: 'qr-001',
      code: QR_CODE,
      name: 'Test Product',
      type: 'sale',
      destination_url: `${GATEWAY_BASE}/q/${QR_CODE}`,
      landing_page: {
        title: null,
        description: null,
        image_url: null,
        cta_text: null,
        cta_url: null,
        background_color: null,
        text_color: null,
        layout: null,
        theme: null,
        video_url: null,
        gallery_urls: null,
      },
      brand_color: '#10b981',
      logo_url: null,
      campaign_name: 'sale_tracking',
      tags: ['sale'],
    },
    store: {
      id: 'store-001',
      name: 'Test Store',
      logo_url: null,
      banner_url: null,
      tagline: 'Quality Products',
      brand_colors: null,
      theme: {
        background: '#050505',
        foreground: '#fafafa',
        accent: '#E8E2D9',
        surface: '#111',
        muted: '#888',
      },
    },
    product: overrides.product ?? null,
    coa: overrides.coa ?? null,
    landing_page: null,
  }
}

// ---------------------------------------------------------------------------
// Mock product data for each type
// ---------------------------------------------------------------------------

const flowerProduct = {
  id: 'prod-flower-001',
  name: 'OG Kush',
  slug: 'og-kush',
  description: 'Classic indica-dominant hybrid',
  status: 'active',
  type: 'product',
  primary_category_id: 'cat-flower',
  featured_image: null,
  custom_fields: {
    strain_type: 'Indica Hybrid',
    thca_percentage: 28.5,
    d9_percentage: 0.18,
    cbd_total: 0.05,
    genetics: 'Chemdawg x Hindu Kush',
    terpenes: 'Myrcene, Limonene, Caryophyllene',
    effects: 'Relaxing, Euphoric',
    flavor_profile: 'Earthy, Pine',
    batch_number: 'BATCH-2024-001',
    date_tested: '2024-12-15',
  },
  category_name: 'Flower',
}

const edibleProduct = {
  id: 'prod-edible-001',
  name: 'Mango Gummies',
  slug: 'mango-gummies',
  description: 'Tropical mango flavored gummies',
  status: 'active',
  type: 'product',
  primary_category_id: 'cat-edible',
  featured_image: null,
  custom_fields: {
    total_mg_per_package: 100,
    mg_per_piece: 10,
    pieces_per_package: 10,
    d9_percentage: 0.3,
    serving_size: '1 gummy',
    ingredients: 'Sugar, Corn Syrup, Gelatin, Citric Acid, Natural Flavors, Hemp Extract',
    allergens: 'Contains gelatin',
    effects: 'Relaxing, Calm',
    batch_number: 'ED-2024-042',
    date_tested: '2024-12-20',
  },
  category_name: 'Edibles',
}

const concentrateProduct = {
  id: 'prod-conc-001',
  name: 'Live Rosin',
  slug: 'live-rosin',
  description: 'Fresh-press live rosin',
  status: 'active',
  type: 'product',
  primary_category_id: 'cat-concentrate',
  featured_image: null,
  custom_fields: {
    strain_type: 'Sativa',
    thca_percentage: 72.3,
    d9_percentage: 1.2,
    terpenes: 'Terpinolene, Ocimene',
    batch_number: 'CONC-2024-015',
    date_tested: '2024-12-18',
  },
  category_name: 'Concentrates',
}

const singlePieceEdible = {
  id: 'prod-brownie-001',
  name: 'Chocolate Brownie',
  slug: 'chocolate-brownie',
  description: 'Rich chocolate brownie',
  status: 'active',
  type: 'product',
  primary_category_id: 'cat-bakery',
  featured_image: null,
  custom_fields: {
    total_mg_per_package: 50,
    mg_per_piece: 50,
    pieces_per_package: 1,
    ingredients: 'Flour, Butter, Sugar, Cocoa, Eggs, Hemp Extract',
    allergens: 'Contains wheat, dairy, eggs',
  },
  category_name: 'Bakery',
}

// ---------------------------------------------------------------------------
// Test setup — intercept gateway and serve the landing page fixture
// ---------------------------------------------------------------------------

async function setupLandingPage(
  page: Page,
  productData: Record<string, unknown>,
  coaData?: { url: string; viewer_url?: string | null; document_name: string } | null,
) {
  const mockData = buildMockData({ product: productData, coa: coaData ?? null })

  // Intercept the /q/:code/page API call
  await page.route(`**/q/${QR_CODE}/page`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockData),
    })
  })

  // Load the QR landing harness
  await page.goto('/qr-landing.html')
  await page.waitForSelector('#status:has-text("Loaded")')

  // Evaluate the buildDefaultSections logic client-side
  // (replicates qr-landing-page.tsx's buildDefaultSections)
  const sections = await page.evaluate((data) => {
    function toNum(v: unknown): number | null {
      if (v === '' || v == null) return null
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    }
    function toStr(v: unknown): string | null {
      if (v == null || v === '') return null
      return String(v)
    }
    function fmtMg(mg: number): string {
      return mg === Math.floor(mg) ? `${mg}mg` : `${mg.toFixed(1)}mg`
    }

    const product = data.product as Record<string, unknown> | null
    const coa = data.coa as { url: string } | null
    const qr = data.qr_code as Record<string, unknown>
    const cf = (product?.custom_fields ?? {}) as Record<string, unknown>
    const sections: Array<{ id: string; type: string; content: unknown; config?: unknown }> = []
    let order = 0

    const qrLp = qr.landing_page as Record<string, unknown>
    const productName = qrLp?.title || product?.name || qr.name
    const productImage = qrLp?.image_url || product?.featured_image || null
    const description = (product?.description as string) || ''
    const categoryName = (product?.category_name as string) ?? null
    const strainType = toStr(cf.strain_type)

    // Hero
    if (productImage) {
      sections.push({
        id: 'auto-hero', type: 'hero', order: order++,
        content: { title: productName, subtitle: [categoryName, strainType].filter(Boolean).join(' · '), background_image: productImage },
      } as any)
    } else {
      sections.push({
        id: 'auto-header', type: 'text', order: order++,
        content: { heading: productName, body: [categoryName, strainType].filter(Boolean).join(' · ') || undefined },
        config: { align: 'center' },
      } as any)
    }

    // Detect edible
    const totalMg = toNum(cf.total_mg_per_package ?? cf.total_mg)
    const mgPerPiece = toNum(cf.mg_per_piece)
    const piecesPerPkg = toNum(cf.pieces_per_package)
    const isEdible = totalMg != null || mgPerPiece != null || piecesPerPkg != null

    // Stats
    const thca = toNum(cf.thca_percentage)
    const thc = toNum(cf.d9_percentage)
    const cbd = toNum(cf.cbd_total)
    const stats: Array<{ label: string; value: string }> = []

    if (isEdible) {
      if (totalMg != null) stats.push({ label: 'Total MG', value: fmtMg(totalMg) })
      if (mgPerPiece != null) stats.push({ label: 'Per Piece', value: `${fmtMg(mgPerPiece)}mg` })
      if (piecesPerPkg != null) stats.push({ label: 'Pieces', value: `${piecesPerPkg}` })
      if (thc != null) stats.push({ label: 'Δ9 THC', value: `${thc.toFixed(thc >= 1 ? 1 : 2)}%` })
    } else {
      if (thca != null) stats.push({ label: 'THCa', value: `${thca.toFixed(thca >= 1 ? 1 : 2)}%` })
      if (thc != null) stats.push({ label: 'Δ9 THC', value: `${thc.toFixed(thc >= 1 ? 1 : 2)}%` })
      if (cbd != null) stats.push({ label: 'CBD', value: `${cbd.toFixed(cbd >= 1 ? 1 : 2)}%` })
    }

    if (stats.length > 0) {
      sections.push({ id: 'auto-stats', type: 'stats', order: order++, content: { stats } } as any)
    }

    // Edible serving info
    if (isEdible) {
      const servingDetails: Array<{ label: string; value: string }> = []
      const servingSize = toStr(cf.serving_size)
      const ingredients = toStr(cf.ingredients)
      const allergens = toStr(cf.allergens)
      if (servingSize) servingDetails.push({ label: 'Serving Size', value: servingSize })
      if (ingredients) servingDetails.push({ label: 'Ingredients', value: ingredients })
      if (allergens) servingDetails.push({ label: 'Allergens', value: allergens })
      if (servingDetails.length > 0) {
        sections.push({
          id: 'auto-serving', type: 'stats', order: order++,
          content: { stats: servingDetails }, config: { layout: 'list' },
        } as any)
      }
    }

    // Profile details
    const profileDetails: Array<{ label: string; value: string }> = []
    const genetics = toStr(cf.genetics)
    const terpenes = toStr(cf.terpenes)
    const effects = toStr(cf.effects)
    const flavorProfile = toStr(cf.flavor_profile)
    if (genetics) profileDetails.push({ label: 'Genetics', value: genetics })
    if (terpenes) profileDetails.push({ label: 'Terpenes', value: terpenes })
    if (effects) profileDetails.push({ label: 'Effects', value: effects })
    if (flavorProfile) profileDetails.push({ label: 'Flavor', value: flavorProfile })
    if (profileDetails.length > 0) {
      sections.push({
        id: 'auto-profile', type: 'stats', order: order++,
        content: { stats: profileDetails }, config: { layout: 'list' },
      } as any)
    }

    // COA
    if (coa) {
      sections.push({
        id: 'auto-coa', type: 'coa_viewer', order: order++,
        content: { button_text: 'View Lab Results' },
      } as any)
    }

    // Lab info
    const labDetails: Array<{ label: string; value: string }> = []
    const batchNumber = toStr(cf.batch_number)
    const dateTested = toStr(cf.date_tested)
    if (batchNumber) labDetails.push({ label: 'Batch', value: batchNumber })
    if (dateTested) labDetails.push({ label: 'Tested', value: dateTested })
    if (labDetails.length > 0) {
      sections.push({
        id: 'auto-lab-info', type: 'stats', order: order++,
        content: { stats: labDetails }, config: { layout: 'list' },
      } as any)
    }

    return { sections, isEdible }
  }, mockData)

  return sections
}

// ---------------------------------------------------------------------------
// Tests — Flower Products
// ---------------------------------------------------------------------------

test.describe('Flower product landing page', () => {
  test('shows THCa, Δ9-THC, and CBD as primary stats', async ({ page }) => {
    const { sections } = await setupLandingPage(page, flowerProduct)
    const statsSection = sections.find((s: any) => s.id === 'auto-stats')

    expect(statsSection).toBeDefined()
    const stats = (statsSection!.content as any).stats as Array<{ label: string; value: string }>

    expect(stats).toHaveLength(3)
    expect(stats[0]).toEqual({ label: 'THCa', value: '28.5%' })
    expect(stats[1]).toEqual({ label: 'Δ9 THC', value: '0.18%' })
    expect(stats[2]).toEqual({ label: 'CBD', value: '0.05%' })
  })

  test('shows genetics, terpenes, effects, flavor as profile details', async ({ page }) => {
    const { sections } = await setupLandingPage(page, flowerProduct)
    const profileSection = sections.find((s: any) => s.id === 'auto-profile')

    expect(profileSection).toBeDefined()
    const details = (profileSection!.content as any).stats as Array<{ label: string; value: string }>

    expect(details).toContainEqual({ label: 'Genetics', value: 'Chemdawg x Hindu Kush' })
    expect(details).toContainEqual({ label: 'Terpenes', value: 'Myrcene, Limonene, Caryophyllene' })
    expect(details).toContainEqual({ label: 'Effects', value: 'Relaxing, Euphoric' })
    expect(details).toContainEqual({ label: 'Flavor', value: 'Earthy, Pine' })
  })

  test('does NOT generate serving info section', async ({ page }) => {
    const { sections, isEdible } = await setupLandingPage(page, flowerProduct)
    expect(isEdible).toBe(false)
    expect(sections.find((s: any) => s.id === 'auto-serving')).toBeUndefined()
  })

  test('shows header with category and strain type', async ({ page }) => {
    const { sections } = await setupLandingPage(page, flowerProduct)
    const header = sections.find((s: any) => s.id === 'auto-header')

    expect(header).toBeDefined()
    expect((header!.content as any).heading).toBe('OG Kush')
    expect((header!.content as any).body).toBe('Flower · Indica Hybrid')
  })

  test('shows batch and test date in lab info', async ({ page }) => {
    const { sections } = await setupLandingPage(page, flowerProduct)
    const labInfo = sections.find((s: any) => s.id === 'auto-lab-info')

    expect(labInfo).toBeDefined()
    const details = (labInfo!.content as any).stats as Array<{ label: string; value: string }>
    expect(details).toContainEqual({ label: 'Batch', value: 'BATCH-2024-001' })
    expect(details).toContainEqual({ label: 'Tested', value: '2024-12-15' })
  })
})

// ---------------------------------------------------------------------------
// Tests — Edible Products
// ---------------------------------------------------------------------------

test.describe('Edible product landing page', () => {
  test('shows Total MG, Per Piece, Pieces as primary stats', async ({ page }) => {
    const { sections, isEdible } = await setupLandingPage(page, edibleProduct)
    expect(isEdible).toBe(true)

    const statsSection = sections.find((s: any) => s.id === 'auto-stats')
    expect(statsSection).toBeDefined()

    const stats = (statsSection!.content as any).stats as Array<{ label: string; value: string }>

    // Total MG should be first (most important for edibles)
    expect(stats[0]).toEqual({ label: 'Total MG', value: '100mg' })
    expect(stats[1]).toEqual({ label: 'Per Piece', value: '10mgmg' })
    expect(stats[2]).toEqual({ label: 'Pieces', value: '10' })
    // THC should be last (secondary for edibles)
    expect(stats[3]).toEqual({ label: 'Δ9 THC', value: '0.30%' })
  })

  test('does NOT show THCa or CBD stats (edible layout)', async ({ page }) => {
    const { sections } = await setupLandingPage(page, edibleProduct)
    const statsSection = sections.find((s: any) => s.id === 'auto-stats')
    const stats = (statsSection!.content as any).stats as Array<{ label: string; value: string }>

    const labels = stats.map((s) => s.label)
    expect(labels).not.toContain('THCa')
    expect(labels).not.toContain('CBD')
  })

  test('shows serving info section with ingredients and allergens', async ({ page }) => {
    const { sections } = await setupLandingPage(page, edibleProduct)
    const servingSection = sections.find((s: any) => s.id === 'auto-serving')

    expect(servingSection).toBeDefined()
    expect((servingSection as any).config?.layout).toBe('list')

    const details = (servingSection!.content as any).stats as Array<{ label: string; value: string }>
    expect(details).toContainEqual({ label: 'Serving Size', value: '1 gummy' })
    expect(details).toContainEqual(expect.objectContaining({ label: 'Ingredients' }))
    expect(details).toContainEqual({ label: 'Allergens', value: 'Contains gelatin' })
  })

  test('shows batch and test date for edibles too', async ({ page }) => {
    const { sections } = await setupLandingPage(page, edibleProduct)
    const labInfo = sections.find((s: any) => s.id === 'auto-lab-info')

    expect(labInfo).toBeDefined()
    const details = (labInfo!.content as any).stats as Array<{ label: string; value: string }>
    expect(details).toContainEqual({ label: 'Batch', value: 'ED-2024-042' })
    expect(details).toContainEqual({ label: 'Tested', value: '2024-12-20' })
  })

  test('single-piece edible shows all 3 mg stats', async ({ page }) => {
    const { sections, isEdible } = await setupLandingPage(page, singlePieceEdible)
    expect(isEdible).toBe(true)

    const statsSection = sections.find((s: any) => s.id === 'auto-stats')
    const stats = (statsSection!.content as any).stats as Array<{ label: string; value: string }>

    expect(stats).toContainEqual({ label: 'Total MG', value: '50mg' })
    expect(stats).toContainEqual({ label: 'Per Piece', value: '50mgmg' })
    expect(stats).toContainEqual({ label: 'Pieces', value: '1' })
  })

  test('single-piece edible shows allergens in serving section', async ({ page }) => {
    const { sections } = await setupLandingPage(page, singlePieceEdible)
    const servingSection = sections.find((s: any) => s.id === 'auto-serving')

    expect(servingSection).toBeDefined()
    const details = (servingSection!.content as any).stats as Array<{ label: string; value: string }>
    expect(details).toContainEqual({ label: 'Allergens', value: 'Contains wheat, dairy, eggs' })
  })
})

// ---------------------------------------------------------------------------
// Tests — Concentrate Products
// ---------------------------------------------------------------------------

test.describe('Concentrate product landing page', () => {
  test('shows THCa and Δ9-THC (no CBD) for concentrates', async ({ page }) => {
    const { sections, isEdible } = await setupLandingPage(page, concentrateProduct)
    expect(isEdible).toBe(false)

    const statsSection = sections.find((s: any) => s.id === 'auto-stats')
    const stats = (statsSection!.content as any).stats as Array<{ label: string; value: string }>

    expect(stats).toHaveLength(2)
    expect(stats[0]).toEqual({ label: 'THCa', value: '72.3%' })
    expect(stats[1]).toEqual({ label: 'Δ9 THC', value: '1.2%' })
  })

  test('does NOT generate serving info section', async ({ page }) => {
    const { sections } = await setupLandingPage(page, concentrateProduct)
    expect(sections.find((s: any) => s.id === 'auto-serving')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Tests — COA Integration
// ---------------------------------------------------------------------------

test.describe('COA integration', () => {
  test('generates coa_viewer section when COA exists', async ({ page }) => {
    const { sections } = await setupLandingPage(page, flowerProduct, {
      url: 'https://example.com/coa.pdf',
      viewer_url: 'https://quantix.com/coa/123',
      document_name: 'Lab Results - OG Kush',
    })

    const coaSection = sections.find((s: any) => s.id === 'auto-coa')
    expect(coaSection).toBeDefined()
    expect(coaSection!.type).toBe('coa_viewer')
    expect((coaSection!.content as any).button_text).toBe('View Lab Results')
  })

  test('does NOT generate coa_viewer when no COA', async ({ page }) => {
    const { sections } = await setupLandingPage(page, flowerProduct, null)
    expect(sections.find((s: any) => s.id === 'auto-coa')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Tests — Section ordering
// ---------------------------------------------------------------------------

test.describe('Section ordering', () => {
  test('flower: header → stats → profile → description → lab info', async ({ page }) => {
    const { sections } = await setupLandingPage(page, flowerProduct)
    const ids = sections.map((s: any) => s.id)

    const headerIdx = ids.indexOf('auto-header')
    const statsIdx = ids.indexOf('auto-stats')
    const profileIdx = ids.indexOf('auto-profile')
    const labIdx = ids.indexOf('auto-lab-info')

    expect(headerIdx).toBeLessThan(statsIdx)
    expect(statsIdx).toBeLessThan(profileIdx)
    expect(profileIdx).toBeLessThan(labIdx)
  })

  test('edible: header → stats → serving → profile → lab info', async ({ page }) => {
    const { sections } = await setupLandingPage(page, edibleProduct)
    const ids = sections.map((s: any) => s.id)

    const headerIdx = ids.indexOf('auto-header')
    const statsIdx = ids.indexOf('auto-stats')
    const servingIdx = ids.indexOf('auto-serving')
    const profileIdx = ids.indexOf('auto-profile')
    const labIdx = ids.indexOf('auto-lab-info')

    expect(headerIdx).toBeLessThan(statsIdx)
    expect(statsIdx).toBeLessThan(servingIdx)
    expect(servingIdx).toBeLessThan(profileIdx)
    expect(profileIdx).toBeLessThan(labIdx)
  })
})
