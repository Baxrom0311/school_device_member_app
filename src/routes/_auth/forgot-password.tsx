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
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

export const Route = createFileRoute('/_auth/forgot-password')({
	component: ForgotPasswordPage,
})

const schema = z.object({
	email: z.string().email("To'g'ri email kiriting"),
})

type FormData = z.infer<typeof schema>

function ForgotPasswordPage() {
	const navigate = useNavigate()
	const [isLoading, setIsLoading] = useState(false)

	const form = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: { email: '' },
	})

	const onSubmit = async (data: FormData) => {
		setIsLoading(true)
		try {
			await authApi.forgotPassword(data.email)
			toast.success('Tiklash havolasi yuborildi')
			navigate({ to: '/reset-password', search: { email: data.email } })
		} catch {
			toast.error('Xatolik yuz berdi. Qaytadan urinib ko\'ring.')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Card>
			<CardHeader className='text-center'>
				<CardTitle className='text-2xl'>Parolni tiklash</CardTitle>
				<CardDescription>
					Email manzilingizni kiriting. Parolni tiklash havolasi yuboriladi.
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

						<Button type='submit' className='w-full' disabled={isLoading}>
							{isLoading ? 'Yuborilmoqda...' : 'Havolani yuborish'}
						</Button>
					</form>
				</Form>

				<div className='mt-6 text-center text-sm'>
					<Link
						to='/login'
						className='text-muted-foreground hover:text-foreground'
					>
						<ArrowLeft className='mr-1 inline h-3 w-3' />
						Kirish sahifasiga qaytish
					</Link>
				</div>
			</CardContent>
		</Card>
	)
}
