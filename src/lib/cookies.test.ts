import { describe, it, expect, beforeEach } from 'vitest'
import { getCookie, setCookie, removeCookie } from './cookies'

describe('cookies', () => {
	beforeEach(() => {
		// Clear all cookies
		document.cookie.split(';').forEach((c) => {
			const name = c.trim().split('=')[0]
			if (name) {
				document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
			}
		})
	})

	describe('setCookie / getCookie', () => {
		it('sets and retrieves a cookie', () => {
			setCookie('test_token', 'abc123')
			expect(getCookie('test_token')).toBe('abc123')
		})

		it('returns null for non-existent cookie', () => {
			expect(getCookie('nonexistent')).toBeNull()
		})

		it('handles multiple cookies', () => {
			setCookie('access_token', 'access_val')
			setCookie('refresh_token', 'refresh_val')
			expect(getCookie('access_token')).toBe('access_val')
			expect(getCookie('refresh_token')).toBe('refresh_val')
		})
	})

	describe('removeCookie', () => {
		it('removes an existing cookie', () => {
			setCookie('to_remove', 'value')
			expect(getCookie('to_remove')).toBe('value')
			removeCookie('to_remove')
			expect(getCookie('to_remove')).toBeNull()
		})

		it('does not throw when removing non-existent cookie', () => {
			expect(() => removeCookie('nonexistent')).not.toThrow()
		})
	})
})
