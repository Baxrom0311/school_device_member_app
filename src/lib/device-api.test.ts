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
})
