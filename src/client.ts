import type {
  Cart,
  CartItem,
  Category,
  CategoryTreeNode,
  CheckoutSession,
  DealValidation,
  Customer,
  CustomerAnalytics,
  ListResponse,
  Location,
  LoyaltyAccount,
  LoyaltyReward,
  LoyaltyTransaction,
  Order,
  PaymentData,
  Product,
  Recommendation,
  ReferralEnrollment,
  ReferralStatus,
  Review,
  ReviewSummary,
  SendCodeResponse,
  ShippingMethod,
  ShippingRate,
  StorefrontSession,
  VerifyCodeResponse,
  WhaleStorefrontConfig,
  WishlistItem,
  EventType,
  QRLandingData,
} from './types.js'

import type { StorefrontConfig } from './pixels/types.js'

import {
  fetchAllCustomerOrders,
  findCustomerAnalytics,
  encodeBase64Url,
  signMedia,
} from './client-queries.js'

import { resilientSend } from './resilient-send.js'

// -- WhaleClient --
// Stateless HTTP wrapper around whale-gateway. Works server-side and client-side.
// No React, no browser APIs (except fetch).

export class WhaleClient {
  readonly storeId: string
  readonly apiKey: string
  readonly gatewayUrl: string
  readonly proxyPath: string

  private _sessionToken: string | null = null

  constructor(config: WhaleStorefrontConfig) {
    this.storeId = config.storeId
    this.apiKey = config.apiKey
    this.gatewayUrl = config.gatewayUrl || 'https://whale-gateway.fly.dev'
    this.proxyPath = config.proxyPath || '/api/gw'
  }

  // -- Token Management --

  setSessionToken(token: string | null): void { this._sessionToken = token }
  getSessionToken(): string | null { return this._sessionToken }

  // -- Base URL --

  private get baseUrl(): string {
    return typeof window === 'undefined' ? this.gatewayUrl : this.proxyPath
  }

  // -- Base Fetcher --

  private async request<T = unknown>(
    path: string, options: RequestInit = {}, opts?: { revalidate?: number }
  ): Promise<T> {
    const url = `${this.baseUrl}/v1/stores/${this.storeId}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
    }
    if (this._sessionToken) headers['Authorization'] = `Bearer ${this._sessionToken}`

    const fetchOptions: RequestInit & { next?: { revalidate?: number } } = {
      ...options,
      headers: { ...headers, ...((options.headers as Record<string, string>) ?? {}) },
    }
    if (opts?.revalidate !== undefined) fetchOptions.next = { revalidate: opts.revalidate }

    const res = await fetch(url, fetchOptions)
    if (!res.ok) {
      let message = `Gateway error ${res.status}: ${res.statusText}`
      try {
        const body = await res.json()
        if (body?.message) message = body.message
        else if (typeof body?.error === 'string') message = body.error
        else if (body?.error?.message) message = body.error.message
      } catch { /* ignore parse errors */ }
      const err = new Error(message) as Error & { status: number }
      err.status = res.status
      throw err
    }
    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  }

  // -- Products --

  async listProducts(params?: { limit?: number; starting_after?: string; status?: string }): Promise<ListResponse<Product>> {
    const sp = new URLSearchParams()
    if (params?.limit) sp.set('limit', String(params.limit))
    if (params?.starting_after) sp.set('starting_after', params.starting_after)
    if (params?.status) sp.set('status', params.status)
    const qs = sp.toString()
    return this.request<ListResponse<Product>>(`/products${qs ? `?${qs}` : ''}`)
  }

  async getProduct(id: string): Promise<Product> {
    return this.request<Product>(`/products/${id}`)
  }

  async getAllProducts(options?: {
    status?: string; maxPages?: number; revalidate?: number; filter?: (product: Product) => boolean
  }): Promise<Product[]> {
    const all: Product[] = []
    let cursor: string | undefined
    let hasMore = true
    let pages = 0
    const maxPages = options?.maxPages ?? 20

    while (hasMore && pages < maxPages) {
      const params = new URLSearchParams({ limit: '100' })
      if (options?.status) params.set('status', options.status)
      else params.set('status', 'published')
      if (cursor) params.set('starting_after', cursor)

      const data = await this.request<ListResponse<Product>>(
        `/products?${params}`, {},
        options?.revalidate !== undefined ? { revalidate: options.revalidate } : undefined
      )
      if (!data.data || data.data.length === 0) break
      for (const p of data.data) {
        if (!options?.filter || options.filter(p)) all.push(p)
        cursor = p.id
      }
      hasMore = data.has_more
      pages++
    }
    return all
  }

  // -- Cart --

  async createCart(customerEmail?: string): Promise<Cart> {
    return this.request<Cart>('/cart', {
      method: 'POST',
      body: JSON.stringify(customerEmail ? { customer_email: customerEmail } : {}),
    })
  }

  async getCart(cartId: string): Promise<Cart> {
    return this.request<Cart>(`/cart/${cartId}`)
  }

  async addToCart(cartId: string, productId: string, quantity: number, options?: { tier?: string; unitPrice?: number }): Promise<CartItem> {
    return this.request<CartItem>(`/cart/${cartId}/items`, {
      method: 'POST',
      body: JSON.stringify({
        product_id: productId, quantity,
        ...(options?.tier !== undefined && { tier: options.tier }),
        ...(options?.unitPrice !== undefined && { unit_price: options.unitPrice }),
      }),
    })
  }

  async updateCartItem(cartId: string, itemId: string, quantity: number): Promise<Cart> {
    return this.request<Cart>(`/cart/${cartId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) })
  }

  async removeCartItem(cartId: string, itemId: string): Promise<void> {
    return this.request<void>(`/cart/${cartId}/items/${itemId}`, { method: 'DELETE' })
  }

  // -- Checkout --

  async checkout(cartId: string, customerEmail?: string, payment?: PaymentData, referralCode?: string): Promise<Order> {
    return this.request<Order>('/checkout', {
      method: 'POST',
      body: JSON.stringify({
        cart_id: cartId,
        ...(customerEmail && { customer_email: customerEmail }),
        ...(referralCode && { referral_code: referralCode }),
        ...(payment && {
          payment_method: payment.payment_method,
          ...(payment.opaque_data && { opaque_data: payment.opaque_data }),
          ...(payment.billTo && { bill_to: payment.billTo }),
          ...(payment.shipTo && { ship_to: payment.shipTo }),
        }),
      }),
    })
  }

  // -- Customers --

  async findCustomer(query: string): Promise<Customer[]> {
    const encoded = encodeURIComponent(query)
    const res = await this.request<{ data: Customer[] } | Customer[]>(`/customers?query=${encoded}`)
    return Array.isArray(res) ? res : res?.data ?? []
  }

  async getCustomer(id: string): Promise<Customer> { return this.request<Customer>(`/customers/${id}`) }

  async createCustomer(data: { first_name: string; last_name: string; email: string; phone?: string }): Promise<Customer> {
    return this.request<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateProfile(customerId: string, data: { first_name: string; last_name: string; phone?: string; date_of_birth?: string }): Promise<Customer> {
    return this.request<Customer>('/storefront/profile', {
      method: 'PATCH',
      body: JSON.stringify({ customer_id: customerId, ...data }),
    })
  }

  // -- Orders --

  async listOrders(params?: { customer_id?: string; limit?: number; starting_after?: string }): Promise<ListResponse<Order>> {
    const sp = new URLSearchParams()
    if (params?.customer_id) sp.set('customer_id', params.customer_id)
    if (params?.limit) sp.set('limit', String(params.limit))
    if (params?.starting_after) sp.set('starting_after', params.starting_after)
    const qs = sp.toString()
    return this.request<ListResponse<Order>>(`/orders${qs ? `?${qs}` : ''}`)
  }

  async getOrder(id: string): Promise<Order> { return this.request<Order>(`/orders/${id}`) }

  async getCustomerOrders(customerId: string): Promise<Order[]> {
    return fetchAllCustomerOrders((path, opts) => this.request(path, opts), customerId)
  }

  // -- Auth (OTP) --

  async sendCode(email: string): Promise<SendCodeResponse> {
    return this.request<SendCodeResponse>('/storefront/auth/send-code', { method: 'POST', body: JSON.stringify({ email }) })
  }

  async verifyCode(email: string, code: string): Promise<VerifyCodeResponse> {
    return this.request<VerifyCodeResponse>('/storefront/auth/verify-code', { method: 'POST', body: JSON.stringify({ email, code }) })
  }

  // -- Customer Analytics --

  async getCustomerAnalytics(customerId: string, customerName?: string): Promise<CustomerAnalytics | null> {
    return findCustomerAnalytics((path) => this.request(path), customerId, customerName)
  }

  // -- Locations --

  async listLocations(): Promise<ListResponse<Location>> { return this.request<ListResponse<Location>>('/locations') }

  // -- COA --

  getCOAEmbedUrl(productId: string): string {
    return `${this.baseUrl}/v1/stores/${this.storeId}/coa/${productId}/embed`
  }

  // -- Storefront Config --

  async fetchStorefrontConfig(): Promise<StorefrontConfig> {
    return this.request<StorefrontConfig>('/storefront/config')
  }

  // -- QR Landing Page --

  /** Fetch QR landing page data (public, no auth needed). */
  async fetchQRLandingData(code: string): Promise<QRLandingData> {
    // Public endpoint — hit gateway directly, no store prefix or API key
    const url = `${this.gatewayUrl}/q/${encodeURIComponent(code)}/page`
    const res = await fetch(url)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error?.message ?? `QR landing fetch failed: ${res.status}`)
    }
    return res.json()
  }

  /** Fetch landing page data by slug (public, no auth needed). */
  async fetchLandingPage(slug: string): Promise<import('./types.js').LandingPageRenderData> {
    const url = `${this.gatewayUrl}/l/${encodeURIComponent(slug)}`
    const res = await fetch(url)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error?.message ?? `Landing page fetch failed: ${res.status}`)
    }
    return res.json()
  }

  // -- Analytics / Storefront Sessions --

  async createSession(params: {
    visitor_id?: string
    user_agent?: string
    referrer?: string
    page_url?: string
    device?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
    gclid?: string
    fbclid?: string
  }): Promise<StorefrontSession> {
    return this.request<StorefrontSession>('/storefront/sessions', { method: 'POST', body: JSON.stringify(params) })
  }

  async updateSession(sessionId: string, params: {
    last_active_at?: string
    customer_id?: string
    customer_first_name?: string
    customer_last_name?: string
    cart_id?: string
    cart_item_count?: number
    cart_total?: number
    order_id?: string
    fingerprint_id?: string
    status?: string
    current_page?: string
  }): Promise<StorefrontSession> {
    return this.request<StorefrontSession>(`/storefront/sessions/${sessionId}`, { method: 'PATCH', body: JSON.stringify(params) })
  }

  async trackEvent(params: { session_id: string; event_type: EventType; event_data?: Record<string, unknown>; visitor_id?: string }): Promise<void> {
    const url = `${this.baseUrl}/v1/stores/${this.storeId}/storefront/events`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
    }
    if (this._sessionToken) headers['Authorization'] = `Bearer ${this._sessionToken}`
    // Map SDK field names to gateway field names
    const payload: Record<string, unknown> = {
      event_name: params.event_type,
      session_id: params.session_id,
      event_properties: params.event_data,
    }
    if (params.visitor_id) payload.visitor_id = params.visitor_id
    await resilientSend(url, payload, headers)
  }

  // -- Checkout Sessions --

  async createCheckoutSession(params: {
    cart_id: string
    customer_email?: string
    shipping_address?: import('./types.js').Address
    billing_address?: import('./types.js').Address
    shipping_method_id?: string
    coupon_code?: string
    referral_code?: string
    loyalty_reward_id?: string
    selected_product_id?: string
  }): Promise<CheckoutSession> {
    return this.request<CheckoutSession>('/storefront/checkout', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  async getCheckoutSession(sessionId: string): Promise<CheckoutSession> {
    return this.request<CheckoutSession>(`/storefront/checkout/${sessionId}`)
  }

  async updateCheckoutSession(sessionId: string, params: {
    customer_email?: string
    shipping_address?: import('./types.js').Address
    billing_address?: import('./types.js').Address
    shipping_method_id?: string
    coupon_code?: string
  }): Promise<CheckoutSession> {
    return this.request<CheckoutSession>(`/storefront/checkout/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    })
  }

  async completeCheckout(sessionId: string, payment?: PaymentData, opts?: {
    loyalty_reward_id?: string
    selected_product_id?: string
  }): Promise<Order> {
    return this.request<Order>(`/storefront/checkout/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        ...(payment && {
          payment_method: payment.payment_method,
          ...(payment.opaque_data && { opaque_data: payment.opaque_data }),
          ...(payment.billTo && { bill_to: payment.billTo }),
          ...(payment.shipTo && { ship_to: payment.shipTo }),
        }),
        ...(opts?.loyalty_reward_id && { loyalty_reward_id: opts.loyalty_reward_id }),
        ...(opts?.selected_product_id && { selected_product_id: opts.selected_product_id }),
      }),
    })
  }

  // -- Search --

  async searchProducts(params: {
    query: string
    category_id?: string
    min_price?: number
    max_price?: number
    sort_by?: string
    sort_order?: 'asc' | 'desc'
    limit?: number
    starting_after?: string
  }): Promise<ListResponse<Product>> {
    const sp = new URLSearchParams({ q: params.query })
    if (params.category_id) sp.set('category_id', params.category_id)
    if (params.min_price !== undefined) sp.set('min_price', String(params.min_price))
    if (params.max_price !== undefined) sp.set('max_price', String(params.max_price))
    if (params.sort_by) sp.set('sort_by', params.sort_by)
    if (params.sort_order) sp.set('sort_order', params.sort_order)
    if (params.limit) sp.set('limit', String(params.limit))
    if (params.starting_after) sp.set('starting_after', params.starting_after)
    return this.request<ListResponse<Product>>(`/products/search?${sp}`)
  }

  // -- Categories --

  async listCategories(): Promise<ListResponse<Category>> {
    return this.request<ListResponse<Category>>('/categories')
  }

  async getCategory(id: string): Promise<Category> {
    return this.request<Category>(`/categories/${id}`)
  }

  // -- Loyalty --

  async getLoyaltyAccount(customerId: string): Promise<LoyaltyAccount> {
    return this.request<LoyaltyAccount>(`/storefront/loyalty/${customerId}`)
  }

  async listLoyaltyRewards(): Promise<ListResponse<LoyaltyReward>> {
    return this.request<ListResponse<LoyaltyReward>>('/storefront/loyalty/rewards')
  }

  async listLoyaltyTransactions(customerId: string, params?: {
    limit?: number
    starting_after?: string
  }): Promise<ListResponse<LoyaltyTransaction>> {
    const sp = new URLSearchParams()
    if (params?.limit) sp.set('limit', String(params.limit))
    if (params?.starting_after) sp.set('starting_after', params.starting_after)
    const qs = sp.toString()
    return this.request<ListResponse<LoyaltyTransaction>>(
      `/storefront/loyalty/${customerId}/transactions${qs ? `?${qs}` : ''}`
    )
  }

  async listLoyaltyProducts(params: {
    category: string
    location_id: string
    tier?: string
  }): Promise<ListResponse<Product>> {
    const sp = new URLSearchParams({ category: params.category, location_id: params.location_id })
    if (params.tier) sp.set('tier', params.tier)
    return this.request<ListResponse<Product>>(`/storefront/loyalty/products?${sp}`)
  }

  async redeemLoyaltyReward(customerId: string, rewardId: string): Promise<{ success: boolean; points_remaining: number }> {
    return this.request<{ success: boolean; points_remaining: number }>(
      `/storefront/loyalty/${customerId}/redeem`,
      { method: 'POST', body: JSON.stringify({ reward_id: rewardId }) }
    )
  }

  // -- Reviews --

  async listProductReviews(productId: string, params?: {
    limit?: number
    starting_after?: string
    sort_by?: 'created_at' | 'rating'
    sort_order?: 'asc' | 'desc'
  }): Promise<ListResponse<Review> & { summary?: ReviewSummary }> {
    const sp = new URLSearchParams()
    if (params?.limit) sp.set('limit', String(params.limit))
    if (params?.starting_after) sp.set('starting_after', params.starting_after)
    if (params?.sort_by) sp.set('sort_by', params.sort_by)
    if (params?.sort_order) sp.set('sort_order', params.sort_order)
    const qs = sp.toString()
    return this.request<ListResponse<Review> & { summary?: ReviewSummary }>(
      `/products/${productId}/reviews${qs ? `?${qs}` : ''}`
    )
  }

  async submitReview(productId: string, data: {
    rating: number
    title?: string
    body?: string
    customer_name?: string
  }): Promise<Review> {
    return this.request<Review>(`/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // -- Wishlist --

  async listWishlistItems(customerId: string): Promise<ListResponse<WishlistItem>> {
    return this.request<ListResponse<WishlistItem>>(`/storefront/wishlist/${customerId}`)
  }

  async addWishlistItem(customerId: string, productId: string): Promise<WishlistItem> {
    return this.request<WishlistItem>(`/storefront/wishlist/${customerId}`, {
      method: 'POST',
      body: JSON.stringify({ product_id: productId }),
    })
  }

  async removeWishlistItem(customerId: string, productId: string): Promise<void> {
    return this.request<void>(`/storefront/wishlist/${customerId}/${productId}`, {
      method: 'DELETE',
    })
  }

  // -- Recommendations --

  async getRecommendations(params?: {
    product_id?: string
    customer_id?: string
    limit?: number
    type?: 'similar' | 'frequently_bought_together' | 'personalized'
  }): Promise<{ data: Recommendation[] }> {
    const sp = new URLSearchParams()
    if (params?.product_id) sp.set('product_id', params.product_id)
    if (params?.customer_id) sp.set('customer_id', params.customer_id)
    if (params?.limit) sp.set('limit', String(params.limit))
    if (params?.type) sp.set('type', params.type)
    const qs = sp.toString()
    return this.request<{ data: Recommendation[] }>(
      `/storefront/recommendations${qs ? `?${qs}` : ''}`
    )
  }

  // -- Locations (extended) --

  async getLocation(id: string): Promise<Location> {
    return this.request<Location>(`/locations/${id}`)
  }

  // -- Shipping --

  async listShippingMethods(): Promise<ListResponse<ShippingMethod>> {
    return this.request<ListResponse<ShippingMethod>>('/storefront/shipping/methods')
  }

  async calculateShippingRates(params: {
    cart_id: string
    shipping_address: import('./types.js').Address
  }): Promise<{ data: ShippingRate[] }> {
    return this.request<{ data: ShippingRate[] }>('/storefront/shipping/rates', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  // -- Deals (discount codes) --

  async validateDeal(code: string, params?: {
    cart_id?: string
  }): Promise<DealValidation> {
    const sp = new URLSearchParams({ code })
    if (params?.cart_id) sp.set('cart_id', params.cart_id)
    return this.request<DealValidation>(`/storefront/deals/validate?${sp}`)
  }

  async applyDeal(cartId: string, code: string): Promise<Cart> {
    return this.request<Cart>(`/cart/${cartId}/deal`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
  }

  async removeDeal(cartId: string): Promise<Cart> {
    return this.request<Cart>(`/cart/${cartId}/deal`, {
      method: 'DELETE',
    })
  }

  /** @deprecated Use validateDeal instead */
  async validateCoupon(code: string, params?: { cart_id?: string }): Promise<DealValidation> {
    return this.validateDeal(code, params)
  }

  /** @deprecated Use applyDeal instead */
  async applyCoupon(cartId: string, code: string): Promise<Cart> {
    return this.applyDeal(cartId, code)
  }

  /** @deprecated Use removeDeal instead */
  async removeCoupon(cartId: string): Promise<Cart> {
    return this.removeDeal(cartId)
  }

  // -- Referrals --

  async enrollReferral(customerId: string): Promise<ReferralEnrollment> {
    return this.request<ReferralEnrollment>('/storefront/referrals/enroll', {
      method: 'POST',
      body: JSON.stringify({ customer_id: customerId }),
    })
  }

  async getReferralStatus(customerId: string): Promise<ReferralStatus> {
    return this.request<ReferralStatus>(`/storefront/referrals/status?customer_id=${customerId}`)
  }

  async attributeReferral(
    customerId: string,
    referralCode: string,
  ): Promise<{ success: boolean; affiliate_id?: string; error?: string }> {
    return this.request('/storefront/referrals/attribute', {
      method: 'POST',
      body: JSON.stringify({ customer_id: customerId, referral_code: referralCode }),
    })
  }

  // -- Static Media Utilities --

  static encodeBase64Url = encodeBase64Url
  static signMedia = signMedia
}
