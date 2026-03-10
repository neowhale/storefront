'use client'

import { useContext, useState, useCallback } from 'react'
import { WhaleContext } from '../context.js'
import type { Product } from '../../types.js'

export interface SearchParams {
  query: string
  category_id?: string
  min_price?: number
  max_price?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  limit?: number
}

export function useSearch() {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useSearch must be used within <WhaleProvider>')

  const [results, setResults] = useState<Product[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [cursor, setCursor] = useState<string | undefined>(undefined)

  const search = useCallback(async (params: SearchParams) => {
    setLoading(true)
    setError(null)
    try {
      const data = await ctx.client.searchProducts(params)
      setResults(data.data)
      setHasMore(data.has_more)
      setCursor(data.data.length > 0 ? data.data[data.data.length - 1].id : undefined)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      setResults([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [ctx.client])

  const loadMore = useCallback(async (params: SearchParams) => {
    if (!cursor || !hasMore) return
    setLoading(true)
    setError(null)
    try {
      const data = await ctx.client.searchProducts({ ...params, starting_after: cursor })
      setResults((prev) => [...prev, ...data.data])
      setHasMore(data.has_more)
      setCursor(data.data.length > 0 ? data.data[data.data.length - 1].id : undefined)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [ctx.client, cursor, hasMore])

  const clear = useCallback(() => {
    setResults([])
    setHasMore(false)
    setCursor(undefined)
    setError(null)
  }, [])

  return { results, hasMore, loading, error, search, loadMore, clear }
}
