'use client'

import { useContext, useRef, useEffect } from 'react'
import { WhaleContext } from '../context.js'
import { collectFingerprint } from '../../fingerprint/collector.js'
import { resilientSend } from '../../resilient-send.js'

const SESSION_KEY_SUFFIX = '-analytics-session'

export function FingerprintCollector() {
  const ctx = useContext(WhaleContext)
  const sent = useRef(false)

  useEffect(() => {
    if (!ctx || sent.current) return
    if (!ctx.config.trackingEnabled) return
    if (typeof window === 'undefined') return
    sent.current = true

    const { config, client } = ctx
    const prefix = config.storagePrefix
    const fpKey = `${prefix}-fingerprint-sent`

    const linkFingerprintToSession = (fingerprintId: string) => {
      try {
        const sessionRaw = localStorage.getItem(`${prefix}${SESSION_KEY_SUFFIX}`)
        if (sessionRaw) {
          const session = JSON.parse(sessionRaw)
          client.updateSession(session.id, { fingerprint_id: fingerprintId }).catch(() => {})
        }
      } catch {}
    }

    // Check if already sent this session
    const existing = localStorage.getItem(fpKey)
    if (existing) {
      linkFingerprintToSession(existing)
      return
    }

    // Collect and send
    collectFingerprint()
      .then(async (fp) => {
        const baseUrl = config.proxyPath
        const url = `${baseUrl}/v1/stores/${config.storeId}/storefront/fingerprints`

        // Send fingerprint to gateway
        await resilientSend(url, fp, {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
        }).catch(() => {})

        // Store fingerprint_id locally
        localStorage.setItem(fpKey, fp.fingerprint_id)

        // Link to current session
        linkFingerprintToSession(fp.fingerprint_id)
      })
      .catch(() => {})
  }, [ctx])

  return null
}
