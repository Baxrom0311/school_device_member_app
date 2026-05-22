import apiClient from '@/lib/api-client'
import { getCookie, removeCookie, setCookie } from '@/lib/cookies'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
	id: string
	email: string
	username: string
	first_name: string
	last_name: string
	avatar: string | null
	organization_name: string
	is_verified: boolean
	is_active: boolean
	role: 'ADMIN' | 'USER'
	created_at: string
	updated_at: string
}

interface AuthState {
	user: User | null
	isAuthenticated: boolean
	isLoading: boolean

	setTokens: (accessToken: string, refreshToken: string) => void
	login: (accessToken: string, refreshToken: string, user: User) => void
	logout: () => Promise<void>
	setUser: (user: User) => void
	fetchUser: () => Promise<void>
	checkAuth: () => boolean
}

// Check if user has valid token
const hasValidToken = () => !!getCookie('access_token')

export const useAuthStore = create<AuthState>()(
	persist(
		(set, get) => ({
			user: null,
			// Only consider authenticated if token actually exists
			isAuthenticated: hasValidToken(),
			isLoading: false,

			setTokens: (accessToken, refreshToken) => {
				setCookie('access_token', accessToken)
				setCookie('refresh_token', refreshToken)
				set({ isAuthenticated: true })
			},

			login: (accessToken, refreshToken, user) => {
				setCookie('access_token', accessToken)
				setCookie('refresh_token', refreshToken)
				set({ user, isAuthenticated: true })
			},

			logout: async () => {
				const refreshToken = getCookie('refresh_token')
				if (refreshToken) {
					try {
						await apiClient.post('/auth/logout/', { refresh: refreshToken })
					} catch {
						// Ignore errors - still clear local state
					}
				}
				removeCookie('access_token')
				removeCookie('refresh_token')
				set({ user: null, isAuthenticated: false })
			},

			setUser: user => set({ user }),

			fetchUser: async () => {
				// Recheck token before making request
				if (!hasValidToken()) {
					get().logout()
					return
				}
				set({ isLoading: true })
				try {
					const response = await apiClient.get('/auth/me/')
					set({ user: response.data, isLoading: false })
				} catch {
					get().logout()
					set({ isLoading: false })
				}
			},

			// Method to recheck auth state
			checkAuth: () => {
				const hasToken = hasValidToken()
				if (!hasToken && get().isAuthenticated) {
					get().logout()
				}
				return hasToken
			},
		}),
		{
			name: 'member-auth-storage',
			partialize: state => ({
				user: state.user,
				// Don't persist isAuthenticated - always check token
			}),
			// On rehydrate, check if token still exists
			onRehydrateStorage: () => state => {
				if (state && !hasValidToken()) {
					state.logout()
				}
			},
		}
	)
)
