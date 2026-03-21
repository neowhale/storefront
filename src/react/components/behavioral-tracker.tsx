'use client'

import { useContext, useRef, useEffect } from 'react'
import { WhaleContext } from '../context.js'
import { BehavioralTracker } from '../../behavioral/tracker.js'
import type { BehavioralBatch } from '../../behavioral/types.js'
import { resilientSend } from '../../resilient-send.js'

const SESSION_KEY_SUFFIX = '-analytics-session'
const VISITOR_KEY_SUFFIX = '-visitor-id'
const MAX_SESSION_WAIT_MS = 10_000
const SESSION_POLL_MS = 500

export function BehavioralTrackerComponent({ pathname }: { pathname: string | null }) {
  const ctx = useContext(WhaleContext)
  const trackerRef = useRef<BehavioralTracker | null>(null)
  const initRef = useRef(false)

  // Mount once — never re-run this effect
  useEffect(() => {
    if (!ctx || !ctx.config.trackingEnabled) return
    if (typeof window === 'undefined') return

    const { config } = ctx
    let cancelled = false
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    const startTime = Date.now()

    const readSessionId = (): string | null => {
      const key = `${config.storagePrefix}${SESSION_KEY_SUFFIX}`
      try {
        const raw = localStorage.getItem(key)
        if (raw) {
          const stored = JSON.parse(raw)
          return stored.id ?? null
        }
      } catch {}
      return null
    }

    const readVisitorId = (): string => {
      const key = `${config.storagePrefix}${VISITOR_KEY_SUFFIX}`
      try {
        const existing = localStorage.getItem(key)
        if (existing) return existing
      } catch {}
      const id = `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      try { localStorage.setItem(key, id) } catch {}
      return id
    }

    const tryInit = () => {
      if (cancelled) return

      const sessionId = readSessionId()
      if (!sessionId) {
        if (Date.now() - startTime < MAX_SESSION_WAIT_MS) {
          pollTimer = setTimeout(tryInit, SESSION_POLL_MS)
        }
        return
      }

      initRef.current = true
      const visitorId = readVisitorId()
      const baseUrl = config.proxyPath
      const endpoint = `${baseUrl}/v1/stores/${config.storeId}/storefront/behavioral`

      const sendBatch = async (batch: BehavioralBatch): Promise<void> => {
        await resilientSend(endpoint, batch, {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
        })
      }

      const tracker = new BehavioralTracker({ sendBatch, sessionId, visitorId })
      tracker.start()
      trackerRef.current = tracker
    }

    tryInit()

    return () => {
      cancelled = true
      if (pollTimer) clearTimeout(pollTimer)
      if (trackerRef.current) {
        trackerRef.current.stop()
        trackerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update page context on pathname change
  useEffect(() => {
    if (!trackerRef.current || !pathname) return
    const url = typeof window !== 'undefined' ? window.location.href : pathname
    trackerRef.current.setPageContext(url, pathname)
  }, [pathname])

  return null
}
