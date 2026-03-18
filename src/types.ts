// ─── Domain Types ────────────────────────────────────────────────────────────
// Matches whale-gateway API response shapes exactly.

export interface PricingTier {
  id: string
  unit: string
  label: string
  quantity: number
  sort_order: number
  default_price: number
}

export interface ProductVariation {
  id: string
  product_id: string
  name: string
  sku: string | null
  price: number
  stock_quantity: number
  attributes: Record<string, string>
}

export interface Product {
  id: string
  name: string
  slug: string
  sku: string | null
  description: string | null
  status: string
  type: string
  primary_category_id: string
  featured_image: string | null
  image_gallery: string[]
  pricing_data: PricingTier[] | { mode?: string; tiers?: PricingTier[] } | null
  custom_fields: Record<string, string | null>
  stock_quantity?: number
}

export interface Category {
  id: string
  name: string
  slug: string
  parent_id: string | null
  description: string | null
  image_url: string | null
  sort_order: number
  product_count?: number
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[]
}

export interface Review {
  id: string
  product_id: string
  customer_id: string | null
  customer_name: string | null
  rating: number
  title: string | null
  body: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface ReviewSummary {
  average_rating: number
  total_reviews: number
  rating_distribution: Record<string, number>
}

export interface WishlistItem {
  id: string
  product_id: string
  product: Product | null
  added_at: string
}

export interface LoyaltyAccount {
  customer_id: string
  points_balance: number
  tier: string
  lifetime_points: number
}

export interface LoyaltyReward {
  id: string
  name: string
  description: string | null
  points_cost: number
  reward_type: string
  is_active: boolean
}

export interface LoyaltyTransaction {
  id: string
  customer_id: string
  points: number
  type: string
  description: string | null
  created_at: string
  order_id: string | null
}

export interface ShippingMethod {
  id: string
  name: string
  description: string | null
  carrier: string | null
  estimated_days_min: number | null
  estimated_days_max: number | null
  is_active: boolean
}

export interface ShippingRate {
  method_id: string
  method_name: string
  carrier: string | null
  rate: number
  estimated_days_min: number | null
  estimated_days_max: number | null
}

export interface DealValidation {
  valid: boolean
  code: string
  deal_id?: string
  name?: string
  discount_type: string | null
  discount_value: number | null
  apply_to?: string
  badge_text?: string | null
  message: string | null
}

/** @deprecated Use DealValidation instead */
export type CouponValidation = DealValidation

export interface CheckoutSession {
  id: string
  cart_id: string
  status: string
  customer_email: string | null
  shipping_address: Address | null
  billing_address: Address | null
  shipping_method_id: string | null
  coupon_code: string | null
  subtotal: number
  tax_amount: number
  shipping_amount: number
  discount_amount: number
  total: number
  created_at: string
  expires_at: string
}

export interface Recommendation {
  product: Product
  score: number
  reason: string
}

export interface CartItem {
  id: string
  product_id: string
  product_name: string
  image_url: string | null
  quantity: number
  unit_price: number
  tier_label: string | null
  line_total: number
}

export interface TaxBreakdown {
  name: string
  rate: number
  type: string
  rate_decimal: number
}

export interface Cart {
  id: string
  items: CartItem[]
  item_count: number
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  tax_breakdown: TaxBreakdown[]
  discount_amount: number
  customer_email: string | null
}

export interface Order {
  id: string
  order_number: string
  status: string
  total_amount: number
  subtotal: number
  tax_amount: number
  discount_amount: number
  item_count?: number
  created_at: string
  payment_status?: string
  fulfillment_status?: string
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  product_name: string
  quantity: number
  unit_price?: number
  cost_per_unit?: number
  line_total: number
}

export interface Customer {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  loyalty_points: number
  loyalty_tier: string
  total_spent: number
  total_orders: number
  lifetime_value?: number
  street_address?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  date_of_birth?: string | null
  created_at?: string
  is_staff?: boolean
  email_consent?: boolean
  sms_consent?: boolean
}

export interface Address {
  firstName: string
  lastName: string
  address: string
  city: string
  state: string
  zip: string
  country: string
}

export interface PaymentData {
  payment_method: 'card' | 'cash'
  opaque_data?: {
    dataDescriptor: string
    dataValue: string
  }
  billTo?: Address
  shipTo?: Address
}

export interface CustomerAnalytics {
  customer_id: string
  customer_name: string
  total_orders: number
  lifetime_revenue: number
  avg_order_value: number
  ltv_tier: string
  rfm_segment: string
  churn_risk: string
  last_order_date: string
  recency_days: number
}

export interface Location {
  id: string
  name: string
  address?: string
  city?: string
  state?: string
  zip?: string
  phone?: string
  is_active?: boolean
}

export interface SendCodeResponse {
  sent: boolean
}

export interface VerifyCodeResponse {
  object: string
  token_hash: string
  needs_profile: boolean
  customer: Customer | null
}

export interface StorefrontSession {
  id: string
  store_id: string
  customer_id?: string
  started_at: string
  last_active_at: string
}

// ─── Generic Responses ──────────────────────────────────────────────────────

export interface ListResponse<T> {
  object: 'list'
  data: T[]
  has_more: boolean
  cursors?: {
    before?: string
    after?: string
  }
  url?: string
}

// ─── Config ─────────────────────────────────────────────────────────────────

export interface WhaleStorefrontConfig {
  /** Store UUID */
  storeId: string
  /** API key (wk_live_... or wk_test_...) */
  apiKey: string
  /** Gateway base URL. Defaults to https://whale-gateway.fly.dev */
  gatewayUrl?: string
  /** Client-side proxy path. Defaults to /api/gw */
  proxyPath?: string
  /** Media signing secret for image/video proxy */
  mediaSigningSecret?: string
  /** Supabase host for media URL detection */
  supabaseHost?: string
  /** localStorage key prefix. Defaults to "whale" */
  storagePrefix?: string
  /** Analytics session TTL in ms. Defaults to 30 minutes */
  sessionTtl?: number
  /** Enable debug logging */
  debug?: boolean
  /**
   * Master toggle for all tracking (analytics, pixels, behavioral).
   * When false every tracking call is a no-op.
   * Defaults to true; can also be set via NEXT_PUBLIC_TRACKING_ENABLED env var.
   */
  trackingEnabled?: boolean
  /**
   * Fraction of sessions that record full behavioral replays (0 – 1).
   * 0 = never, 1 = every session. Defaults to 0.1 (10 %).
   * Can also be set via NEXT_PUBLIC_RECORDING_RATE env var.
   */
  recordingRate?: number
}

// ─── Event Types ────────────────────────────────────────────────────────────

export type EventType =
  | 'page_view'
  | 'product_view'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'begin_checkout'
  | 'purchase'
  | 'category_view'
  | 'search'

// -- QR Landing Page --

export interface QRLandingPage {
  title: string | null
  description: string | null
  image_url: string | null
  cta_text: string | null
  cta_url: string | null
  background_color: string | null
  text_color: string | null
  layout: string | null
  theme: string | null
  video_url: string | null
  gallery_urls: string[] | null
}

export interface QRLandingStore {
  id: string
  name: string
  logo_url: string | null
  banner_url: string | null
  tagline: string | null
  brand_colors: Record<string, string> | null
  theme: Record<string, unknown> | null
}

export interface QRLandingData {
  object: 'qr_landing_page'
  qr_code: {
    id: string
    code: string
    name: string
    type: string
    destination_url: string
    landing_page: QRLandingPage
    brand_color: string | null
    logo_url: string | null
    campaign_name: string | null
    tags: string[] | null
  }
  store: QRLandingStore | null
  product: Record<string, unknown> | null
  coa: { url: string; viewer_url?: string | null; document_name: string } | null
  landing_page: LandingPageConfig | null
}

// -- Landing Pages --

export interface LandingSection {
  id: string
  type: 'hero' | 'text' | 'image' | 'video' | 'gallery' | 'cta' | 'stats' | 'product_card' | 'coa_viewer' | 'social_links' | 'divider' | 'custom'
  content: Record<string, unknown>
  order: number
  config?: Record<string, unknown>
}

export interface LandingPageConfig {
  id: string
  slug: string
  name: string
  status: string
  layout: string
  theme: string
  sections: LandingSection[]
  background_color: string | null
  text_color: string | null
  accent_color: string | null
  font_family: string | null
  custom_css: string | null
  page_title: string | null
  og_title: string | null
  og_description: string | null
  og_image_url: string | null
  total_views: number
  unique_views: number
}

export interface LandingPageRenderData {
  object: 'landing_page'
  landing_page: LandingPageConfig
  store: QRLandingStore | null
  product: Record<string, unknown> | null
  coa: { url: string; viewer_url?: string | null; document_name: string } | null
}

// -- Referral Program --

export interface ReferralEnrollment {
  object: 'referral_enrollment'
  affiliate_id: string
  referral_code: string
  share_url: string
  qr_code_id: string
  wallet_pass_id: string
}

export interface ReferralStatus {
  object: 'referral_status'
  enrolled: boolean
  referral_code: string | null
  share_url: string | null
  total_referrals: number
  pending_referrals: number
  points_earned: number
  wallet_pass_id: string | null
  referred_by: {
    affiliate_id: string
    referral_code: string
    referrer_name: string
  } | null
}

// Re-export pixel types for consumers
export type { PixelConfig, StorefrontConfig } from './pixels/types.js'
