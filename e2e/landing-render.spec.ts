import { test, expect } from '@playwright/test'

const GATEWAY_URL = 'https://whale-gateway.fly.dev'

test('spring-2026 landing page renders all 7 sections with content', async ({ page }) => {
  await page.goto(`${GATEWAY_URL}/l/spring-2026`, { waitUntil: 'networkidle' })

  // No error states
  await expect(page.locator('text=Page Not Found')).not.toBeVisible()
  await expect(page.locator('text=Something Went Wrong')).not.toBeVisible()

  // 1. Hero section — title with animated number + CTA
  const hero = page.locator('[data-section-type="hero"]')
  await expect(hero).toBeVisible()
  await expect(hero.locator('h1')).toBeVisible()
  console.log('Hero title:', await hero.locator('h1').textContent())
  await expect(hero.locator('a')).toBeVisible() // hero CTA

  // 2. Stats section — social proof (now before lead capture)
  const stats = page.locator('[data-section-type="stats"]')
  await expect(stats).toBeVisible()
  await stats.scrollIntoViewIfNeeded()
  await page.waitForTimeout(2000)
  const statsText = (await stats.innerText()).toUpperCase()
  expect(statsText).toContain('LOCATIONS')
  expect(statsText).toContain('GOOGLE RATING')

  // 3. Text section — "what to expect" brand copy
  const text = page.locator('[data-section-type="text"]')
  await expect(text).toBeVisible()
  await expect(text.locator('text=what to expect')).toBeVisible()

  // 4. Lead capture section — email form
  const leadCapture = page.locator('[data-section-type="lead_capture"]')
  await expect(leadCapture).toBeVisible()
  await expect(leadCapture.locator('input[type="email"]')).toBeVisible()
  await expect(leadCapture.locator('button[type="submit"]')).toBeVisible()

  // 5. Gallery section — 8 images (2 per location)
  const gallery = page.locator('[data-section-type="gallery"]')
  await expect(gallery).toBeVisible()
  const imgCount = await gallery.locator('img').count()
  console.log('Gallery images:', imgCount)
  expect(imgCount).toBeGreaterThanOrEqual(8)

  // 6. CTA section — 4 location buttons with Google Place ID URLs
  const cta = page.locator('[data-section-type="cta"]')
  await expect(cta).toBeVisible()
  expect(await cta.locator('a').count()).toBe(4)

  // 7. Social links section
  const social = page.locator('[data-section-type="social_links"]')
  await expect(social).toBeVisible()

  // Store footer
  await expect(page.locator('text=Powered by')).toBeVisible()
  console.log('All 7 sections rendered')
})

test('landing page analytics events fire', async ({ page }) => {
  const eventUrls: string[] = []
  page.on('request', req => {
    if (req.url().includes('/events')) eventUrls.push(req.url())
  })
  await page.goto(`${GATEWAY_URL}/l/spring-2026`, { waitUntil: 'networkidle' })
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(1500)
  console.log('Event requests:', eventUrls.length)
  expect(eventUrls.length).toBeGreaterThanOrEqual(1)
})

test('landing page returns JSON for API clients', async ({ request }) => {
  const res = await request.get(`${GATEWAY_URL}/l/spring-2026`, {
    headers: { Accept: 'application/json' },
  })
  expect(res.status()).toBe(200)
  const data = await res.json()
  expect(data.object).toBe('landing_page')
  expect(data.landing_page.slug).toBe('spring-2026')
  expect(data.landing_page.sections).toHaveLength(7)
  expect(data.store).toBeTruthy()
  console.log('JSON: name =', data.landing_page.name, '| sections:', data.landing_page.sections.length)
})
