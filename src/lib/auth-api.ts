import apiClient from './api-client'

export interface LoginRequest {
	email: string
	password: string
}

export interface LoginResponse {
	access: string
	refresh: string
}

export interface RegisterRequest {
	email: string
	password: string
	confirm_password: string
	username: string
	organization_name?: string
	first_name?: string
	last_name?: string
}

export interface RegisterResponse {
	message: string
	user: {
		id: string
		email: string
	}
}

export interface VerifyEmailRequest {
	email: string
	token: string
}

export interface VerifyEmailResponse {
	access: string
	refresh: string
}

export interface User {
	id: string
	email: string
	username: string
	first_name: string
	last_name: string
	avatar: string | null
	role: 'ADMIN' | 'SCHOOL_ADMIN' | 'USER'
	is_active: boolean
	is_verified: boolean
	organization_name: string
	created_at: string
	updated_at: string
}

export const authApi = {
	login: async (data: LoginRequest): Promise<LoginResponse> => {
		const response = await apiClient.post<LoginResponse>('/auth/login/', data)
		return response.data
	},

	register: async (data: RegisterRequest): Promise<RegisterResponse> => {
		const response = await apiClient.post<RegisterResponse>(
			'/auth/register/',
			data
		)
		return response.data
	},

	verifyEmail: async (
		data: VerifyEmailRequest
	): Promise<VerifyEmailResponse> => {
		const response = await apiClient.post<VerifyEmailResponse>(
			'/auth/verify-email/',
			data
		)
		return response.data
	},

	resendVerification: async (email: string): Promise<{ message: string }> => {
		const response = await apiClient.post<{ message: string }>(
			'/auth/resend-verification/',
			{ email }
		)
		return response.data
	},

	getMe: async (): Promise<User> => {
		const response = await apiClient.get<User>('/auth/me/')
		return response.data
	},

	refreshToken: async (refresh: string): Promise<{ access: string }> => {
		const response = await apiClient.post<{ access: string }>(
			'/auth/refresh/',
			{
				refresh,
			}
		)
		return response.data
	},

	logout: async (refresh: string): Promise<void> => {
		await apiClient.post('/auth/logout/', { refresh })
	},

	changePassword: async (data: {
		old_password: string
		new_password: string
		confirm_password: string
	}): Promise<{ detail: string }> => {
		const response = await apiClient.post<{ detail: string }>(
			'/auth/change-password/',
			data
		)
		return response.data
	},

	updateProfile: async (data: Partial<Pick<User, 'first_name' | 'last_name' | 'organization_name'>>): Promise<User> => {
		const response = await apiClient.patch<User>('/auth/me/', data)
		return response.data
	},

	forgotPassword: async (email: string): Promise<void> => {
		await apiClient.post('/auth/forgot-password/', { email })
	},

	resetPassword: async (data: {
		email: string
		token: string
		new_password: string
	}): Promise<void> => {
		await apiClient.post('/auth/reset-password/', data)
	},
}
