import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { authApi } from '@/lib/auth-api'
import { setCookie } from '@/lib/cookies'
import { useAuthStore } from '@/stores/auth-store'
import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

export const Route = createFileRoute('/_auth/login')({
	component: LoginPage,
})

const loginSchema = z.object({
	email: z.string().email("To'g'ri email kiriting"),
	password: z.string().min(1, 'Parol kiritilishi shart'),
})

type LoginFormData = z.infer<typeof loginSchema>

function LoginPage() {
	const navigate = useNavigate()
	const { setTokens, fetchUser } = useAuthStore()
	const [isLoading, setIsLoading] = useState(false)

	const form = useForm<LoginFormData>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: '',
			password: '',
		},
	})

	const onSubmit = async (data: LoginFormData) => {
		setIsLoading(true)
		try {
			const response = await authApi.login(data)

			// Save tokens
			setCookie('access_token', response.access, 1)
			setCookie('refresh_token', response.refresh, 7)
			setTokens(response.access, response.refresh)

			// Fetch user data
			await fetchUser()

			toast.success('Muvaffaqiyatli kirdingiz!')
			navigate({ to: '/' })
		} catch (error: unknown) {
			console.error('Login error:', error)
			if (error && typeof error === 'object' && 'response' in error) {
				const axiosError = error as {
					response?: { data?: { detail?: string } }
				}
				toast.error(
					axiosError.response?.data?.detail || 'Email yoki parol xato'
				)
			} else {
				toast.error('Tizimda xatolik yuz berdi')
			}
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Card>
			<CardHeader className='text-center'>
				<div className='flex justify-center mb-4'>
					<svg
						className='h-12 w-12 text-primary'
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
				</div>
				<CardTitle className='text-2xl'>Kirish</CardTitle>
				<CardDescription>
					Hisobingizga kirish uchun email va parolingizni kiriting
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
						<FormField
							control={form.control}
							name='email'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input
											type='email'
											placeholder='sizning@email.uz'
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name='password'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Parol</FormLabel>
									<FormControl>
										<Input type='password' placeholder='••••••••' {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button type='submit' className='w-full' disabled={isLoading}>
							{isLoading ? 'Kirish...' : 'Kirish'}
						</Button>
					</form>
				</Form>

				<div className='mt-4 text-center text-sm'>
					<Link
						to='/forgot-password'
						className='text-muted-foreground hover:text-primary'
					>
						Parolni unutdingizmi?
					</Link>
				</div>

				<div className='mt-4 text-center text-sm'>
					<span className='text-muted-foreground'>Hisobingiz yo'qmi? </span>
					<Link to='/register' className='text-primary hover:underline'>
						Ro'yxatdan o'tish
					</Link>
				</div>
			</CardContent>
		</Card>
	)
}
