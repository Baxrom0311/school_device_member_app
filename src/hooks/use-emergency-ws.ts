import { useEffect, useRef, useCallback, useState } from 'react'
import { getCookie } from '@/lib/cookies'
import { isTokenExpired } from '@/lib/jwt'
import { refreshAccessToken } from '@/lib/api-client'
import { toast } from 'sonner'
import type { DeviceAlert } from '@/lib/device-api'

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'
const MAX_BACKOFF = 30000

/**
 * WebSocket close codes used by the backend's auth middleware.
 * 4401 = token rejected (expired/invalid). On this code we attempt a refresh
 * before reconnecting; otherwise we use plain exponential backoff.
 */
const WS_AUTH_FAILURE_CODE = 4401

type EmergencyEvent =
  | { type: 'alert'; data: DeviceAlert }
  | { type: 'resolved'; data: DeviceAlert }

interface UseEmergencyWsOptions {
  onAlert?: (alert: DeviceAlert) => void
  onResolved?: (alert: DeviceAlert) => void
  enabled?: boolean
}

/**
 * Resolve the access token to use for the WebSocket connection.
 *
 * - If no token exists, return null (caller should not connect).
 * - If the token is expired, try to refresh it.
 * - Otherwise return the existing token.
 */
async function resolveWsToken(): Promise<string | null> {
  const current = getCookie('access_token')
  if (!current) return null
  if (!isTokenExpired(current)) return current
  // Token is expired — refresh before connecting
  return await refreshAccessToken()
}

export function useEmergencyWs({ onAlert, onResolved, enabled = true }: UseEmergencyWsOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const retriesRef = useRef(0)
  const onAlertRef = useRef(onAlert)
  const onResolvedRef = useRef(onResolved)
  const cancelledRef = useRef(false)
  // `connect` is referenced from inside its own setTimeout callback. We hold
  // it via a ref to avoid the "Cannot access variable before it is declared"
  // lint error and so the timer always sees the latest closure.
  const connectRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const [connected, setConnected] = useState(false)

  // Keep callback refs fresh without triggering reconnect. Doing this in an
  // effect (not at render time) satisfies React's "no ref mutation during
  // render" rule.
  useEffect(() => {
    onAlertRef.current = onAlert
    onResolvedRef.current = onResolved
  }, [onAlert, onResolved])

  const connect = useCallback(async () => {
    if (cancelledRef.current || !enabled) return

    const token = await resolveWsToken()
    if (!token || cancelledRef.current) return

    const url = `${WS_BASE_URL}/alerts/?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      retriesRef.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const msg: EmergencyEvent = JSON.parse(event.data)
        if (msg.type === 'alert' && msg.data) {
          onAlertRef.current?.(msg.data)
          const labels: Record<string, string> = {
            panic: '🚨 Panic signal!',
            lockdown: '🔒 Lockdown yoqildi!',
            emergency_ring: '🔔 Favqulodda signal!',
            offline: '📡 Qurilma offline',
          }
          toast.error(labels[msg.data.alert_type] || 'Yangi ogohlantirish', {
            duration: 10000,
          })
        } else if (msg.type === 'resolved' && msg.data) {
          onResolvedRef.current?.(msg.data)
          toast.success('✅ Favqulodda holat bekor qilindi', { duration: 5000 })
        }
      } catch { /* ignore malformed messages */ }
    }

    ws.onclose = (event) => {
      setConnected(false)
      if (cancelledRef.current) return

      // 4401: backend rejected our token. Try to refresh on the next attempt.
      // We don't reset retries to zero here because we still want backoff if
      // refresh keeps failing (e.g. revoked refresh token).
      const isAuthFailure = event.code === WS_AUTH_FAILURE_CODE

      const delay = isAuthFailure
        ? 500 // small delay then retry with a fresh token
        : Math.min(1000 * 2 ** retriesRef.current, MAX_BACKOFF)
      retriesRef.current++
      reconnectTimer.current = setTimeout(() => {
        // Errors from the inner connect() are handled in this same onclose
        // path on the next attempt; no need to await.
        void connectRef.current()
      }, delay)
    }

    ws.onerror = () => ws.close()
  }, [enabled])

  // Keep connectRef pointing at the latest connect() so the setTimeout
  // callback above always invokes the current closure.
  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    cancelledRef.current = false
    void connect()
    return () => {
      cancelledRef.current = true
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { connected }
}
