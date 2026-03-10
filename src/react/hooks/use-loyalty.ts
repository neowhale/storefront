'use client'

import { useContext, useState, useEffect, useCallback } from 'react'
import { useStore } from 'zustand'
import { WhaleContext } from '../context.js'
import type { LoyaltyAccount, LoyaltyReward, LoyaltyTransaction } from '../../types.js'

export function useLoyalty() {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useLoyalty must be used within <WhaleProvider>')

  const customer = useStore(ctx.authStore, (s) => s.customer)
  const [account, setAccount] = useState<LoyaltyAccount | null>(null)
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (!customer?.id) {
      setAccount(null)
      setRewards([])
      setTransactions([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [acct, rwds, txns] = await Promise.all([
        ctx.client.getLoyaltyAccount(customer.id),
        ctx.client.listLoyaltyRewards(),
        ctx.client.listLoyaltyTransactions(customer.id),
      ])
      setAccount(acct)
      setRewards(rwds.data)
      setTransactions(txns.data)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [customer?.id, ctx.client])

  useEffect(() => {
    refresh()
  }, [refresh])

  const redeemReward = useCallback(async (rewardId: string) => {
    if (!customer?.id) throw new Error('Not authenticated')
    const result = await ctx.client.redeemLoyaltyReward(customer.id, rewardId)
    await refresh()
    return result
  }, [customer?.id, ctx.client, refresh])

  return { account, rewards, transactions, loading, error, refresh, redeemReward }
}
