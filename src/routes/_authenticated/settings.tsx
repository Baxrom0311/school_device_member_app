import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { authApi } from '@/lib/auth-api'
import { useAuthStore } from '@/stores/auth-store'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { RouteErrorBoundary } from '@/components/route-error-boundary'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Building2, LogOut, Mail, Save, User } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/settings')({
	component: SettingsPage,
	errorComponent: ({ error, reset }) => (
		<RouteErrorBoundary error={error} reset={reset} />
	),
})

function SettingsPage() {
	const { user, logout } = useAuthStore()
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const [isEditing, setIsEditing] = useState(false)
	const [formData, setFormData] = useState({
		first_name: user?.first_name || '',
		last_name: user?.last_name || '',
		organization_name: user?.organization_name || '',
	})

	const logoutMutation = useMutation({
		mutationFn: async () => {
			await logout()
		},
		onSuccess: () => {
			queryClient.clear()
			navigate({ to: '/login' })
		},
		onError: () => {
			queryClient.clear()
			navigate({ to: '/login' })
		},
	})

	const handleLogout = () => {
		logoutMutation.mutate()
	}

	const updateProfileMutation = useMutation({
		mutationFn: (data: typeof formData) => authApi.updateProfile(data),
		onSuccess: (updatedUser) => {
			useAuthStore.getState().setUser({ ...user!, ...updatedUser })
			toast.success("Ma'lumotlar saqlandi")
			setIsEditing(false)
		},
		onError: () => {
			toast.error('Xatolik yuz berdi')
		},
	})

	const handleSave = () => {
		updateProfileMutation.mutate(formData)
	}

	if (!user) {
		return <SettingsSkeleton />
	}

	return (
		<div className='space-y-6'>
			{/* Header */}
			<div className='flex items-center gap-4'>
				<Button
					variant='ghost'
					size='icon'
					onClick={() => navigate({ to: '/' })}
				>
					<ArrowLeft className='h-5 w-5' />
				</Button>
				<div>
					<h1 className='text-2xl font-bold tracking-tight'>Sozlamalar</h1>
					<p className='text-muted-foreground'>
						Profil va hisobingizni boshqaring
					</p>
				</div>
			</div>

			{/* Profile Card */}
			<Card>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<div>
							<CardTitle>Profil</CardTitle>
							<CardDescription>Shaxsiy ma'lumotlaringiz</CardDescription>
						</div>
						{!isEditing ? (
							<Button variant='outline' onClick={() => setIsEditing(true)}>
								Tahrirlash
							</Button>
						) : (
							<div className='flex gap-2'>
								<Button variant='ghost' onClick={() => setIsEditing(false)}>
									Bekor qilish
								</Button>
								<Button onClick={handleSave} disabled={updateProfileMutation.isPending}>
									<Save className='mr-2 h-4 w-4' />
									{updateProfileMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
								</Button>
							</div>
						)}
					</div>
				</CardHeader>
				<CardContent className='space-y-6'>
					{/* Avatar */}
					<div className='flex items-center gap-4'>
						<div className='flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground'>
							{user.first_name?.[0]?.toUpperCase() ||
								user.username?.[0]?.toUpperCase() ||
								user.email[0].toUpperCase()}
						</div>
						<div>
							<p className='font-medium'>
								{user.first_name} {user.last_name}
							</p>
							<p className='text-sm text-muted-foreground'>@{user.username}</p>
						</div>
					</div>

					<Separator />

					{/* Form Fields */}
					<div className='grid gap-4 sm:grid-cols-2'>
						<div className='space-y-2'>
							<Label htmlFor='first_name'>
								<User className='mr-2 inline h-4 w-4' />
								Ism
							</Label>
							{isEditing ? (
								<Input
									id='first_name'
									value={formData.first_name}
									onChange={e =>
										setFormData(prev => ({
											...prev,
											first_name: e.target.value,
										}))
									}
								/>
							) : (
								<p className='rounded-md border bg-muted/50 px-3 py-2 text-sm'>
									{user.first_name || '-'}
								</p>
							)}
						</div>

						<div className='space-y-2'>
							<Label htmlFor='last_name'>
								<User className='mr-2 inline h-4 w-4' />
								Familiya
							</Label>
							{isEditing ? (
								<Input
									id='last_name'
									value={formData.last_name}
									onChange={e =>
										setFormData(prev => ({
											...prev,
											last_name: e.target.value,
										}))
									}
								/>
							) : (
								<p className='rounded-md border bg-muted/50 px-3 py-2 text-sm'>
									{user.last_name || '-'}
								</p>
							)}
						</div>

						<div className='space-y-2'>
							<Label>
								<Mail className='mr-2 inline h-4 w-4' />
								Email
							</Label>
							<p className='rounded-md border bg-muted/50 px-3 py-2 text-sm'>
								{user.email}
							</p>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='organization_name'>
								<Building2 className='mr-2 inline h-4 w-4' />
								Tashkilot nomi
							</Label>
							{isEditing ? (
								<Input
									id='organization_name'
									value={formData.organization_name}
									onChange={e =>
										setFormData(prev => ({
											...prev,
											organization_name: e.target.value,
										}))
									}
								/>
							) : (
								<p className='rounded-md border bg-muted/50 px-3 py-2 text-sm'>
									{user.organization_name || '-'}
								</p>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Account Card */}
			<Card>
				<CardHeader>
					<CardTitle>Hisob</CardTitle>
					<CardDescription>Hisob sozlamalari va amallar</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='flex items-center justify-between rounded-lg border p-4'>
						<div className='flex items-center gap-3'>
							<div className='rounded-full bg-green-500/10 p-2'>
								<Mail className='h-5 w-5 text-green-500' />
							</div>
							<div>
								<p className='font-medium'>Email tasdiqlangan</p>
								<p className='text-sm text-muted-foreground'>{user.email}</p>
							</div>
						</div>
						<span className='text-sm text-green-600'>✓ Tasdiqlangan</span>
					</div>

					<Separator />

					{/* Logout */}
					<div className='flex items-center justify-between'>
						<div>
							<p className='font-medium text-destructive'>Hisobdan chiqish</p>
							<p className='text-sm text-muted-foreground'>
								Barcha qurilmalarda hisobdan chiqasiz
							</p>
						</div>
						<Button
							variant='destructive'
							onClick={handleLogout}
							disabled={logoutMutation.isPending}
						>
							<LogOut className='mr-2 h-4 w-4' />
							{logoutMutation.isPending ? 'Chiqilmoqda...' : 'Chiqish'}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

function SettingsSkeleton() {
	return (
		<div className='space-y-6'>
			<div className='flex items-center gap-4'>
				<Skeleton className='h-10 w-10' />
				<div className='space-y-2'>
					<Skeleton className='h-6 w-32' />
					<Skeleton className='h-4 w-48' />
				</div>
			</div>

			<Card>
				<CardHeader>
					<Skeleton className='h-6 w-24' />
					<Skeleton className='h-4 w-40' />
				</CardHeader>
				<CardContent className='space-y-6'>
					<div className='flex items-center gap-4'>
						<Skeleton className='h-16 w-16 rounded-full' />
						<div className='space-y-2'>
							<Skeleton className='h-5 w-32' />
							<Skeleton className='h-4 w-24' />
						</div>
					</div>
					<Separator />
					<div className='grid gap-4 sm:grid-cols-2'>
						{[1, 2, 3, 4].map(i => (
							<div key={i} className='space-y-2'>
								<Skeleton className='h-4 w-20' />
								<Skeleton className='h-10 w-full' />
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
