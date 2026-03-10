'use client'

import { useEffect, useRef, useContext } from 'react'
import { WhaleContext } from '../context.js'
import { PixelManager } from '../../pixels/pixel-manager.js'
import type { StorefrontConfig } from '../../pixels/types.js'

export interface PixelInitializerProps {
  onReady: (manager: PixelManager) => void
  onTheme?: (theme: Record<string, unknown>) => void
}

/**
 * Fetches storefront config on mount and initializes pixel providers + theme.
 * Sets pixelManager on context so useAnalytics can dispatch events to it.
 * If the config includes a `theme` field, calls onTheme so the provider can apply it.
 * Rendered internally by WhaleProvider — storefronts don't need to add this manually.
 */
export function PixelInitializer({ onReady, onTheme }: PixelInitializerProps) {
  const ctx = useContext(WhaleContext)
  const initialized = useRef(false)

  useEffect(() => {
    if (!ctx || initialized.current) return
    if (typeof window === 'undefined') return
    initialized.current = true

    const { client } = ctx

    client.fetchStorefrontConfig().then(async (config: StorefrontConfig) => {
      // Apply theme if present
      if (config.theme && onTheme) {
        onTheme(config.theme)
      }

      // Initialize pixels if tracking is enabled
      if (ctx.config.trackingEnabled && config.pixels && config.pixels.length > 0) {
        const manager = new PixelManager(config.pixels)
        await manager.initialize()
        onReady(manager)
      }
    }).catch(() => {
      // Storefront config fetch failed — degrade silently
    })
  }, [ctx, onReady, onTheme])

  return null
}
