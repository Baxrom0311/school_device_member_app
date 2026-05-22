import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authApi } from '@/lib/auth-api'
import { useAuthStore } from '@/stores/auth-store'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'
import { Key, LogOut, User, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

export const Route = createFileRoute('/_authenticated')({
	component: AuthenticatedLayout,
})

const changePasswordSchema = z
	.object({
		old_password: z.string().min(1, 'Joriy parolni kiriting'),
		new_password: z.string().min(7, "Kamida 7 ta belgidan iborat bo'lishi kerak"),
		confirm_password: z.string().min(1, 'Parolni tasdiqlang'),
	})
	.refine(data => data.new_password === data.confirm_password, {
		message: 'Parollar mos kelmaydi',
		path: ['confirm_password'],
	})

type ChangePasswordForm = z.infer<typeof changePasswordSchema>

function ChangePasswordDialog() {
	const [open, setOpen] = useState(false)

	const form = useForm<ChangePasswordForm>({
		resolver: zodResolver(changePasswordSchema),
		defaultValues: { old_password: '', new_password: '', confirm_password: '' },
	})

	const mutation = useMutation({
		mutationFn: (data: ChangePasswordForm) =>
			authApi.changePassword({
				old_password: data.old_password,
				new_password: data.new_password,
				confirm_password: data.confirm_password,
			}),
		onSuccess: () => {
			toast.success('Parol muvaffaqiyatli yangilandi!')
			setOpen(false)
			form.reset()
		},
		onError: (error: { response?: { data?: Record<string, string[]> } }) => {
			const data = error.response?.data
			if (data) {
				const firstError = Object.values(data)[0]
				if (Array.isArray(firstError) && firstError[0]) {
					toast.error(firstError[0])
					return
				}
			}
			toast.error('Parol yangilashda xatolik yuz berdi')
		},
	})

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<button className='flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors'>
					<Key className='h-4 w-4' />
					Parol
				</button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>Parolni o'zgartirish</DialogTitle>
					<DialogDescription>Yangi parolingizni kiriting</DialogDescription>
				</DialogHeader>
				<form onSubmit={form.handleSubmit(data => mutation.mutate(data))}>
					<div className='grid gap-4 py-4'>
						<div className='grid gap-2'>
							<Label htmlFor='old-password'>Joriy parol</Label>
							<Input
								id='old-password'
								type='password'
								placeholder='Hozirgi parolingiz'
								{...form.register('old_password')}
							/>
							{form.formState.errors.old_password && (
								<p className='text-xs text-destructive'>
									{form.formState.errors.old_password.message}
								</p>
							)}
						</div>
						<div className='grid gap-2'>
							<Label htmlFor='new-password'>Yangi parol</Label>
							<Input
								id='new-password'
								type='password'
								placeholder='Yangi parol (kamida 7 ta belgi)'
								{...form.register('new_password')}
							/>
							{form.formState.errors.new_password && (
								<p className='text-xs text-destructive'>
									{form.formState.errors.new_password.message}
								</p>
							)}
						</div>
						<div className='grid gap-2'>
							<Label htmlFor='confirm-password'>Parolni tasdiqlang</Label>
							<Input
								id='confirm-password'
								type='password'
								placeholder='Yangi parolni takrorlang'
								{...form.register('confirm_password')}
							/>
							{form.formState.errors.confirm_password && (
								<p className='text-xs text-destructive'>
									{form.formState.errors.confirm_password.message}
								</p>
							)}
						</div>
					</div>
					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => setOpen(false)}
						>
							Bekor qilish
						</Button>
						<Button type='submit' disabled={mutation.isPending}>
							{mutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

function OfflineBanner() {
	const [isOffline, setIsOffline] = useState(!navigator.onLine)

	useEffect(() => {
		const handleOffline = () => setIsOffline(true)
		const handleOnline = () => {
			setIsOffline(false)
			toast.success('Internet qayta ulandi')
		}
		window.addEventListener('offline', handleOffline)
		window.addEventListener('online', handleOnline)
		return () => {
			window.removeEventListener('offline', handleOffline)
			window.removeEventListener('online', handleOnline)
		}
	}, [])

	if (!isOffline) return null

	return (
		<div
			role='alert'
			aria-live='polite'
			className='bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm flex items-center justify-center gap-2'
		>
			<WifiOff className='h-4 w-4' />
			Internet aloqasi yo'q. Ma'lumotlar yangilanmaydi.
		</div>
	)
}

function AuthenticatedLayout() {
	const { isAuthenticated, user, fetchUser, isLoading, checkAuth } =
		useAuthStore()

	useEffect(() => {
		// Recheck auth on mount
		const hasAuth = checkAuth()
		if (hasAuth && !user) {
			fetchUser()
		}
	}, [checkAuth, user, fetchUser])

	// Redirect to login if not authenticated
	if (!isAuthenticated) {
		return <Navigate to='/login' />
	}

	if (isLoading) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-background'>
				<div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full' />
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-background'>
			<OfflineBanner />
			<header className='border-b bg-card'>
				<div className='container mx-auto px-4 h-16 flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<svg
							className='h-8 w-8 text-primary'
							viewBox='0 0 24 24'
							fill='none'
							stroke='currentColor'
							strokeWidth='2'
							strokeLinecap='round'
							strokeLinejoin='round'
						>
							<path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' />
							<path d='M13.73 21a2 2 0 0 1-3.46 0' />
						</svg>
						<span className='font-semibold text-lg'>School Bell</span>
					</div>

					<div className='flex items-center gap-4'>
						<div className='flex items-center gap-2'>
							<User className='h-4 w-4 text-muted-foreground' />
							<span className='text-sm text-muted-foreground'>
								{user?.first_name} {user?.last_name}
							</span>
						</div>
						<div className='h-4 w-px bg-border' />
						<ChangePasswordDialog />
						<div className='h-4 w-px bg-border' />
						<button
							onClick={async () => {
								await useAuthStore.getState().logout()
							}}
							className='flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors'
						>
							<LogOut className='h-4 w-4' />
							Chiqish
						</button>
					</div>
				</div>
			</header>

			<main className='container mx-auto px-4 py-8'>
				<Outlet />
			</main>
		</div>
	)
}
