import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deviceApi } from './device-api'

vi.mock('./api-client', () => ({
	default: {
		get: vi.fn(),
		post: vi.fn(),
		patch: vi.fn(),
	},
}))

import apiClient from './api-client'

const mockGet = vi.mocked(apiClient.get)
const mockPost = vi.mocked(apiClient.post)
const mockPatch = vi.mocked(apiClient.patch)

describe('deviceApi', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('getMyDevices', () => {
		it('calls correct endpoint', async () => {
			mockGet.mockResolvedValue({ data: { count: 0, results: [] } })
			const result = await deviceApi.getMyDevices()
			expect(mockGet).toHaveBeenCalledWith('/devices/my_devices/')
			expect(result.count).toBe(0)
		})
	})

	describe('claimDevice', () => {
		it('normalizes MAC address', async () => {
			mockPost.mockResolvedValue({
				data: { status: 'success', message: 'ok', device: {} },
			})
			await deviceApi.claimDevice({ device_id: 'aa:bb:cc:dd:ee:ff' })
			expect(mockPost).toHaveBeenCalledWith('/devices/claim/', {
				device_id: 'AABBCCDDEEFF',
				device_name: undefined,
			})
		})

		it('strips dashes from MAC', async () => {
			mockPost.mockResolvedValue({
				data: { status: 'success', message: 'ok', device: {} },
			})
			await deviceApi.claimDevice({ device_id: 'AA-BB-CC-DD-EE-FF' })
			expect(mockPost).toHaveBeenCalledWith('/devices/claim/', {
				device_id: 'AABBCCDDEEFF',
				device_name: undefined,
			})
		})
	})

	describe('getDevice', () => {
		it('calls correct endpoint with device id', async () => {
			mockGet.mockResolvedValue({ data: { id: 'd1', device_id: 'AABB' } })
			const result = await deviceApi.getDevice('d1')
			expect(mockGet).toHaveBeenCalledWith('/devices/d1/')
			expect(result.id).toBe('d1')
		})
	})

	describe('ringBell', () => {
		it('sends ring command with default duration', async () => {
			mockPost.mockResolvedValue({ data: {} })
			await deviceApi.ringBell('device-1')
			expect(mockPost).toHaveBeenCalledWith('/devices/device-1/ring/', {
				duration: 5,
			})
		})

		it('sends ring command with custom duration', async () => {
			mockPost.mockResolvedValue({ data: {} })
			await deviceApi.ringBell('device-1', 10)
			expect(mockPost).toHaveBeenCalledWith('/devices/device-1/ring/', {
				duration: 10,
			})
		})
	})

	describe('createSchedule', () => {
		it('posts to schedules endpoint', async () => {
			mockPost.mockResolvedValue({
				data: { id: 's1', times: ['08:00'] },
			})
			await deviceApi.createSchedule('d1', {
				times: ['08:00'],
				is_active: true,
			})
			expect(mockPost).toHaveBeenCalledWith('/schedules/', {
				device: 'd1',
				times: ['08:00'],
				is_active: true,
			})
		})
	})

	describe('updateSchedule', () => {
		it('patches schedule by id', async () => {
			mockPatch.mockResolvedValue({
				data: { id: 's1', times: ['09:00'] },
			})
			await deviceApi.updateSchedule('s1', { times: ['09:00'] })
			expect(mockPatch).toHaveBeenCalledWith('/schedules/s1/', {
				times: ['09:00'],
			})
		})
	})

	describe('syncSchedule', () => {
		it('posts sync command', async () => {
			mockPost.mockResolvedValue({ data: {} })
			await deviceApi.syncSchedule('s1')
			expect(mockPost).toHaveBeenCalledWith('/schedules/s1/sync_to_device/')
		})
	})

	describe('getBellLogs', () => {
		it('calls member bell-logs endpoint with params', async () => {
			mockGet.mockResolvedValue({ data: { count: 1, next: null, previous: null, results: [{ id: '1' }] } })
			const result = await deviceApi.getBellLogs('d1', 2, '2026-01-01', '2026-01-31')
			expect(mockGet).toHaveBeenCalledWith('/member/bell-logs/', {
				params: { device: 'd1', page: 2, date_from: '2026-01-01', date_to: '2026-01-31' },
			})
			expect(result.count).toBe(1)
		})

		it('uses default page 1', async () => {
			mockGet.mockResolvedValue({ data: { count: 0, next: null, previous: null, results: [] } })
			await deviceApi.getBellLogs('d1')
			expect(mockGet).toHaveBeenCalledWith('/member/bell-logs/', {
				params: { device: 'd1', page: 1, date_from: undefined, date_to: undefined },
			})
		})
	})

	describe('getAlerts', () => {
		it('calls member alerts endpoint', async () => {
			mockGet.mockResolvedValue({ data: { count: 2, next: null, previous: null, results: [{ id: 'a1' }, { id: 'a2' }] } })
			const result = await deviceApi.getAlerts(1)
			expect(mockGet).toHaveBeenCalledWith('/member/alerts/', { params: { page: 1 } })
			expect(result.count).toBe(2)
		})
	})

	describe('getHolidays', () => {
		it('calls member holidays endpoint', async () => {
			mockGet.mockResolvedValue({ data: { count: 1, next: null, previous: null, results: [{ id: 'h1', name: 'Navro\'z', date: '2026-03-21', recurring: true }] } })
			const result = await deviceApi.getHolidays()
			expect(mockGet).toHaveBeenCalledWith('/member/holidays/', { params: undefined })
			expect(result.count).toBe(1)
		})

		it('passes date filter param', async () => {
			mockGet.mockResolvedValue({ data: { count: 0, next: null, previous: null, results: [] } })
			await deviceApi.getHolidays('2026-03-21')
			expect(mockGet).toHaveBeenCalledWith('/member/holidays/', { params: { date: '2026-03-21' } })
		})
	})

	describe('triggerEmergency', () => {
		it('posts emergency alert to device', async () => {
			mockPost.mockResolvedValue({ data: {} })
			await deviceApi.triggerEmergency('device-1', 'panic')
			expect(mockPost).toHaveBeenCalledWith('/devices/device-1/emergency/', { alert_type: 'panic' })
		})
	})

	describe('resolveEmergency', () => {
		it('posts resolve to alert endpoint', async () => {
			mockPost.mockResolvedValue({ data: {} })
			await deviceApi.resolveEmergency('alert-1')
			expect(mockPost).toHaveBeenCalledWith('/member/alerts/alert-1/resolve/')
		})
	})
})
