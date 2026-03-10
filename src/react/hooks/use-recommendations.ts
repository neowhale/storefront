'use client'

import { useContext, useState, useEffect, useCallback } from 'react'
import { WhaleContext } from '../context.js'
import type { Recommendation } from '../../types.js'

export function useRecommendations(params?: {
  product_id?: string
  customer_id?: string
  limit?: number
  type?: 'similar' | 'frequently_bought_together' | 'personalized'
}) {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useRecommendations must be used within <WhaleProvider>')

  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Stable dependency key to avoid infinite re-renders
  const productId = params?.product_id
  const customerId = params?.customer_id
  const limit = params?.limit
  const type = params?.type

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await ctx.client.getRecommendations({
        product_id: productId,
        customer_id: customerId,
        limit,
        type,
      })
      setRecommendations(data.data)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      setRecommendations([])
    } finally {
      setLoading(false)
    }
  }, [ctx.client, productId, customerId, limit, type])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { recommendations, loading, error, refresh }
}
