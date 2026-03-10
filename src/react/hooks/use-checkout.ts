'use client'

import { useContext, useState, useCallback } from 'react'
import { WhaleContext } from '../context.js'
import type { CheckoutSession, Order, Address, PaymentData } from '../../types.js'

export function useCheckout() {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useCheckout must be used within <WhaleProvider>')

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
  }) => {
    setLoading(true)
    setError(null)
    try {
      const data = await ctx.client.createCheckoutSession(params)
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

  const complete = useCallback(async (payment?: PaymentData): Promise<Order> => {
    if (!session) throw new Error('No active checkout session')
    setLoading(true)
    setError(null)
    try {
      const order = await ctx.client.completeCheckout(session.id, payment)
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
