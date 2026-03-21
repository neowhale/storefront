'use client'

import { useContext, useState, useEffect, useCallback } from 'react'
import { useStore } from 'zustand'
import { WhaleContext } from '../context.js'
import type { ReferralStatus } from '../../types.js'

export function useReferral() {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useReferral must be used within <WhaleProvider>')

  const customer = useStore(ctx.authStore, (s) => s.customer)
  const [status, setStatus] = useState<ReferralStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (!customer?.id) {
      setStatus(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await ctx.client.getReferralStatus(customer.id)
      setStatus(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [customer?.id, ctx.client])

  useEffect(() => {
    refresh()
  }, [refresh])

  const enroll = useCallback(async () => {
    if (!customer?.id) throw new Error('Not authenticated')
    setLoading(true)
    setError(null)
    try {
      const result = await ctx.client.enrollReferral(customer.id)
      await refresh()
      return result
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      throw e
    } finally {
      setLoading(false)
    }
  }, [customer?.id, ctx.client, refresh])

  const attributeReferral = useCallback(
    async (code: string) => {
      if (!customer?.id) throw new Error('Not authenticated')
      setLoading(true)
      setError(null)
      try {
        const result = await ctx.client.attributeReferral(customer.id, code)
        await refresh()
        return result
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        setError(e)
        throw e
      } finally {
        setLoading(false)
      }
    },
    [customer?.id, ctx.client, refresh],
  )

  // Auto-attribute if URL has ?code= OR localStorage has whale_ref_code
  // The code is persisted to localStorage on the /refer page so it survives the auth redirect
  useEffect(() => {
    if (!customer?.id || !status || status.referred_by) return
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code') || localStorage.getItem('whale_ref_code')
    if (!code) return
    ctx.client.attributeReferral(customer.id, code).then(() => {
      localStorage.removeItem('whale_ref_code')
      refresh()
    }).catch(() => {})
  }, [customer?.id, status, ctx.client, refresh])

  const share = useCallback(async () => {
    if (!status?.share_url) throw new Error('Not enrolled in referral program')
    const shareData = {
      title: 'Check this out!',
      text: `Use my referral code ${status.referral_code} for rewards!`,
      url: status.share_url,
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        // Fall through to clipboard
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(status.share_url)
    }
  }, [status])

  return {
    status,
    loading,
    error,
    enroll,
    refresh,
    share,
    attributeReferral,
    referralCode: status?.referral_code ?? null,
    shareUrl: status?.share_url ?? null,
    isEnrolled: status?.enrolled ?? false,
    referredBy: status?.referred_by ?? null,
  }
}
