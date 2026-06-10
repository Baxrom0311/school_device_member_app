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

// Strongly-typed helpers for tweaking the global `window` object in tests.
// Avoids `any` and keeps the assertions in the test bodies type-safe.
type WindowWithPush = Window & {
	PushManager?: typeof PushManager
}
const testWindow = window as unknown as WindowWithPush

function detachPushManager(): typeof PushManager | undefined {
	const original = testWindow.PushManager
	delete testWindow.PushManager
	return original
}

function restorePushManager(original: typeof PushManager | undefined): void {
	if (original) {
		testWindow.PushManager = original
	}
}

describe('push-notifications', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.resetModules()
	})

	describe('subscribeToPush', () => {
		it('returns unsupported when PushManager is missing', async () => {
			const originalPM = detachPushManager()

			const { subscribeToPush } = await import('./push-notifications')
			const result = await subscribeToPush()

			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toBe('unsupported')
			}

			restorePushManager(originalPM)
		})
	})

	describe('isPushSubscribed', () => {
		it('returns false when PushManager is missing', async () => {
			const originalPM = detachPushManager()

			const { isPushSubscribed } = await import('./push-notifications')
			const result = await isPushSubscribed()

			expect(result).toBe(false)

			restorePushManager(originalPM)
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
