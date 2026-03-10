'use client'

import { useContext, useState, useEffect, useCallback } from 'react'
import { useStore } from 'zustand'
import { WhaleContext } from '../context.js'
import type { WishlistItem } from '../../types.js'

export function useWishlist() {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useWishlist must be used within <WhaleProvider>')

  const customer = useStore(ctx.authStore, (s) => s.customer)
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (!customer?.id) {
      setItems([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await ctx.client.listWishlistItems(customer.id)
      setItems(data.data)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [customer?.id, ctx.client])

  useEffect(() => {
    refresh()
  }, [refresh])

  const add = useCallback(async (productId: string) => {
    if (!customer?.id) throw new Error('Not authenticated')
    setError(null)
    try {
      const item = await ctx.client.addWishlistItem(customer.id, productId)
      setItems((prev) => [...prev, item])
      return item
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      throw e
    }
  }, [customer?.id, ctx.client])

  const remove = useCallback(async (productId: string) => {
    if (!customer?.id) throw new Error('Not authenticated')
    setError(null)
    try {
      await ctx.client.removeWishlistItem(customer.id, productId)
      setItems((prev) => prev.filter((item) => item.product_id !== productId))
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      throw e
    }
  }, [customer?.id, ctx.client])

  const has = useCallback((productId: string): boolean => {
    return items.some((item) => item.product_id === productId)
  }, [items])

  const toggle = useCallback(async (productId: string) => {
    if (has(productId)) {
      await remove(productId)
    } else {
      await add(productId)
    }
  }, [has, add, remove])

  return { items, loading, error, refresh, add, remove, has, toggle }
}
