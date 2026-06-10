import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEmergencyWs } from '@/hooks/use-emergency-ws'

vi.mock('@/lib/cookies', () => ({
  getCookie: vi.fn(() => 'test-token'),
}))

vi.mock('@/lib/jwt', () => ({
  isTokenExpired: vi.fn(() => false),
}))

vi.mock('@/lib/api-client', () => ({
  refreshAccessToken: vi.fn(async () => 'refreshed-token'),
  default: {},
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

import { getCookie } from '@/lib/cookies'
import { isTokenExpired } from '@/lib/jwt'
import { refreshAccessToken } from '@/lib/api-client'
import { toast } from 'sonner'

type MockWs = {
  onopen?: () => void
  onmessage?: (e: { data: string }) => void
  onclose?: (e?: { code?: number }) => void
  onerror?: () => void
  close: ReturnType<typeof vi.fn>
  url?: string
}

let mockWsInstances: MockWs[] = []

/**
 * Flush any pending microtasks so the async `connect()` chain
 * (cookie read → optional refresh → new WebSocket) completes before
 * we make assertions.
 */
async function flushAsync() {
  // Run microtasks
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

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
    vi.mocked(refreshAccessToken).mockResolvedValue('refreshed-token')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('connects with token from cookie', async () => {
    renderHook(() => useEmergencyWs())
    await act(async () => { await flushAsync() })
    expect(mockWsInstances).toHaveLength(1)
    expect(mockWsInstances[0].url).toContain('token=test-token')
  })

  it('does not connect when no token', async () => {
    vi.mocked(getCookie).mockReturnValue(null as unknown as string)
    renderHook(() => useEmergencyWs())
    await act(async () => { await flushAsync() })
    expect(mockWsInstances).toHaveLength(0)
  })

  it('does not connect when disabled', async () => {
    renderHook(() => useEmergencyWs({ enabled: false }))
    await act(async () => { await flushAsync() })
    expect(mockWsInstances).toHaveLength(0)
  })

  it('refreshes the token before connecting when current token is expired', async () => {
    vi.mocked(isTokenExpired).mockReturnValue(true)
    renderHook(() => useEmergencyWs())
    await act(async () => { await flushAsync() })
    expect(refreshAccessToken).toHaveBeenCalled()
    expect(mockWsInstances).toHaveLength(1)
    expect(mockWsInstances[0].url).toContain('token=refreshed-token')
  })

  it('does not connect when token refresh fails', async () => {
    vi.mocked(isTokenExpired).mockReturnValue(true)
    vi.mocked(refreshAccessToken).mockResolvedValueOnce(null)
    renderHook(() => useEmergencyWs())
    await act(async () => { await flushAsync() })
    expect(mockWsInstances).toHaveLength(0)
  })

  it('sets connected to true on open', async () => {
    const { result } = renderHook(() => useEmergencyWs())
    await act(async () => { await flushAsync() })
    expect(result.current.connected).toBe(false)
    act(() => { mockWsInstances[0].onopen?.() })
    expect(result.current.connected).toBe(true)
  })

  it('calls onAlert and shows toast on alert message', async () => {
    const onAlert = vi.fn()
    renderHook(() => useEmergencyWs({ onAlert }))
    await act(async () => { await flushAsync() })

    act(() => { mockWsInstances[0].onopen?.() })

    const alertData = { id: '1', alert_type: 'panic', device: 'd1', resolved: false, resolved_at: null, created_at: '2026-01-01' }
    act(() => {
      mockWsInstances[0].onmessage?.({ data: JSON.stringify({ type: 'alert', data: alertData }) })
    })

    expect(onAlert).toHaveBeenCalledWith(alertData)
    expect(toast.error).toHaveBeenCalledWith('🚨 Panic signal!', { duration: 10000 })
  })

  it('calls onResolved and shows success toast on resolved message', async () => {
    const onResolved = vi.fn()
    renderHook(() => useEmergencyWs({ onResolved }))
    await act(async () => { await flushAsync() })

    act(() => { mockWsInstances[0].onopen?.() })

    const alertData = { id: '1', alert_type: 'panic', device: 'd1', resolved: true, resolved_at: '2026-01-01', created_at: '2026-01-01' }
    act(() => {
      mockWsInstances[0].onmessage?.({ data: JSON.stringify({ type: 'resolved', data: alertData }) })
    })

    expect(onResolved).toHaveBeenCalledWith(alertData)
    expect(toast.success).toHaveBeenCalledWith('✅ Favqulodda holat bekor qilindi', { duration: 5000 })
  })

  it('reconnects with exponential backoff on close', async () => {
    renderHook(() => useEmergencyWs())
    await act(async () => { await flushAsync() })

    // First close → reconnect after 1s
    act(() => { mockWsInstances[0].onclose?.({ code: 1006 }) })
    expect(mockWsInstances).toHaveLength(1)

    await act(async () => { vi.advanceTimersByTime(1000); await flushAsync() })
    expect(mockWsInstances).toHaveLength(2)

    // Second close → reconnect after 2s
    act(() => { mockWsInstances[1].onclose?.({ code: 1006 }) })
    await act(async () => { vi.advanceTimersByTime(1000); await flushAsync() })
    expect(mockWsInstances).toHaveLength(2) // not yet
    await act(async () => { vi.advanceTimersByTime(1000); await flushAsync() })
    expect(mockWsInstances).toHaveLength(3)
  })

  it('refreshes the token and reconnects quickly on 4401 auth failure', async () => {
    renderHook(() => useEmergencyWs())
    await act(async () => { await flushAsync() })
    expect(mockWsInstances).toHaveLength(1)

    // Simulate the backend closing with code 4401 (token rejected)
    vi.mocked(refreshAccessToken).mockClear()
    vi.mocked(isTokenExpired).mockReturnValue(true)
    act(() => { mockWsInstances[0].onclose?.({ code: 4401 }) })

    // Auth failure path should retry after a short 500ms delay, not seconds
    await act(async () => { vi.advanceTimersByTime(500); await flushAsync() })
    expect(refreshAccessToken).toHaveBeenCalled()
    expect(mockWsInstances).toHaveLength(2)
    expect(mockWsInstances[1].url).toContain('token=refreshed-token')
  })

  it('closes WebSocket on unmount', async () => {
    const { unmount } = renderHook(() => useEmergencyWs())
    await act(async () => { await flushAsync() })
    unmount()
    expect(mockWsInstances[0].close).toHaveBeenCalled()
  })

  it('ignores malformed messages', async () => {
    const onAlert = vi.fn()
    renderHook(() => useEmergencyWs({ onAlert }))
    await act(async () => { await flushAsync() })

    act(() => {
      mockWsInstances[0].onmessage?.({ data: 'not json' })
    })

    expect(onAlert).not.toHaveBeenCalled()
  })
})
