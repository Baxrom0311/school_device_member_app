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
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

export const Route = createFileRoute('/_auth/reset-password')({
	validateSearch: (search: Record<string, unknown>) => ({
		email: (search.email as string) || '',
	}),
	component: ResetPasswordPage,
})

const schema = z
	.object({
		token: z.string().min(1, 'Tiklash kodini kiriting'),
		new_password: z.string().min(7, 'Kamida 7 ta belgi'),
		confirm_password: z.string().min(1, 'Parolni tasdiqlang'),
	})
	.refine(data => data.new_password === data.confirm_password, {
		message: 'Parollar mos kelmaydi',
		path: ['confirm_password'],
	})

type FormData = z.infer<typeof schema>

function ResetPasswordPage() {
	const navigate = useNavigate()
	const { email } = Route.useSearch()
	const [isLoading, setIsLoading] = useState(false)

	const form = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: { token: '', new_password: '', confirm_password: '' },
	})

	const onSubmit = async (data: FormData) => {
		if (!email) {
			toast.error('Email topilmadi. Qaytadan urinib ko\'ring.')
			return
		}
		setIsLoading(true)
		try {
			await authApi.resetPassword({
				email,
				token: data.token,
				new_password: data.new_password,
			})
			toast.success('Parol muvaffaqiyatli yangilandi!')
			navigate({ to: '/login' })
		} catch {
			toast.error('Token yaroqsiz yoki muddati tugagan.')
		} finally {
			setIsLoading(false)
		}
	}

	if (!email) {
		return (
			<Card>
				<CardHeader className='text-center'>
					<CardTitle>Havola yaroqsiz</CardTitle>
					<CardDescription>
						Parolni tiklash havolasi yaroqsiz yoki muddati tugagan.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						className='w-full'
						onClick={() => navigate({ to: '/forgot-password' })}
					>
						Qaytadan so'rash
					</Button>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader className='text-center'>
				<CardTitle className='text-2xl'>Yangi parol</CardTitle>
				<CardDescription>
					<strong>{email}</strong> manziliga yuborilgan kodni kiriting
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
						<FormField
							control={form.control}
							name='token'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Tiklash kodi</FormLabel>
									<FormControl>
										<Input
											placeholder='Emaildan kelgan kodni kiriting'
											className='font-mono'
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name='new_password'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Yangi parol</FormLabel>
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
							{isLoading ? 'Saqlanmoqda...' : 'Parolni yangilash'}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	)
}
