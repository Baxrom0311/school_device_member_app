/**
 * Tests for the member-app auth store.
 *
 * Focus:
 *   - login() persists tokens and flips isAuthenticated true
 *   - logout() clears cookies and state even if the API call fails
 *   - fetchUser() only logs out on 401/403 (server errors must NOT
 *     clear the session — that was a pre-existing footgun)
 *   - checkAuth() reconciles isAuthenticated with the real cookie
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock() and vi.hoisted() run before any other code in this file.
// We MUST install the localStorage polyfill and the cookie store via
// vi.hoisted() because the auth-store module evaluates `useAuthStore`
// at import time, which (1) reads cookies and (2) calls setState on a
// zustand `persist` store, which in turn writes to localStorage.
const { cookieStore } = vi.hoisted(() => {
	const cookieStore = {} as Record<string, string>
	const memoryStorage: Record<string, string> = {}
	const fakeLocalStorage = {
		getItem: (key: string) => memoryStorage[key] ?? null,
		setItem: (key: string, value: string) => {
			memoryStorage[key] = String(value)
		},
		removeItem: (key: string) => {
			delete memoryStorage[key]
		},
		clear: () => {
			for (const k of Object.keys(memoryStorage)) delete memoryStorage[k]
		},
		key: (i: number) => Object.keys(memoryStorage)[i] ?? null,
		get length() {
			return Object.keys(memoryStorage).length
		},
	} as Storage
	// Always overwrite — jsdom's localStorage in this configuration appears
	// to be present-but-broken (setItem throws), which is what the previous
	// failing run reported.
	Object.defineProperty(globalThis, 'localStorage', {
		configurable: true,
		writable: true,
		value: fakeLocalStorage,
	})
	return { cookieStore }
})

vi.mock('@/lib/cookies', () => ({
	getCookie: vi.fn((name: string) => cookieStore[name]),
	setCookie: vi.fn((name: string, value: string) => {
		cookieStore[name] = value
	}),
	removeCookie: vi.fn((name: string) => {
		delete cookieStore[name]
	}),
}))

vi.mock('@/lib/api-client', () => ({
	default: {
		get: vi.fn(),
		post: vi.fn(),
	},
}))

vi.mock('@/lib/router', () => ({
	navigateTo: vi.fn(),
}))

// BroadcastChannel does not exist in jsdom by default; stub it.
class FakeBroadcastChannel {
	name: string
	onmessage: ((ev: { data: unknown }) => void) | null = null
	constructor(name: string) {
		this.name = name
	}
	postMessage = vi.fn()
	close = vi.fn()
}
;(globalThis as unknown as { BroadcastChannel: typeof BroadcastChannel }).BroadcastChannel =
	FakeBroadcastChannel as unknown as typeof BroadcastChannel

import apiClient from '@/lib/api-client'
import { useAuthStore } from './auth-store'

const mockApiPost = vi.mocked(apiClient.post)
const mockApiGet = vi.mocked(apiClient.get)

const SAMPLE_USER = {
	id: 'u-1',
	email: 'me@example.com',
	username: 'me',
	first_name: 'Me',
	last_name: '',
	avatar: null,
	organization_name: '',
	is_verified: true,
	is_active: true,
	role: 'USER' as const,
	created_at: '2024-01-01',
	updated_at: '2024-01-01',
}

beforeEach(() => {
	for (const k of Object.keys(cookieStore)) delete cookieStore[k]
	useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false })
	vi.clearAllMocks()
})

describe('member auth-store', () => {
	it('login() stores tokens and flips isAuthenticated', () => {
		useAuthStore.getState().login('access-1', 'refresh-1', SAMPLE_USER)

		expect(cookieStore.access_token).toBe('access-1')
		expect(cookieStore.refresh_token).toBe('refresh-1')
		expect(useAuthStore.getState().isAuthenticated).toBe(true)
		expect(useAuthStore.getState().user?.email).toBe('me@example.com')
	})

	it('logout() clears cookies and state even if the API call fails', async () => {
		useAuthStore.getState().login('a', 'r', SAMPLE_USER)
		mockApiPost.mockRejectedValueOnce(new Error('network'))

		await useAuthStore.getState().logout()

		expect(cookieStore.access_token).toBeUndefined()
		expect(cookieStore.refresh_token).toBeUndefined()
		expect(useAuthStore.getState().isAuthenticated).toBe(false)
		expect(useAuthStore.getState().user).toBeNull()
	})

	it('logout() skips API call when no refresh token present', async () => {
		// Simulate session already gone
		await useAuthStore.getState().logout()
		expect(mockApiPost).not.toHaveBeenCalled()
	})

	it('fetchUser() populates user on success', async () => {
		cookieStore.access_token = 'a'
		mockApiGet.mockResolvedValueOnce({ data: SAMPLE_USER })

		await useAuthStore.getState().fetchUser()

		expect(mockApiGet).toHaveBeenCalledWith('/auth/me/')
		expect(useAuthStore.getState().user?.email).toBe('me@example.com')
		expect(useAuthStore.getState().isLoading).toBe(false)
	})

	it('fetchUser() logs out on 401', async () => {
		cookieStore.access_token = 'a'
		cookieStore.refresh_token = 'r'
		useAuthStore.setState({ isAuthenticated: true, user: SAMPLE_USER })

		mockApiGet.mockRejectedValueOnce({ response: { status: 401 } })
		mockApiPost.mockResolvedValueOnce({ data: {} })

		await useAuthStore.getState().fetchUser()

		expect(useAuthStore.getState().isAuthenticated).toBe(false)
		expect(useAuthStore.getState().user).toBeNull()
		expect(cookieStore.access_token).toBeUndefined()
	})

	it('fetchUser() does NOT log out on 5xx server errors', async () => {
		cookieStore.access_token = 'a'
		cookieStore.refresh_token = 'r'
		useAuthStore.setState({ isAuthenticated: true, user: SAMPLE_USER })

		mockApiGet.mockRejectedValueOnce({ response: { status: 500 } })

		await useAuthStore.getState().fetchUser()

		// Session preserved — server hiccups must not log the user out.
		expect(useAuthStore.getState().isAuthenticated).toBe(true)
		expect(useAuthStore.getState().user?.email).toBe('me@example.com')
	})

	it('checkAuth() reconciles isAuthenticated when token disappears', () => {
		// Pretend store thinks we're logged in but the cookie was wiped.
		useAuthStore.setState({ isAuthenticated: true, user: SAMPLE_USER })
		expect(cookieStore.access_token).toBeUndefined()

		const hasToken = useAuthStore.getState().checkAuth()

		expect(hasToken).toBe(false)
		expect(useAuthStore.getState().isAuthenticated).toBe(false)
	})

	it('checkAuth() returns true and is idempotent when token exists', () => {
		cookieStore.access_token = 'good'
		useAuthStore.setState({ isAuthenticated: true, user: SAMPLE_USER })

		expect(useAuthStore.getState().checkAuth()).toBe(true)
		expect(useAuthStore.getState().isAuthenticated).toBe(true)
	})

	it('setTokens() updates cookies and flag without touching user', () => {
		useAuthStore.setState({ user: SAMPLE_USER, isAuthenticated: false })

		useAuthStore.getState().setTokens('a2', 'r2')

		expect(cookieStore.access_token).toBe('a2')
		expect(cookieStore.refresh_token).toBe('r2')
		expect(useAuthStore.getState().isAuthenticated).toBe(true)
		expect(useAuthStore.getState().user?.id).toBe('u-1')
	})
})
