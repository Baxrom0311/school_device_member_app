import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authApi } from './auth-api'

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

describe('authApi', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('login posts credentials', async () => {
		mockPost.mockResolvedValue({
			data: { access: 'tok', refresh: 'ref' },
		})
		const result = await authApi.login({
			email: 'a@b.com',
			password: 'pass',
		})
		expect(mockPost).toHaveBeenCalledWith('/auth/login/', {
			email: 'a@b.com',
			password: 'pass',
		})
		expect(result.access).toBe('tok')
	})

	it('register posts user data', async () => {
		mockPost.mockResolvedValue({
			data: { message: 'ok', user: { id: '1', email: 'a@b.com' } },
		})
		await authApi.register({
			email: 'a@b.com',
			password: 'pass123',
			confirm_password: 'pass123',
			username: 'user1',
		})
		expect(mockPost).toHaveBeenCalledWith('/auth/register/', {
			email: 'a@b.com',
			password: 'pass123',
			confirm_password: 'pass123',
			username: 'user1',
		})
	})

	it('getMe calls correct endpoint', async () => {
		mockGet.mockResolvedValue({
			data: { id: '1', email: 'a@b.com', role: 'USER' },
		})
		const user = await authApi.getMe()
		expect(mockGet).toHaveBeenCalledWith('/auth/me/')
		expect(user.email).toBe('a@b.com')
	})

	it('forgotPassword posts email', async () => {
		mockPost.mockResolvedValue({ data: {} })
		await authApi.forgotPassword('a@b.com')
		expect(mockPost).toHaveBeenCalledWith('/auth/forgot-password/', {
			email: 'a@b.com',
		})
	})

	it('resetPassword posts token and new password', async () => {
		mockPost.mockResolvedValue({ data: {} })
		await authApi.resetPassword({
			email: 'a@b.com',
			token: 'tok123',
			new_password: 'newpass',
		})
		expect(mockPost).toHaveBeenCalledWith('/auth/reset-password/', {
			email: 'a@b.com',
			token: 'tok123',
			new_password: 'newpass',
		})
	})

	it('updateProfile patches user data', async () => {
		mockPatch.mockResolvedValue({
			data: { id: '1', first_name: 'New' },
		})
		await authApi.updateProfile({ first_name: 'New' })
		expect(mockPatch).toHaveBeenCalledWith('/auth/me/', {
			first_name: 'New',
		})
	})

	it('logout posts refresh token', async () => {
		mockPost.mockResolvedValue({ data: {} })
		await authApi.logout('ref_token')
		expect(mockPost).toHaveBeenCalledWith('/auth/logout/', {
			refresh: 'ref_token',
		})
	})
})
