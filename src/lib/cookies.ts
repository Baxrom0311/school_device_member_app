// Cookie utilities
export function getCookie(name: string): string | null {
	const value = `; ${document.cookie}`
	const parts = value.split(`; ${name}=`)
	if (parts.length === 2) return parts.pop()?.split(';').shift() || null
	return null
}

export function setCookie(name: string, value: string, days = 7): void {
	const expires = new Date(Date.now() + days * 864e5).toUTCString()
	const secure = location.protocol === 'https:' ? 'Secure;' : ''
	document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Strict; ${secure}`
}

export function removeCookie(name: string): void {
	document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`
}
