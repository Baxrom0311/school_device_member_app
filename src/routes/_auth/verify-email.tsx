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

export const Route = createFileRoute('/_auth/verify-email')({
	component: VerifyEmailPage,
	validateSearch: (search: Record<string, unknown>) => ({
		email: search.email as string | undefined,
	}),
})

const verifySchema = z.object({
	email: z.string().email("To'g'ri email kiriting"),
	token: z.string().min(1, 'Tasdiqlash kodi kiritilishi shart'),
})

type VerifyFormData = z.infer<typeof verifySchema>

function VerifyEmailPage() {
	const navigate = useNavigate()
	const { email: emailFromSearch } = Route.useSearch()
	const { setTokens, fetchUser } = useAuthStore()
	const [isLoading, setIsLoading] = useState(false)
	const [isResending, setIsResending] = useState(false)

	const form = useForm<VerifyFormData>({
		resolver: zodResolver(verifySchema),
		defaultValues: {
			email: emailFromSearch || '',
			token: '',
		},
	})

	const onSubmit = async (data: VerifyFormData) => {
		setIsLoading(true)
		try {
			const response = await authApi.verifyEmail(data)

			// Save tokens
			setCookie('access_token', response.access, 1)
			setCookie('refresh_token', response.refresh, 7)
			setTokens(response.access, response.refresh)

			// Fetch user data
			await fetchUser()

			toast.success('Email tasdiqlandi! Xush kelibsiz!')
			navigate({ to: '/' })
		} catch (error: unknown) {
			console.error('Verify error:', error)
			if (error && typeof error === 'object' && 'response' in error) {
				const axiosError = error as {
					response?: { data?: { detail?: string; non_field_errors?: string[] } }
				}
				const detail =
					axiosError.response?.data?.detail ||
					axiosError.response?.data?.non_field_errors?.[0]
				toast.error(detail || 'Tasdiqlash kodi xato yoki muddati tugagan')
			} else {
				toast.error('Tizimda xatolik yuz berdi')
			}
		} finally {
			setIsLoading(false)
		}
	}

	const handleResend = async () => {
		const email = form.getValues('email')
		if (!email) {
			toast.error('Email kiriting')
			return
		}

		setIsResending(true)
		try {
			await authApi.resendVerification(email)
			toast.success('Tasdiqlash kodi qayta yuborildi!')
		} catch (error: unknown) {
			console.error('Resend error:', error)
			if (error && typeof error === 'object' && 'response' in error) {
				const axiosError = error as {
					response?: { data?: { email?: string[]; detail?: string } }
				}
				const detail =
					axiosError.response?.data?.email?.[0] ||
					axiosError.response?.data?.detail
				toast.error(detail || 'Xatolik yuz berdi')
			} else {
				toast.error('Tizimda xatolik yuz berdi')
			}
		} finally {
			setIsResending(false)
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
						<path d='M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z' />
						<polyline points='22,6 12,13 2,6' />
					</svg>
				</div>
				<CardTitle className='text-2xl'>Emailni tasdiqlash</CardTitle>
				<CardDescription>
					{emailFromSearch ? (
						<>
							<strong>{emailFromSearch}</strong> manziliga tasdiqlash kodi
							yuborildi.
							<br />
							Emailingizni tekshiring va kodni kiriting.
						</>
					) : (
						'Emailingizga yuborilgan tasdiqlash kodini kiriting'
					)}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
						{!emailFromSearch && (
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
						)}

						<FormField
							control={form.control}
							name='token'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Tasdiqlash kodi</FormLabel>
									<FormControl>
										<Input
											placeholder='Emaildan olingan kodni kiriting'
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button type='submit' className='w-full' disabled={isLoading}>
							{isLoading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
						</Button>
					</form>
				</Form>

				<div className='mt-6 text-center text-sm'>
					<span className='text-muted-foreground'>Kodni olmadingizmi? </span>
					<button
						type='button'
						className='text-primary hover:underline disabled:opacity-50'
						onClick={handleResend}
						disabled={isResending}
					>
						{isResending ? 'Yuborilmoqda...' : 'Qayta yuborish'}
					</button>
				</div>

				<div className='mt-4 text-center text-sm'>
					<Link to='/login' className='text-muted-foreground hover:underline'>
						← Kirish sahifasiga qaytish
					</Link>
				</div>
			</CardContent>
		</Card>
	)
}
