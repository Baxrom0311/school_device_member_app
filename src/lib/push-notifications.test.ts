import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./api-client', () => ({
	default: {
		get: vi.fn(),
		post: vi.fn(),
	},
}))

import apiClient from './api-client'

const mockGet = vi.mocked(apiClient.get)
const mockPost = vi.mocked(apiClient.post)

describe('push-notifications', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.resetModules()
	})

	describe('subscribeToPush', () => {
		it('returns unsupported when PushManager is missing', async () => {
			// Remove PushManager from window
			const originalPM = (window as any).PushManager
			delete (window as any).PushManager

			const { subscribeToPush } = await import('./push-notifications')
			const result = await subscribeToPush()

			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toBe('unsupported')
			}

			// Restore
			;(window as any).PushManager = originalPM
		})
	})

	describe('isPushSubscribed', () => {
		it('returns false when PushManager is missing', async () => {
			const originalPM = (window as any).PushManager
			delete (window as any).PushManager

			const { isPushSubscribed } = await import('./push-notifications')
			const result = await isPushSubscribed()

			expect(result).toBe(false)

			;(window as any).PushManager = originalPM
		})
	})

	describe('getVapidPublicKey', () => {
		it('fetches public key from server', async () => {
			mockGet.mockResolvedValue({ data: { public_key: 'test-key-123' } })

			const { getVapidPublicKey } = await import('./push-notifications')
			const key = await getVapidPublicKey()

			expect(mockGet).toHaveBeenCalledWith('/notifications/push/subscribe/')
			expect(key).toBe('test-key-123')
		})
	})

	describe('unsubscribeFromPush', () => {
		it('does nothing when no subscription exists', async () => {
			const mockGetSubscription = vi.fn().mockResolvedValue(null)
			const mockReady = Promise.resolve({ pushManager: { getSubscription: mockGetSubscription } })
			Object.defineProperty(navigator, 'serviceWorker', {
				value: { ready: mockReady },
				configurable: true,
			})

			const { unsubscribeFromPush } = await import('./push-notifications')
			await unsubscribeFromPush()

			expect(mockPost).not.toHaveBeenCalled()
		})
	})
})
