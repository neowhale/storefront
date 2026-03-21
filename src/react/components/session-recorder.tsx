'use client'

import { useContext, useRef, useEffect } from 'react'
import { WhaleContext } from '../context.js'
import { SessionRecorder } from '../../recording/recorder.js'
import type { RecordingEvent } from '../../recording/recorder.js'
import { resilientSend } from '../../resilient-send.js'

const SESSION_KEY_SUFFIX = '-analytics-session'
const VISITOR_KEY_SUFFIX = '-visitor-id'
const MAX_SESSION_WAIT_MS = 10_000
const SESSION_POLL_MS = 500

export function SessionRecorderComponent() {
  const ctx = useContext(WhaleContext)
  const recorderRef = useRef<SessionRecorder | null>(null)
  const sampledRef = useRef<boolean | null>(null)
  const initRef = useRef(false)

  useEffect(() => {
    if (!ctx || initRef.current) return
    if (!ctx.config.trackingEnabled) return
    if (typeof window === 'undefined') return

    // Determine sampling once per component lifetime
    if (sampledRef.current === null) {
      sampledRef.current = Math.random() < ctx.config.recordingRate
    }
    if (!sampledRef.current) return

    const { config } = ctx
    const prefix = config.storagePrefix
    let cancelled = false
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    const startTime = Date.now()

    const tryInit = () => {
      if (cancelled) return

      let sessionId: string | null = null
      try {
        const sessionRaw = localStorage.getItem(`${prefix}${SESSION_KEY_SUFFIX}`)
        if (sessionRaw) {
          const session = JSON.parse(sessionRaw)
          sessionId = session.id || null
        }
      } catch {}

      if (!sessionId) {
        if (Date.now() - startTime < MAX_SESSION_WAIT_MS) {
          pollTimer = setTimeout(tryInit, SESSION_POLL_MS)
          return
        }
        return
      }

      initRef.current = true
      const visitorId = (() => {
        try {
          return localStorage.getItem(`${prefix}${VISITOR_KEY_SUFFIX}`) || 'unknown'
        } catch {
          return 'unknown'
        }
      })()

      const baseUrl = config.proxyPath
      const url = `${baseUrl}/v1/stores/${config.storeId}/storefront/recordings`
      const sid = sessionId

      const recorder = new SessionRecorder({
        sendChunk: async (events: RecordingEvent[], sequence: number) => {
          await resilientSend(url, {
            session_id: sid,
            visitor_id: visitorId,
            events,
            sequence,
            started_at: sequence === 0 ? new Date().toISOString() : undefined,
          }, {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
          })
        },
      })

      recorder.start()
      recorderRef.current = recorder
    }

    tryInit()

    return () => {
      cancelled = true
      if (pollTimer) clearTimeout(pollTimer)
      if (recorderRef.current) {
        recorderRef.current.stop()
        recorderRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
