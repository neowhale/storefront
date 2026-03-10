'use client'

import { useContext, useState, useEffect, useCallback } from 'react'
import { WhaleContext } from '../context.js'
import type { ShippingMethod, ShippingRate, Address } from '../../types.js'

export function useShipping() {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useShipping must be used within <WhaleProvider>')

  const [methods, setMethods] = useState<ShippingMethod[]>([])
  const [rates, setRates] = useState<ShippingRate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refreshMethods = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await ctx.client.listShippingMethods()
      setMethods(data.data)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      setMethods([])
    } finally {
      setLoading(false)
    }
  }, [ctx.client])

  useEffect(() => {
    refreshMethods()
  }, [refreshMethods])

  const calculateRates = useCallback(async (params: {
    cart_id: string
    shipping_address: Address
  }) => {
    setLoading(true)
    setError(null)
    try {
      const data = await ctx.client.calculateShippingRates(params)
      setRates(data.data)
      return data.data
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      setRates([])
      throw e
    } finally {
      setLoading(false)
    }
  }, [ctx.client])

  return { methods, rates, loading, error, refreshMethods, calculateRates }
}
