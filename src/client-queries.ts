/**
 * Extended query methods and static utilities for WhaleClient.
 * Extracted from client.ts to keep the core under 300 lines.
 */

import type {
  Customer,
  CustomerAnalytics,
  ListResponse,
  Location,
  Order,
  SendCodeResponse,
  StorefrontSession,
  VerifyCodeResponse,
  EventType,
} from './types.js'

/**
 * Paginate through all customer orders.
 */
export async function fetchAllCustomerOrders(
  requestFn: <T>(path: string, opts?: RequestInit) => Promise<T>,
  customerId: string
): Promise<Order[]> {
  const encoded = encodeURIComponent(customerId)
  const all: Order[] = []
  let cursor: string | undefined
  let hasMore = true

  while (hasMore) {
    const params = new URLSearchParams({ customer_id: encoded, limit: '100' })
    if (cursor) params.set('starting_after', cursor)

    const res = await requestFn<ListResponse<Order>>(`/orders?${params}`)
    const items = res?.data ?? []
    if (items.length === 0) break

    all.push(...items)
    cursor = items[items.length - 1].id
    hasMore = res.has_more ?? false
  }

  return all
}

/**
 * Find customer analytics by ID or name (fallback).
 */
export async function findCustomerAnalytics(
  requestFn: <T>(path: string) => Promise<T>,
  customerId: string,
  customerName?: string
): Promise<CustomerAnalytics | null> {
  try {
    const res = await requestFn<{ customers: CustomerAnalytics[] }>(
      '/analytics/customers?limit=200'
    )
    const byId = res.customers?.find((c) => c.customer_id === customerId)
    if (byId) return byId
    if (customerName) {
      const normalized = customerName.toLowerCase().trim()
      return (
        res.customers?.find(
          (c) => c.customer_name?.toLowerCase().trim() === normalized
        ) ?? null
      )
    }
    return null
  } catch {
    return null
  }
}

/**
 * Base64url-encode a URL string (works in both Node and browser).
 */
export function encodeBase64Url(url: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(url, 'utf-8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }
  return btoa(url)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Quad-FNV (128-bit) media signing — matches gateway's media-signature.ts.
 */
export function signMedia(
  signingSecret: string,
  encodedUrl: string,
  w: string,
  q: string,
  f: string
): string {
  const payload = `${signingSecret}|${encodedUrl}|${w}|${q}|${f}`
  let h1 = 0x811c9dc5, h2 = 0xcbf29ce4, h3 = 0x1a47e90b, h4 = 0xe5c4a7d2
  for (let i = 0; i < payload.length; i++) {
    const c = payload.charCodeAt(i)
    h1 ^= c; h1 = Math.imul(h1, 0x01000193)
    h2 ^= c; h2 = Math.imul(h2, 0x0100019d)
    h3 ^= c; h3 = Math.imul(h3, 0x010001a5)
    h4 ^= c; h4 = Math.imul(h4, 0x010001cf)
  }
  return (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h3 >>> 0).toString(16).padStart(8, '0') +
    (h4 >>> 0).toString(16).padStart(8, '0')
  ).slice(0, 32)
}
