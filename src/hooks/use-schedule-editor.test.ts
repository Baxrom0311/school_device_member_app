import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useScheduleEditor } from './use-schedule-editor'
import type { Schedule } from '@/lib/device-api'

vi.mock('@/lib/device-api', () => ({
  deviceApi: {
    updateSchedule: vi.fn(),
    createSchedule: vi.fn(),
    syncSchedule: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { deviceApi } from '@/lib/device-api'

const mockSchedule: Schedule = {
  id: 's1',
  device: 'd1',
  device_id: 'AABBCCDDEEFF',
  device_name: 'Test',
  times: ['08:00', '08:45', '09:00', '09:45'],
  times_count: 4,
  days_mask: 0x1f,
  is_active: true,
  timezone: 'Asia/Tashkent',
  version: 1,
  synced_at: null,
  sync_pending: false,
  bell_duration: 3000,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useScheduleEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes pairs from schedule times', async () => {
    const { result } = renderHook(
      () => useScheduleEditor({ deviceId: 'd1', schedule: mockSchedule }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.pairs).toEqual([
        { entry: '08:00', exit: '08:45' },
        { entry: '09:00', exit: '09:45' },
      ])
    })
    expect(result.current.isActive).toBe(true)
    expect(result.current.hasChanges).toBe(false)
  })

  it('detects changes when pairs are modified', () => {
    const { result } = renderHook(
      () => useScheduleEditor({ deviceId: 'd1', schedule: mockSchedule }),
      { wrapper: createWrapper() }
    )

    act(() => { result.current.handlePairChange(0, 'entry', '07:30') })

    expect(result.current.pairs[0].entry).toBe('07:30')
    expect(result.current.hasChanges).toBe(true)
  })

  it('adds a new pair', () => {
    const { result } = renderHook(
      () => useScheduleEditor({ deviceId: 'd1', schedule: mockSchedule }),
      { wrapper: createWrapper() }
    )

    act(() => { result.current.addPair() })

    expect(result.current.pairs).toHaveLength(3)
    // New pair entry should be 5 min after last exit (09:45 → 09:50)
    expect(result.current.pairs[2].entry).toBe('09:50')
  })

  it('removes a pair', () => {
    const { result } = renderHook(
      () => useScheduleEditor({ deviceId: 'd1', schedule: mockSchedule }),
      { wrapper: createWrapper() }
    )

    act(() => { result.current.removePair(0) })

    expect(result.current.pairs).toHaveLength(1)
    expect(result.current.pairs[0]).toEqual({ entry: '09:00', exit: '09:45' })
  })

  it('clears all pairs', () => {
    const { result } = renderHook(
      () => useScheduleEditor({ deviceId: 'd1', schedule: mockSchedule }),
      { wrapper: createWrapper() }
    )

    act(() => { result.current.clearAll() })

    expect(result.current.pairs).toHaveLength(0)
    expect(result.current.hasChanges).toBe(true)
  })

  it('handles generated schedule', () => {
    const { result } = renderHook(
      () => useScheduleEditor({ deviceId: 'd1', schedule: mockSchedule }),
      { wrapper: createWrapper() }
    )

    const newPairs = [{ entry: '10:00', exit: '10:45' }]
    act(() => { result.current.handleGeneratedSchedule(newPairs) })

    expect(result.current.pairs).toEqual(newPairs)
  })

  it('calls updateSchedule on save when schedule exists', async () => {
    vi.mocked(deviceApi.updateSchedule).mockResolvedValue(mockSchedule)

    const { result } = renderHook(
      () => useScheduleEditor({ deviceId: 'd1', schedule: mockSchedule }),
      { wrapper: createWrapper() }
    )

    act(() => { result.current.handlePairChange(0, 'entry', '07:30') })
    await act(async () => { result.current.handleSave() })

	    await vi.waitFor(() => {
	      expect(deviceApi.updateSchedule).toHaveBeenCalledWith('s1', {
	        times: ['07:30', '08:45', '09:00', '09:45'],
	        is_active: true,
	        days_mask: 0x1f,
	        bell_duration: 3000,
	      })
	    })
  })

  it('calls createSchedule on save when no schedule exists', async () => {
    vi.mocked(deviceApi.createSchedule).mockResolvedValue(mockSchedule)

    const { result } = renderHook(
      () => useScheduleEditor({ deviceId: 'd1', schedule: null }),
      { wrapper: createWrapper() }
    )

    act(() => { result.current.addPair() })
    act(() => { result.current.handlePairChange(0, 'entry', '08:00') })
    act(() => { result.current.handlePairChange(0, 'exit', '08:45') })
    await act(async () => { result.current.handleSave() })

	    await vi.waitFor(() => {
	      expect(deviceApi.createSchedule).toHaveBeenCalledWith('d1', {
	        times: ['08:00', '08:45'],
	        is_active: true,
	        days_mask: 0x1f,
	        bell_duration: 3000,
	      })
	    })
  })
})
