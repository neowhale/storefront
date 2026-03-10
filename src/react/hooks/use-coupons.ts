'use client'

import { useContext, useState, useCallback } from 'react'
import { WhaleContext } from '../context.js'
import type { CouponValidation, Cart } from '../../types.js'

export function useCoupons() {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useCoupons must be used within <WhaleProvider>')

  const [validation, setValidation] = useState<CouponValidation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const validate = useCallback(async (code: string, cartId?: string): Promise<CouponValidation> => {
    setLoading(true)
    setError(null)
    try {
      const result = await ctx.client.validateCoupon(code, cartId ? { cart_id: cartId } : undefined)
      setValidation(result)
      return result
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      setValidation(null)
      throw e
    } finally {
      setLoading(false)
    }
  }, [ctx.client])

  const apply = useCallback(async (cartId: string, code: string): Promise<Cart> => {
    setLoading(true)
    setError(null)
    try {
      const cart = await ctx.client.applyCoupon(cartId, code)
      return cart
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      throw e
    } finally {
      setLoading(false)
    }
  }, [ctx.client])

  const remove = useCallback(async (cartId: string): Promise<Cart> => {
    setLoading(true)
    setError(null)
    try {
      const cart = await ctx.client.removeCoupon(cartId)
      setValidation(null)
      return cart
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      throw e
    } finally {
      setLoading(false)
    }
  }, [ctx.client])

  const clear = useCallback(() => {
    setValidation(null)
    setError(null)
  }, [])

  return { validation, loading, error, validate, apply, remove, clear }
}
