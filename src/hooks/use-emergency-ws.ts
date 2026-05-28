import { useEffect, useRef, useCallback, useState } from 'react'
import { getCookie } from '@/lib/cookies'
import { isTokenExpired } from '@/lib/jwt'
import { toast } from 'sonner'
import type { DeviceAlert } from '@/lib/device-api'

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'
const MAX_BACKOFF = 30000

type EmergencyEvent =
  | { type: 'alert'; data: DeviceAlert }
  | { type: 'resolved'; data: DeviceAlert }

interface UseEmergencyWsOptions {
  onAlert?: (alert: DeviceAlert) => void
  onResolved?: (alert: DeviceAlert) => void
  enabled?: boolean
}

export function useEmergencyWs({ onAlert, onResolved, enabled = true }: UseEmergencyWsOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const retriesRef = useRef(0)
  const onAlertRef = useRef(onAlert)
  const onResolvedRef = useRef(onResolved)
  const [connected, setConnected] = useState(false)

  // Keep callback ref fresh without triggering reconnect
  onAlertRef.current = onAlert
  onResolvedRef.current = onResolved

  const connect = useCallback(() => {
    const token = getCookie('access_token')
    if (!token || !enabled) return

    // Don't attempt connection with expired token
    if (isTokenExpired(token)) return

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

    ws.onclose = () => {
      setConnected(false)
      const delay = Math.min(1000 * 2 ** retriesRef.current, MAX_BACKOFF)
      retriesRef.current++
      reconnectTimer.current = setTimeout(connect, delay)
    }

    ws.onerror = () => ws.close()
  }, [enabled])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { connected }
}
