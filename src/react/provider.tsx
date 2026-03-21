'use client'

import { useMemo, useState, useCallback, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { WhaleClient } from '../client.js'
import type { WhaleStorefrontConfig, Product } from '../types.js'
import type { PixelManager } from '../pixels/pixel-manager.js'
import { WhaleContext, type WhaleContextValue } from './context.js'
import { createCartStore } from './stores/cart-store.js'
import { createAuthStore } from './stores/auth-store.js'
import { AnalyticsTracker } from './components/analytics-tracker.js'
import { CartInitializer } from './components/cart-initializer.js'
import { AuthInitializer } from './components/auth-initializer.js'
import { PixelInitializer } from './components/pixel-initializer.js'
import { BehavioralTrackerComponent } from './components/behavioral-tracker.js'
import { FingerprintCollector } from './components/fingerprint-collector.js'
import { SessionRecorderComponent } from './components/session-recorder.js'
import { ThemeProvider, type ThemeTokens } from '@neowhale/ui'

/** Read a boolean env var (NEXT_PUBLIC_*). Returns undefined when absent. */
function envBool(name: string): boolean | undefined {
  if (typeof process === 'undefined') return undefined
  const raw = (process.env as Record<string, string | undefined>)[name]
  if (raw === undefined || raw === '') return undefined
  return raw !== '0' && raw.toLowerCase() !== 'false'
}

/** Read a numeric env var (NEXT_PUBLIC_*). Returns undefined when absent. */
function envNumber(name: string): number | undefined {
  if (typeof process === 'undefined') return undefined
  const raw = (process.env as Record<string, string | undefined>)[name]
  if (raw === undefined || raw === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

export interface WhaleProviderProps extends WhaleStorefrontConfig {
  children: ReactNode
  /** Server-fetched products passed to client for hooks */
  products?: Product[]
  /** Manual theme overrides — merged with store theme fetched from storefront config */
  theme?: Partial<ThemeTokens>
}

export function WhaleProvider({
  children,
  products = [],
  theme: themeProp,
  storeId,
  apiKey,
  gatewayUrl,
  proxyPath,
  mediaSigningSecret,
  supabaseHost,
  storagePrefix,
  sessionTtl,
  debug,
  trackingEnabled,
  recordingRate,
}: WhaleProviderProps) {
  const pathname = usePathname()
  const [pixelManager, setPixelManager] = useState<PixelManager | null>(null)
  const [storeTheme, setStoreTheme] = useState<Partial<ThemeTokens> | undefined>(undefined)

  const handlePixelReady = useCallback((manager: PixelManager) => {
    setPixelManager(manager)
  }, [])

  const handleTheme = useCallback((theme: Record<string, unknown>) => {
    setStoreTheme(theme as Partial<ThemeTokens>)
  }, [])

  const ctx = useMemo<WhaleContextValue>(() => {
    const resolvedConfig = {
      storeId,
      apiKey,
      gatewayUrl: gatewayUrl || 'https://whale-gateway.fly.dev',
      proxyPath: proxyPath || '/api/gw',
      mediaSigningSecret: mediaSigningSecret || '',
      supabaseHost: supabaseHost || '',
      storagePrefix: storagePrefix || 'whale',
      sessionTtl: sessionTtl || 30 * 60 * 1000,
      debug: debug || false,
      trackingEnabled: trackingEnabled ?? envBool('NEXT_PUBLIC_TRACKING_ENABLED') ?? true,
      recordingRate: recordingRate ?? envNumber('NEXT_PUBLIC_RECORDING_RATE') ?? 0.1,
    }

    const client = new WhaleClient({
      storeId,
      apiKey,
      gatewayUrl: resolvedConfig.gatewayUrl,
      proxyPath: resolvedConfig.proxyPath,
    })

    // Analytics callbacks wired into cart store — fire events via client directly
    // since we can't use the useAnalytics hook outside a component.
    // Read session_id from localStorage (same key pattern as useAnalytics).
    const readSessionId = (): string | undefined => {
      try {
        const raw = localStorage.getItem(`${resolvedConfig.storagePrefix}-analytics-session`)
        if (!raw) return undefined
        const stored = JSON.parse(raw) as { id: string; createdAt: number }
        if (Date.now() - stored.createdAt < resolvedConfig.sessionTtl) return stored.id
      } catch { /* ignore */ }
      return undefined
    }

    /** Sync cart state to the analytics session (fire-and-forget). */
    const syncCartToSession = (cartId: string, total: number, itemCount: number) => {
      const sid = readSessionId()
      if (sid && !sid.startsWith('local-')) {
        client.updateSession(sid, {
          cart_id: cartId,
          cart_total: total,
          cart_item_count: itemCount,
          status: 'carting',
        }).catch(() => {})
      }
    }

    const onAddToCart = resolvedConfig.trackingEnabled
      ? (productId: string, productName: string, quantity: number, price: number, tier?: string) => {
          const sid = readSessionId()
          if (sid) client.trackEvent({ session_id: sid, event_type: 'add_to_cart' as never, event_data: { product_id: productId, product_name: productName, quantity, price, tier } }).catch(() => {})
        }
      : undefined

    const onRemoveFromCart = resolvedConfig.trackingEnabled
      ? (productId: string, productName: string) => {
          const sid = readSessionId()
          if (sid) client.trackEvent({ session_id: sid, event_type: 'remove_from_cart' as never, event_data: { product_id: productId, product_name: productName } }).catch(() => {})
        }
      : undefined

    const cartStore = createCartStore(client, resolvedConfig.storagePrefix, onAddToCart, onRemoveFromCart, syncCartToSession)
    const authStore = createAuthStore(client, resolvedConfig.storagePrefix)

    return {
      client,
      config: resolvedConfig,
      cartStore,
      authStore,
      products,
      pixelManager: null,
    }
    // Only recreate when identity changes — storeId + apiKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, apiKey])

  // Update products and pixelManager on the context when they change
  const value = useMemo<WhaleContextValue>(
    () => ({ ...ctx, products, pixelManager }),
    [ctx, products, pixelManager]
  )

  // Merge store-fetched theme with manual overrides (manual takes precedence)
  const mergedTheme = useMemo<Partial<ThemeTokens> | undefined>(() => {
    if (!storeTheme && !themeProp) return undefined
    return { ...storeTheme, ...themeProp }
  }, [storeTheme, themeProp])

  return (
    <WhaleContext.Provider value={value}>
      <ThemeProvider theme={mergedTheme}>
        <AuthInitializer />
        <CartInitializer />
        <AnalyticsTracker pathname={pathname} />
        <PixelInitializer onReady={handlePixelReady} onTheme={handleTheme} />
        <BehavioralTrackerComponent pathname={pathname} />
        <FingerprintCollector />
        <SessionRecorderComponent />
        {children}
      </ThemeProvider>
    </WhaleContext.Provider>
  )
}
