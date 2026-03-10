'use client'

import { useContext, useState, useEffect, useCallback } from 'react'
import { WhaleContext } from '../context.js'
import type { Location } from '../../types.js'

export function useLocations() {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useLocations must be used within <WhaleProvider>')

  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await ctx.client.listLocations()
      setLocations(data.data)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      setLocations([])
    } finally {
      setLoading(false)
    }
  }, [ctx.client])

  useEffect(() => {
    refresh()
  }, [refresh])

  const getLocation = useCallback(async (id: string) => {
    return ctx.client.getLocation(id)
  }, [ctx.client])

  return { locations, loading, error, refresh, getLocation }
}
