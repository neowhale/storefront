'use client'

import { useContext, useState, useCallback } from 'react'
import { WhaleContext } from '../context.js'
import type { DealValidation, Cart } from '../../types.js'

export function useDeals() {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useDeals must be used within <WhaleProvider>')

  const [validation, setValidation] = useState<DealValidation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const validate = useCallback(async (code: string, cartId?: string): Promise<DealValidation> => {
    setLoading(true)
    setError(null)
    try {
      const result = await ctx.client.validateDeal(code, cartId ? { cart_id: cartId } : undefined)
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
      const cart = await ctx.client.applyDeal(cartId, code)
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
      const cart = await ctx.client.removeDeal(cartId)
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

/** @deprecated Use useDeals instead */
export const useCoupons = useDeals
