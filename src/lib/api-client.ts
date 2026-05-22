import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'
import { getCookie, removeCookie, setCookie } from './cookies'
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

// Request interceptor - add auth token
apiClient.interceptors.request.use(config => {
	const token = getCookie('access_token')
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
				localStorage.removeItem('member-auth-storage')
				useAuthStore.getState().logout()
				return Promise.reject(error)
			}

			try {
				const response = await axios.post(
					`${API_BASE_URL}/auth/refresh/`,
					{ refresh: refreshToken }
				)
				const { access } = response.data
				setCookie('access_token', access)
				processQueue(null, access)
				originalRequest.headers.Authorization = `Bearer ${access}`
				return apiClient(originalRequest)
			} catch (refreshError) {
				processQueue(refreshError as Error, null)
				removeCookie('access_token')
				removeCookie('refresh_token')
				localStorage.removeItem('member-auth-storage')
				useAuthStore.getState().logout()
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
