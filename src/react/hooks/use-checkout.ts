'use client'

import { useContext, useState, useCallback } from 'react'
import { WhaleContext } from '../context.js'
import type { CheckoutSession, Order, Address, PaymentData } from '../../types.js'
import { useAnalytics } from './use-analytics.js'

export function useCheckout() {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useCheckout must be used within <WhaleProvider>')

  const { visitorId, getOrCreateSession: getAnalyticsSession } = useAnalytics()

  const [session, setSession] = useState<CheckoutSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createSession = useCallback(async (params: {
    cart_id: string
    customer_email?: string
    shipping_address?: Address
    billing_address?: Address
    shipping_method_id?: string
    coupon_code?: string
    loyalty_reward_id?: string
    selected_product_id?: string
  }) => {
    setLoading(true)
    setError(null)
    try {
      // Auto-inject attribution from analytics session
      const analyticsSessionId = await getAnalyticsSession().catch(() => undefined)
      const data = await ctx.client.createCheckoutSession({
        ...params,
        visitor_id: visitorId,
        session_id: analyticsSessionId?.startsWith('local-') ? undefined : analyticsSessionId,
      })
      setSession(data)
      return data
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      throw e
    } finally {
      setLoading(false)
    }
  }, [ctx.client])

  const updateSession = useCallback(async (params: {
    customer_email?: string
    shipping_address?: Address
    billing_address?: Address
    shipping_method_id?: string
    coupon_code?: string
  }) => {
    if (!session) throw new Error('No active checkout session')
    setLoading(true)
    setError(null)
    try {
      const data = await ctx.client.updateCheckoutSession(session.id, params)
      setSession(data)
      return data
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      throw e
    } finally {
      setLoading(false)
    }
  }, [ctx.client, session])

  const complete = useCallback(async (payment?: PaymentData, opts?: {
    loyalty_reward_id?: string
    selected_product_id?: string
  }): Promise<Order> => {
    if (!session) throw new Error('No active checkout session')
    setLoading(true)
    setError(null)
    try {
      const order = await ctx.client.completeCheckout(session.id, payment, opts)
      setSession(null)
      return order
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      throw e
    } finally {
      setLoading(false)
    }
  }, [ctx.client, session])

  const reset = useCallback(() => {
    setSession(null)
    setError(null)
  }, [])

  return { session, loading, error, createSession, updateSession, complete, reset }
}
