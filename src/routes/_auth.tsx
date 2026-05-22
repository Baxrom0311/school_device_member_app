import { useAuthStore } from '@/stores/auth-store'
import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth')({
	component: AuthLayout,
})

function AuthLayout() {
	const { isAuthenticated } = useAuthStore()

	// Redirect to dashboard if already authenticated
	if (isAuthenticated) {
		return <Navigate to='/' />
	}

	return (
		<div className='min-h-screen flex items-center justify-center bg-background'>
			<div className='w-full max-w-md px-4'>
				<Outlet />
			</div>
		</div>
	)
}
