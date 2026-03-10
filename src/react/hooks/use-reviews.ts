'use client'

import { useContext, useState, useEffect, useCallback } from 'react'
import { WhaleContext } from '../context.js'
import type { Review, ReviewSummary } from '../../types.js'

export function useReviews(productId: string | null | undefined) {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useReviews must be used within <WhaleProvider>')

  const [reviews, setReviews] = useState<Review[]>([])
  const [summary, setSummary] = useState<ReviewSummary | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (!productId) {
      setReviews([])
      setSummary(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await ctx.client.listProductReviews(productId)
      setReviews(data.data)
      setSummary(data.summary ?? null)
      setHasMore(data.has_more)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      setReviews([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [productId, ctx.client])

  useEffect(() => {
    refresh()
  }, [refresh])

  const loadMore = useCallback(async () => {
    if (!productId || !hasMore || reviews.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const cursor = reviews[reviews.length - 1].id
      const data = await ctx.client.listProductReviews(productId, { starting_after: cursor })
      setReviews((prev) => [...prev, ...data.data])
      setHasMore(data.has_more)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [productId, ctx.client, hasMore, reviews])

  const submit = useCallback(async (data: {
    rating: number
    title?: string
    body?: string
    customer_name?: string
  }) => {
    if (!productId) throw new Error('No product ID provided')
    const review = await ctx.client.submitReview(productId, data)
    await refresh()
    return review
  }, [productId, ctx.client, refresh])

  return { reviews, summary, hasMore, loading, error, refresh, loadMore, submit }
}
