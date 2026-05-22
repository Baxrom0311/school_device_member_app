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
import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

export const Route = createFileRoute('/_auth/register')({
	component: RegisterPage,
})

const registerSchema = z
	.object({
		username: z
			.string()
			.min(3, "Foydalanuvchi nomi kamida 3 ta belgidan iborat bo'lishi kerak"),
		organization_name: z
			.string()
			.min(
				2,
				"Maktab/tashkilot nomi kamida 2 ta belgidan iborat bo'lishi kerak"
			),
		first_name: z.string().optional(),
		last_name: z.string().optional(),
		email: z.string().email("To'g'ri email kiriting"),
		password: z
			.string()
			.min(7, "Parol kamida 7 ta belgidan iborat bo'lishi kerak"),
		confirm_password: z.string().min(1, 'Parolni tasdiqlang'),
	})
	.refine(data => data.password === data.confirm_password, {
		message: 'Parollar mos kelmadi',
		path: ['confirm_password'],
	})

type RegisterFormData = z.infer<typeof registerSchema>

function RegisterPage() {
	const navigate = useNavigate()
	const [isLoading, setIsLoading] = useState(false)

	const form = useForm<RegisterFormData>({
		resolver: zodResolver(registerSchema),
		defaultValues: {
			username: '',
			organization_name: '',
			first_name: '',
			last_name: '',
			email: '',
			password: '',
			confirm_password: '',
		},
	})

	const onSubmit = async (data: RegisterFormData) => {
		setIsLoading(true)
		try {
			await authApi.register(data)

			toast.success('Emailingizga tasdiqlash havolasi yuborildi!')
			navigate({ to: '/verify-email', search: { email: data.email } })
		} catch (error: unknown) {
			console.error('Register error:', error)
			if (error && typeof error === 'object' && 'response' in error) {
				const axiosError = error as {
					response?: { data?: Record<string, string[]> }
				}
				const errorData = axiosError.response?.data
				if (errorData) {
					const firstError = Object.values(errorData)[0]
					toast.error(
						Array.isArray(firstError) ? firstError[0] : 'Xatolik yuz berdi'
					)
				} else {
					toast.error("Ro'yxatdan o'tishda xatolik")
				}
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
				<CardTitle className='text-2xl'>Ro'yxatdan o'tish</CardTitle>
				<CardDescription>
					Yangi hisob yaratish uchun quyidagi ma'lumotlarni kiriting
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
						<FormField
							control={form.control}
							name='organization_name'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Maktab/Tashkilot nomi</FormLabel>
									<FormControl>
										<Input
											placeholder="1-sonli umumta'lim maktabi"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name='username'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Foydalanuvchi nomi</FormLabel>
									<FormControl>
										<Input placeholder='foydalanuvchi_nomi' {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className='grid grid-cols-2 gap-4'>
							<FormField
								control={form.control}
								name='first_name'
								render={({ field }) => (
									<FormItem>
										<FormLabel>Ism (ixtiyoriy)</FormLabel>
										<FormControl>
											<Input placeholder='Ism' {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name='last_name'
								render={({ field }) => (
									<FormItem>
										<FormLabel>Familiya (ixtiyoriy)</FormLabel>
										<FormControl>
											<Input placeholder='Familiya' {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

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

						<FormField
							control={form.control}
							name='confirm_password'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Parolni tasdiqlang</FormLabel>
									<FormControl>
										<Input type='password' placeholder='••••••••' {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button type='submit' className='w-full' disabled={isLoading}>
							{isLoading ? "Ro'yxatdan o'tilmoqda..." : "Ro'yxatdan o'tish"}
						</Button>
					</form>
				</Form>

				<div className='mt-6 text-center text-sm'>
					<span className='text-muted-foreground'>Hisobingiz bormi? </span>
					<Link to='/login' className='text-primary hover:underline'>
						Kirish
					</Link>
				</div>
			</CardContent>
		</Card>
	)
}
