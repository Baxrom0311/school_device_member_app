import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'
import { getCookie, removeCookie, setCookie } from './cookies'
import { isTokenExpired } from './jwt'
import { navigateTo } from './router'
import { useAuthStore } from '@/stores/auth-store'

const API_BASE_URL =
	import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const apiClient = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 15000,
})

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null
let failedQueue: Array<{
	resolve: (value?: unknown) => void
	reject: (reason?: unknown) => void
}> = []

const processQueue = (error: Error | null, token: string | null = null) => {
	failedQueue.forEach(prom => {
		if (error) {
			prom.reject(error)
		} else {
			prom.resolve(token)
		}
	})
	failedQueue = []
}

const doRefresh = async (): Promise<string | null> => {
	const refreshToken = getCookie('refresh_token')
	if (!refreshToken || isTokenExpired(refreshToken)) return null
	const response = await axios.post(
		`${API_BASE_URL}/auth/refresh/`,
		{ refresh: refreshToken }
	)
	const newToken = response.data.access
	setCookie('access_token', newToken)
	useAuthStore.setState({ isAuthenticated: true })
	return newToken
}

/**
 * Refresh the access token using the stored refresh token.
 *
 * Exposed for non-axios consumers (e.g. WebSocket hooks) that need a fresh
 * token before connecting. Coalesces concurrent calls onto a single network
 * request via the same promise the request interceptor uses.
 *
 * Returns the new access token, or null if no refresh token is available
 * or the refresh attempt failed.
 */
export const refreshAccessToken = async (): Promise<string | null> => {
	if (isRefreshing && refreshPromise) {
		return refreshPromise
	}
	isRefreshing = true
	refreshPromise = doRefresh()
		.then(newToken => {
			processQueue(null, newToken)
			return newToken
		})
		.catch(err => {
			processQueue(
				err instanceof Error ? err : new Error('refresh failed'),
				null
			)
			return null
		})
		.finally(() => {
			isRefreshing = false
			refreshPromise = null
		})
	return refreshPromise
}

// Request interceptor - add auth token (with expiry pre-check)
apiClient.interceptors.request.use(async config => {
	let token = getCookie('access_token')

	if (token && isTokenExpired(token) && !config.url?.includes('/auth/')) {
		token = await refreshAccessToken()
	}

	if (token) {
		config.headers.Authorization = `Bearer ${token}`
	}
	return config
})

// Response interceptor - handle 401 with token refresh
apiClient.interceptors.response.use(
	response => response,
	async (error: AxiosError) => {
		const originalRequest = error.config as InternalAxiosRequestConfig & {
			_retry?: boolean
		}

		if (error.response?.status === 401 && !originalRequest._retry) {
			if (originalRequest.url?.includes('/auth/login')) {
				return Promise.reject(error)
			}

			if (isRefreshing) {
				return new Promise((resolve, reject) => {
					failedQueue.push({ resolve, reject })
				}).then(token => {
					originalRequest.headers.Authorization = `Bearer ${token}`
					return apiClient(originalRequest)
				})
			}

			originalRequest._retry = true
			isRefreshing = true

			const refreshToken = getCookie('refresh_token')

			if (!refreshToken) {
				removeCookie('access_token')
				removeCookie('refresh_token')
				useAuthStore.setState({ user: null, isAuthenticated: false })
				navigateTo('/login', { replace: true })
				return Promise.reject(error)
			}

			try {
				const response = await axios.post(
					`${API_BASE_URL}/auth/refresh/`,
					{ refresh: refreshToken }
				)
				const { access } = response.data
				setCookie('access_token', access)
				useAuthStore.setState({ isAuthenticated: true })
				processQueue(null, access)
				originalRequest.headers.Authorization = `Bearer ${access}`
				return apiClient(originalRequest)
			} catch (refreshError) {
				processQueue(refreshError as Error, null)
				removeCookie('access_token')
				removeCookie('refresh_token')
				useAuthStore.setState({ user: null, isAuthenticated: false })
				navigateTo('/login', { replace: true })
				return Promise.reject(refreshError)
			} finally {
				isRefreshing = false
			}
		}

		// Network errors (no response)
		if (!error.response) {
			toast.error('Tarmoq xatoligi', {
				description: "Serverga ulanib bo'lmadi. Internet aloqangizni tekshiring.",
				action: {
					label: 'Qayta urinish',
					onClick: () => {
						if (originalRequest) apiClient(originalRequest)
					},
				},
			})
		}

		return Promise.reject(error)
	}
)

export default apiClient
