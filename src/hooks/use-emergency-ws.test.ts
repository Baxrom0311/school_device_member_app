import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEmergencyWs } from '@/hooks/use-emergency-ws'

vi.mock('@/lib/cookies', () => ({
  getCookie: vi.fn(() => 'test-token'),
}))

vi.mock('@/lib/jwt', () => ({
  isTokenExpired: vi.fn(() => false),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

import { getCookie } from '@/lib/cookies'
import { isTokenExpired } from '@/lib/jwt'
import { toast } from 'sonner'

type MockWs = {
  onopen?: () => void
  onmessage?: (e: { data: string }) => void
  onclose?: () => void
  onerror?: () => void
  close: ReturnType<typeof vi.fn>
  url?: string
}

let mockWsInstances: MockWs[] = []

describe('useEmergencyWs', () => {
  beforeEach(() => {
    mockWsInstances = []
    vi.stubGlobal('WebSocket', vi.fn((url: string) => {
      const ws: MockWs = { close: vi.fn(), url }
      mockWsInstances.push(ws)
      return ws
    }))
    vi.useFakeTimers()
    vi.mocked(getCookie).mockReturnValue('test-token')
    vi.mocked(isTokenExpired).mockReturnValue(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('connects with token from cookie', () => {
    renderHook(() => useEmergencyWs())
    expect(mockWsInstances).toHaveLength(1)
    expect(mockWsInstances[0].url).toContain('token=test-token')
  })

  it('does not connect when no token', () => {
    vi.mocked(getCookie).mockReturnValue(null as unknown as string)
    renderHook(() => useEmergencyWs())
    expect(mockWsInstances).toHaveLength(0)
  })

  it('does not connect when disabled', () => {
    renderHook(() => useEmergencyWs({ enabled: false }))
    expect(mockWsInstances).toHaveLength(0)
  })

  it('does not connect when token is expired', () => {
    vi.mocked(isTokenExpired).mockReturnValue(true)
    renderHook(() => useEmergencyWs())
    expect(mockWsInstances).toHaveLength(0)
  })

  it('sets connected to true on open', () => {
    const { result } = renderHook(() => useEmergencyWs())
    expect(result.current.connected).toBe(false)
    act(() => { mockWsInstances[0].onopen?.() })
    expect(result.current.connected).toBe(true)
  })

  it('calls onAlert and shows toast on alert message', () => {
    const onAlert = vi.fn()
    renderHook(() => useEmergencyWs({ onAlert }))

    act(() => { mockWsInstances[0].onopen?.() })

    const alertData = { id: '1', alert_type: 'panic', device: 'd1', resolved: false, resolved_at: null, created_at: '2026-01-01' }
    act(() => {
      mockWsInstances[0].onmessage?.({ data: JSON.stringify({ type: 'alert', data: alertData }) })
    })

    expect(onAlert).toHaveBeenCalledWith(alertData)
    expect(toast.error).toHaveBeenCalledWith('🚨 Panic signal!', { duration: 10000 })
  })

  it('calls onResolved and shows success toast on resolved message', () => {
    const onResolved = vi.fn()
    renderHook(() => useEmergencyWs({ onResolved }))

    act(() => { mockWsInstances[0].onopen?.() })

    const alertData = { id: '1', alert_type: 'panic', device: 'd1', resolved: true, resolved_at: '2026-01-01', created_at: '2026-01-01' }
    act(() => {
      mockWsInstances[0].onmessage?.({ data: JSON.stringify({ type: 'resolved', data: alertData }) })
    })

    expect(onResolved).toHaveBeenCalledWith(alertData)
    expect(toast.success).toHaveBeenCalledWith('✅ Favqulodda holat bekor qilindi', { duration: 5000 })
  })

  it('reconnects with exponential backoff on close', () => {
    renderHook(() => useEmergencyWs())

    // First close → reconnect after 1s
    act(() => { mockWsInstances[0].onclose?.() })
    expect(mockWsInstances).toHaveLength(1)

    act(() => { vi.advanceTimersByTime(1000) })
    expect(mockWsInstances).toHaveLength(2)

    // Second close → reconnect after 2s
    act(() => { mockWsInstances[1].onclose?.() })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(mockWsInstances).toHaveLength(2) // not yet
    act(() => { vi.advanceTimersByTime(1000) })
    expect(mockWsInstances).toHaveLength(3)
  })

  it('resets retry count on successful open', () => {
    renderHook(() => useEmergencyWs())

    act(() => { mockWsInstances[0].onclose?.() })
    act(() => { vi.advanceTimersByTime(1000) })

    // Open successfully — retries reset
    act(() => { mockWsInstances[1].onopen?.() })

    // Close again → should be 1s delay (reset)
    act(() => { mockWsInstances[1].onclose?.() })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(mockWsInstances).toHaveLength(3)
  })

  it('closes WebSocket on unmount', () => {
    const { unmount } = renderHook(() => useEmergencyWs())
    unmount()
    expect(mockWsInstances[0].close).toHaveBeenCalled()
  })

  it('ignores malformed messages', () => {
    const onAlert = vi.fn()
    renderHook(() => useEmergencyWs({ onAlert }))

    act(() => {
      mockWsInstances[0].onmessage?.({ data: 'not json' })
    })

    expect(onAlert).not.toHaveBeenCalled()
  })
})
