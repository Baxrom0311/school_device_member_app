/**
 * Tests for the member-app axios client.
 *
 * Mirrors the dashboard's `api-client.test.ts` but adapted for the
 * member-app conventions:
 *   - login route is `/login` (not `/sign-in`)
 *   - auth-store cross-tab channel name is `member-auth-logout`
 *
 * Focus:
 *   - Bearer token is attached when the access cookie is fresh.
 *   - No Authorization header when no cookie is present.
 *   - 401 → refresh → retry path uses the rotated token and stores it.
 *   - `/auth/login` 401s do NOT trigger a refresh (would loop on bad creds).
 *   - Missing refresh token on 401 clears auth and navigates to `/login`.
 *   - `refreshAccessToken()` coalesces concurrent calls onto one request.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios, { type AxiosRequestConfig } from 'axios'

// jsdom localStorage is unreliable here (zustand persist writes to it
// during module-eval). Install a deterministic in-memory shim before any
// app module is imported.
function installMemoryStorage() {
	const store = new Map<string, string>()
	const memoryStorage: Storage = {
		getItem: (k) => (store.has(k) ? (store.get(k) as string) : null),
		setItem: (k, v) => {
			store.set(k, String(v))
		},
		removeItem: (k) => {
			store.delete(k)
		},
		clear: () => {
			store.clear()
		},
		key: (i) => Array.from(store.keys())[i] ?? null,
		get length() {
			return store.size
		},
	}
	Object.defineProperty(globalThis, 'localStorage', {
		configurable: true,
		value: memoryStorage,
	})
	Object.defineProperty(globalThis, 'sessionStorage', {
		configurable: true,
		value: memoryStorage,
	})
	return memoryStorage
}

const memStorage = installMemoryStorage()

vi.mock('sonner', () => ({
	toast: { error: vi.fn() },
}))

vi.mock('@/lib/router', () => ({
	navigateTo: vi.fn(),
}))

// BroadcastChannel does not exist in jsdom; the auth-store imports require it.
class FakeBroadcastChannel {
	name: string
	onmessage: ((ev: { data: unknown }) => void) | null = null
	constructor(name: string) {
		this.name = name
	}
	postMessage(_data: unknown) {
		void _data
	}
	close() {}
}
;(globalThis as unknown as { BroadcastChannel: typeof FakeBroadcastChannel }).BroadcastChannel =
	FakeBroadcastChannel

function makeJwt(exp: number): string {
	const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
	const payload = btoa(JSON.stringify({ exp, sub: '1' }))
	return `${header}.${payload}.signature`
}

function setCookieRaw(name: string, value: string) {
	document.cookie = `${name}=${value}; path=/`
}

function clearCookies() {
	document.cookie.split(';').forEach((c) => {
		const eq = c.indexOf('=')
		const name = eq > -1 ? c.substring(0, eq).trim() : c.trim()
		if (name) document.cookie = `${name}=; max-age=0; path=/`
	})
}

function clearStorage() {
	try {
		memStorage.clear()
	} catch {
		/* ignore */
	}
}

describe('api-client (member app)', () => {
	beforeEach(() => {
		clearCookies()
		clearStorage()
		vi.clearAllMocks()
		vi.resetModules()
	})

	afterEach(() => {
		clearCookies()
		clearStorage()
		vi.restoreAllMocks()
	})

	it('attaches Bearer token to requests when access cookie is fresh', async () => {
		const validToken = makeJwt(Math.floor(Date.now() / 1000) + 3600)
		setCookieRaw('access_token', validToken)

		const { default: apiClient } = await import('./api-client')

		let observedConfig: AxiosRequestConfig | undefined
		apiClient.defaults.adapter = (config) => {
			observedConfig = config
			return Promise.resolve({
				data: { ok: true },
				status: 200,
				statusText: 'OK',
				headers: {},
				config,
			})
		}

		const res = await apiClient.get('/devices/')
		expect(res.status).toBe(200)
		expect(observedConfig?.headers?.Authorization).toBe(`Bearer ${validToken}`)
	})

	it('omits Authorization header when no access cookie is present', async () => {
		const { default: apiClient } = await import('./api-client')

		let observedConfig: AxiosRequestConfig | undefined
		apiClient.defaults.adapter = (config) => {
			observedConfig = config
			return Promise.resolve({
				data: {},
				status: 200,
				statusText: 'OK',
				headers: {},
				config,
			})
		}

		await apiClient.get('/public/')
		expect(observedConfig?.headers?.Authorization).toBeUndefined()
	})

	it('refreshes on 401 and retries the original request with the new token', async () => {
		const validAccess = makeJwt(Math.floor(Date.now() / 1000) + 3600)
		const validRefresh = makeJwt(Math.floor(Date.now() / 1000) + 7 * 86400)
		setCookieRaw('access_token', validAccess)
		setCookieRaw('refresh_token', validRefresh)

		const newAccess = makeJwt(Math.floor(Date.now() / 1000) + 3600)
		const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({
			data: { access: newAccess },
			status: 200,
			statusText: 'OK',
			headers: {},
			config: { headers: {} },
		} as never)

		const { default: apiClient } = await import('./api-client')

		let calls = 0
		const observedAuth: Array<string | undefined> = []
		apiClient.defaults.adapter = (config) => {
			calls += 1
			observedAuth.push(config.headers?.Authorization as string | undefined)
			if (calls === 1) {
				return Promise.reject({
					isAxiosError: true,
					response: {
						status: 401,
						statusText: 'Unauthorized',
						data: {},
						headers: {},
						config,
					},
					config,
				})
			}
			return Promise.resolve({
				data: { ok: true },
				status: 200,
				statusText: 'OK',
				headers: {},
				config,
			})
		}

		const res = await apiClient.get('/devices/')
		expect(res.status).toBe(200)
		expect(calls).toBe(2)
		expect(postSpy).toHaveBeenCalledTimes(1)
		expect(postSpy.mock.calls[0][0]).toContain('/auth/refresh/')
		// Retry must use the rotated access token.
		expect(observedAuth[1]).toBe(`Bearer ${newAccess}`)
		// Cookie should now hold the rotated token.
		expect(document.cookie).toContain(`access_token=${newAccess}`)
	})

	it('does not attempt refresh for /auth/login 401s', async () => {
		// Even with a refresh token present, a login 401 must surface as a
		// plain credential failure rather than triggering refresh logic.
		setCookieRaw('refresh_token', makeJwt(Math.floor(Date.now() / 1000) + 86400))

		const postSpy = vi.spyOn(axios, 'post')

		const { default: apiClient } = await import('./api-client')

		apiClient.defaults.adapter = (config) =>
			Promise.reject({
				isAxiosError: true,
				response: {
					status: 401,
					statusText: 'Unauthorized',
					data: { detail: 'invalid credentials' },
					headers: {},
					config,
				},
				config,
			})

		await expect(
			apiClient.post('/auth/login/', { email: 'a@b.com', password: 'x' })
		).rejects.toMatchObject({ response: { status: 401 } })

		expect(postSpy).not.toHaveBeenCalled()
	})

	it('clears auth and navigates to /login when no refresh token is present on 401', async () => {
		setCookieRaw('access_token', makeJwt(Math.floor(Date.now() / 1000) + 3600))

		const { navigateTo } = await import('@/lib/router')
		const { default: apiClient } = await import('./api-client')

		apiClient.defaults.adapter = (config) =>
			Promise.reject({
				isAxiosError: true,
				response: {
					status: 401,
					statusText: 'Unauthorized',
					data: {},
					headers: {},
					config,
				},
				config,
			})

		await expect(apiClient.get('/devices/')).rejects.toBeDefined()

		expect(navigateTo).toHaveBeenCalledWith('/login', { replace: true })
		expect(document.cookie).not.toContain('access_token=')
	})

	it('refreshAccessToken() coalesces concurrent calls onto a single network request', async () => {
		// IMPORTANT: also seed access_token. Otherwise auth-store's
		// `onRehydrateStorage` runs `logout()` at import time (because
		// `hasValidToken()` returns false), which removes the refresh
		// cookie before the test gets to call refreshAccessToken().
		const validAccess = makeJwt(Math.floor(Date.now() / 1000) + 3600)
		const validRefresh = makeJwt(Math.floor(Date.now() / 1000) + 7 * 86400)
		setCookieRaw('access_token', validAccess)
		setCookieRaw('refresh_token', validRefresh)

		const newAccess = makeJwt(Math.floor(Date.now() / 1000) + 3600)
		const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({
			data: { access: newAccess },
			status: 200,
			statusText: 'OK',
			headers: {},
			config: { headers: {} },
		} as never)

		const { refreshAccessToken } = await import('./api-client')

		const [a, b, c] = await Promise.all([
			refreshAccessToken(),
			refreshAccessToken(),
			refreshAccessToken(),
		])

		expect(a).toBe(newAccess)
		expect(b).toBe(newAccess)
		expect(c).toBe(newAccess)
		// Despite three concurrent callers, only one HTTP refresh is made.
		expect(postSpy).toHaveBeenCalledTimes(1)
	})

	it('refreshAccessToken() returns null when no refresh token cookie exists', async () => {
		const postSpy = vi.spyOn(axios, 'post')

		const { refreshAccessToken } = await import('./api-client')
		const result = await refreshAccessToken()

		expect(result).toBeNull()
		expect(postSpy).not.toHaveBeenCalled()
	})

	it('refreshAccessToken() returns null and does not throw when refresh fails', async () => {
		const validRefresh = makeJwt(Math.floor(Date.now() / 1000) + 7 * 86400)
		setCookieRaw('refresh_token', validRefresh)

		vi.spyOn(axios, 'post').mockRejectedValue(new Error('network down'))

		const { refreshAccessToken } = await import('./api-client')
		const result = await refreshAccessToken()

		expect(result).toBeNull()
	})
})
