import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, isToday } from 'date-fns'
import { uz } from 'date-fns/locale'
import { useState } from 'react'
import {
	CalendarDays,
	CalendarRange,
	PartyPopper,
	Plus,
	Repeat,
	Trash2,
	VolumeX,
} from 'lucide-react'
import { toast } from 'sonner'
import { RouteErrorBoundary } from '@/components/route-error-boundary'
import { Badge } from '@/components/ui/badge'
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { createFileRoute } from '@tanstack/react-router'
import { deviceApi } from '@/lib/device-api'

export const Route = createFileRoute('/_authenticated/holidays')({
	component: HolidaysPage,
	errorComponent: ({ error, reset }) => (
		<RouteErrorBoundary error={error} reset={reset} />
	),
})

const MONTHS = [
	'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
	'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
]

function HolidaysPage() {
	const { data: holidays, isLoading: loadingHolidays } = useQuery({
		queryKey: ['holidays'],
		queryFn: () => deviceApi.getHolidays(),
	})

	const { data: ranges, isLoading: loadingRanges } = useQuery({
		queryKey: ['holiday-ranges'],
		queryFn: () => deviceApi.getHolidayRanges(),
	})

	return (
		<div className='space-y-6'>
			<div>
				<h1 className='text-2xl font-bold tracking-tight'>🎉 Bayram kunlari</h1>
				<p className='text-muted-foreground'>
					Qo&apos;ng&apos;iroq chalinmaydigan kunlar va oralig&apos;lar
				</p>
			</div>

			<TodaySilentButton />

			<HolidayRangesCard
				ranges={ranges?.results ?? []}
				isLoading={loadingRanges}
			/>

			<HolidayDatesCard
				holidays={holidays?.results ?? []}
				isLoading={loadingHolidays}
			/>
		</div>
	)
}

function TodaySilentButton() {
	const today = new Date().toISOString().slice(0, 10)
	const [isSilent, setIsSilent] = useState(() => {
		return localStorage.getItem('silent_date') === today
	})
	const silentMutation = useMutation({
		mutationFn: () => deviceApi.setTodaySilent(),
		onSuccess: () => {
			const newState = !isSilent
			setIsSilent(newState)
			if (newState) {
				localStorage.setItem('silent_date', today)
				toast.success("Bugun qo'ng'iroq o'chirildi")
			} else {
				localStorage.removeItem('silent_date')
				toast.success("Qo'ng'iroq yoqildi")
			}
		},
		onError: () => toast.error('Xatolik yuz berdi'),
	})

	return (
		<Card>
			<CardContent className='flex items-center justify-between py-4'>
				<div className='flex items-center gap-3'>
					<VolumeX className='h-5 w-5 text-orange-500' />
					<div>
						<p className='text-sm font-medium'>Bugun bayram</p>
						<p className='text-xs text-muted-foreground'>
							{isSilent ? "Bugun qo'ng'iroq chalinmaydi" : "Qo'ng'iroq oddiy rejimda ishlaydi"}
						</p>
					</div>
				</div>
				<Switch
					checked={isSilent}
					onCheckedChange={() => silentMutation.mutate()}
					disabled={silentMutation.isPending}
				/>
			</CardContent>
		</Card>
	)
}

function HolidayRangesCard({ ranges, isLoading }: { ranges: Array<{ id: string; name: string; from_month: number; from_day: number; to_month: number; to_day: number }>; isLoading: boolean }) {
	const queryClient = useQueryClient()
	const [showForm, setShowForm] = useState(false)
	const [name, setName] = useState('')
	const [fromMonth, setFromMonth] = useState('6')
	const [fromDay, setFromDay] = useState('1')
	const [toMonth, setToMonth] = useState('8')
	const [toDay, setToDay] = useState('31')

	const createMutation = useMutation({
		mutationFn: () =>
			deviceApi.createHolidayRange({
				name,
				from_month: Number(fromMonth),
				from_day: Number(fromDay),
				to_month: Number(toMonth),
				to_day: Number(toDay),
			}),
		onSuccess: () => {
			toast.success("Tatil oralig'i qo'shildi")
			queryClient.invalidateQueries({ queryKey: ['holiday-ranges'] })
			setShowForm(false)
			setName('')
		},
		onError: () => toast.error('Xatolik yuz berdi'),
	})

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deviceApi.deleteHolidayRange(id),
		onSuccess: () => {
			toast.success("O'chirildi")
			queryClient.invalidateQueries({ queryKey: ['holiday-ranges'] })
		},
	})

	return (
		<Card>
			<CardHeader>
				<div className='flex items-center justify-between'>
					<CardTitle className='flex items-center gap-2'>
						<CalendarRange className='h-5 w-5' />
						Tatil oralig&apos;lari
						{ranges.length > 0 && <Badge variant='secondary'>{ranges.length}</Badge>}
					</CardTitle>
					<Button variant='outline' size='sm' onClick={() => setShowForm(!showForm)}>
						<Plus className='mr-2 h-4 w-4' />
						Qo&apos;shish
					</Button>
				</div>
				<CardDescription>Yozgi/qishki tatil kabi uzoq muddatli dam olish kunlari</CardDescription>
			</CardHeader>
			<CardContent>
				{showForm && (
					<div className='mb-4 space-y-3 rounded-lg border p-4'>
						<div>
							<Label>Nomi</Label>
							<Input value={name} onChange={(e) => setName(e.target.value)} placeholder='Yozgi tatil' />
						</div>
						<div className='grid grid-cols-2 gap-4'>
							<div className='space-y-2'>
								<Label>Boshlanishi</Label>
								<div className='flex gap-2'>
									<Select value={fromMonth} onValueChange={setFromMonth}>
										<SelectTrigger><SelectValue /></SelectTrigger>
										<SelectContent>
											{MONTHS.map((m, i) => (
												<SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Input type='number' min={1} max={31} value={fromDay} onChange={(e) => setFromDay(e.target.value)} className='w-20' />
								</div>
							</div>
							<div className='space-y-2'>
								<Label>Tugashi</Label>
								<div className='flex gap-2'>
									<Select value={toMonth} onValueChange={setToMonth}>
										<SelectTrigger><SelectValue /></SelectTrigger>
										<SelectContent>
											{MONTHS.map((m, i) => (
												<SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Input type='number' min={1} max={31} value={toDay} onChange={(e) => setToDay(e.target.value)} className='w-20' />
								</div>
							</div>
						</div>
						<Button onClick={() => createMutation.mutate()} disabled={!name || createMutation.isPending}>
							{createMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
						</Button>
					</div>
				)}

				{isLoading ? (
					<div className='space-y-3'>
						{[1, 2].map((i) => <Skeleton key={i} className='h-14 w-full' />)}
					</div>
				) : ranges.length === 0 ? (
					<p className='py-6 text-center text-muted-foreground'>
						Tatil oralig&apos;lari yo&apos;q
					</p>
				) : (
					<div className='space-y-2'>
						{ranges.map((r) => (
							<div key={r.id} className='flex items-center justify-between rounded-md border p-3'>
								<div className='flex items-center gap-3'>
									<CalendarRange className='h-5 w-5 text-blue-500' />
									<div>
										<p className='text-sm font-medium'>{r.name}</p>
										<p className='text-xs text-muted-foreground'>
											{r.from_day} {MONTHS[r.from_month - 1]} — {r.to_day} {MONTHS[r.to_month - 1]}
										</p>
									</div>
								</div>
								<Button
									variant='ghost'
									size='icon'
									onClick={() => deleteMutation.mutate(r.id)}
									disabled={deleteMutation.isPending}
								>
									<Trash2 className='h-4 w-4 text-muted-foreground hover:text-destructive' />
								</Button>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}

function HolidayDatesCard({ holidays, isLoading }: { holidays: Array<{ id: string; name: string; date: string; recurring: boolean }>; isLoading: boolean }) {
	const queryClient = useQueryClient()
	const [showForm, setShowForm] = useState(false)
	const [name, setName] = useState('')
	const [date, setDate] = useState('')
	const [recurring, setRecurring] = useState(true)

	const createMutation = useMutation({
		mutationFn: () => deviceApi.createHoliday({ name, date, recurring }),
		onSuccess: () => {
			toast.success("Bayram kuni qo'shildi")
			queryClient.invalidateQueries({ queryKey: ['holidays'] })
			setShowForm(false)
			setName('')
			setDate('')
		},
		onError: () => toast.error('Xatolik yuz berdi'),
	})

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deviceApi.deleteHoliday(id),
		onSuccess: () => {
			toast.success("O'chirildi")
			queryClient.invalidateQueries({ queryKey: ['holidays'] })
		},
	})

	return (
		<Card>
			<CardHeader>
				<div className='flex items-center justify-between'>
					<CardTitle className='flex items-center gap-2'>
						<CalendarDays className='h-5 w-5' />
						Bayram kunlari
						{holidays.length > 0 && <Badge variant='secondary'>{holidays.length}</Badge>}
					</CardTitle>
					<Button variant='outline' size='sm' onClick={() => setShowForm(!showForm)}>
						<Plus className='mr-2 h-4 w-4' />
						Qo&apos;shish
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{showForm && (
					<div className='mb-4 space-y-3 rounded-lg border p-4'>
						<div>
							<Label>Nomi</Label>
							<Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Navro'z" />
						</div>
						<div>
							<Label>Sana</Label>
							<Input type='date' value={date} onChange={(e) => setDate(e.target.value)} />
						</div>
						<div className='flex items-center gap-2'>
							<Switch checked={recurring} onCheckedChange={setRecurring} id='recurring' />
							<Label htmlFor='recurring'>Har yili takrorlanadi</Label>
						</div>
						<Button onClick={() => createMutation.mutate()} disabled={!name || !date || createMutation.isPending}>
							{createMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
						</Button>
					</div>
				)}

				{isLoading ? (
					<div className='space-y-3'>
						{[1, 2, 3].map((i) => <Skeleton key={i} className='h-14 w-full' />)}
					</div>
				) : holidays.length === 0 ? (
					<p className='py-6 text-center text-muted-foreground'>
						Bayramlar topilmadi
					</p>
				) : (
					<div className='space-y-2'>
						{holidays.map((holiday) => (
							<div
								key={holiday.id}
								className={`flex items-center justify-between rounded-md border p-3 ${isToday(new Date(holiday.date)) ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950' : ''}`}
							>
								<div className='flex items-center gap-3'>
									<PartyPopper className='h-5 w-5 text-yellow-500' />
									<div>
										<p className='text-sm font-medium'>{holiday.name}</p>
										<p className='text-xs text-muted-foreground'>
											{format(new Date(holiday.date), 'd MMMM yyyy', { locale: uz })}
										</p>
									</div>
								</div>
								<div className='flex items-center gap-2'>
									{isToday(new Date(holiday.date)) && (
										<Badge variant='default' className='bg-yellow-500'>Bugun</Badge>
									)}
									{holiday.recurring && (
										<Badge variant='outline' className='gap-1'>
											<Repeat className='h-3 w-3' />
											Har yili
										</Badge>
									)}
									<Button
										variant='ghost'
										size='icon'
										onClick={() => deleteMutation.mutate(holiday.id)}
										disabled={deleteMutation.isPending}
									>
										<Trash2 className='h-4 w-4 text-muted-foreground hover:text-destructive' />
									</Button>
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
