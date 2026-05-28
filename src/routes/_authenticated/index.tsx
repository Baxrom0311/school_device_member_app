import { ScheduleCard } from '@/components/schedule-card'
import { WifiSetupGuide } from '@/components/wifi-setup-guide'
import { Badge } from '@/components/ui/badge'
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
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { deviceApi, type Device } from '@/lib/device-api'
import { useAuthStore } from '@/stores/auth-store'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RouteErrorBoundary } from '@/components/route-error-boundary'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
	Activity,
	AlertTriangle,
	Battery,
	Calendar,
	Check,
	Clock,
	Cpu,
	PartyPopper,
	Settings,
	ShieldAlert,
	Volume2,
	Wifi,
	WifiOff,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { useEmergencyWs } from '@/hooks/use-emergency-ws'

export const Route = createFileRoute('/_authenticated/')({
	component: DashboardPage,
	errorComponent: ({ error, reset }) => (
		<RouteErrorBoundary error={error} reset={reset} />
	),
})

function DashboardPage() {
	const { user } = useAuthStore()

	const {
		data: devicesData,
		isLoading,
		error,
	} = useQuery({
		queryKey: ['my-devices'],
		queryFn: deviceApi.getMyDevices,
		staleTime: 1000 * 15, // 15 seconds for device status freshness
		refetchInterval: 30000, // Real-time status: refresh every 30s
	})

	const device = devicesData?.results?.[0] // Only one device per user
	const hasDevice = !!device

	if (isLoading) {
		return <DashboardSkeleton />
	}

	if (error) {
		return (
			<Card className='max-w-2xl mx-auto'>
				<CardContent className='pt-6'>
					<p className='text-center text-destructive'>
						Xatolik yuz berdi. Sahifani yangilang.
					</p>
				</CardContent>
			</Card>
		)
	}

	// No device - show claim page
	if (!hasDevice) {
		return (
			<ClaimDeviceCard
				userName={user?.first_name || user?.username}
				organizationName={user?.organization_name}
			/>
		)
	}

	// Has device - show device management
	return <DeviceDashboard device={device} />
}

// ============== Device Dashboard ==============
function DeviceDashboard({ device }: { device: Device }) {
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const [ringConfirmOpen, setRingConfirmOpen] = useState(false)
	const [emergencyConfirmOpen, setEmergencyConfirmOpen] = useState(false)
	const { user } = useAuthStore()
	const canTriggerEmergency = user?.role === 'ADMIN' || user?.role === 'SCHOOL_ADMIN'

	const onAlert = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ['alerts'] })
	}, [queryClient])

	useEmergencyWs({ onAlert, onResolved: onAlert })

	const { data: todayHoliday } = useQuery({
		queryKey: ['today-holiday'],
		queryFn: async () => {
			const today = new Date().toISOString().slice(0, 10)
			const resp = await deviceApi.getHolidays(today)
			return resp.results[0] ?? null
		},
		staleTime: 1000 * 60 * 60,
	})

	const [ringStatus, setRingStatus] = useState<string | null>(null)

	const ringMutation = useMutation({
		mutationFn: () => deviceApi.ringBell(device.id),
		onSuccess: (data) => {
			setRingConfirmOpen(false)
			setRingStatus('sent')
			toast.info("Yuborildi...")
			deviceApi.pollCommandStatus(data.msg_id, (status) => {
				setRingStatus(status)
				if (status === 'delivered') {
					toast.success("Chalindi ✅")
				} else {
					toast.error("Yetib bormadi ❌")
				}
				setTimeout(() => setRingStatus(null), 3000)
			})
		},
		onError: () => {
			setRingConfirmOpen(false)
			toast.error("Qo'ng'iroq chalinmadi. Qurilma offline bo'lishi mumkin.")
		},
	})

	const emergencyMutation = useMutation({
		mutationFn: () => deviceApi.triggerEmergency(device.id, 'emergency_ring'),
		onSuccess: () => {
			setEmergencyConfirmOpen(false)
			toast.success('Favqulodda signal yuborildi!')
			queryClient.invalidateQueries({ queryKey: ['alerts'] })
		},
		onError: () => {
			setEmergencyConfirmOpen(false)
			toast.error("Signal yuborilmadi. Qurilma offline bo'lishi mumkin.")
		},
	})

	return (
		<div className='space-y-6'>
			<AlertDialog
				open={ringConfirmOpen}
				onOpenChange={setRingConfirmOpen}
				title="Qo'ng'iroq chalish"
				description="Hozir qo'ng'iroq chalinsinmi?"
				confirmLabel="Chalish"
				onConfirm={() => ringMutation.mutate()}
				loading={ringMutation.isPending}
			/>

			<AlertDialog
				open={emergencyConfirmOpen}
				onOpenChange={setEmergencyConfirmOpen}
				title="⚠️ Favqulodda signal"
				description="Barcha qurilmalarga favqulodda signal yuboriladi. Davom etasizmi?"
				confirmLabel="Signal yuborish"
				variant="destructive"
				onConfirm={() => emergencyMutation.mutate()}
				loading={emergencyMutation.isPending}
			/>

			{/* Header */}
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<h1 className='text-2xl font-bold tracking-tight'>
						{device.school_name || device.name || 'Mening qurilmam'}
					</h1>
					<p className='font-mono text-sm text-muted-foreground'>
						{device.device_id}
					</p>
				</div>
				<Badge
					variant={device.status === 'active' ? 'default' : 'secondary'}
					className='w-fit text-sm'
				>
					{device.status === 'active' ? (
						<>
							<Wifi className='mr-1 h-4 w-4' /> Online
						</>
					) : (
						<>
							<WifiOff className='mr-1 h-4 w-4' /> Offline
						</>
					)}
				</Badge>
			</div>

			{/* Holiday banner */}
			{todayHoliday && (
				<Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
					<CardContent className="flex items-center gap-3 p-4">
						<PartyPopper className="h-5 w-5 text-yellow-600 shrink-0" />
						<div>
							<p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
								Bugun bayram: {todayHoliday.name}
							</p>
							<p className="text-xs text-yellow-600 dark:text-yellow-400">
								Qo'ng'iroq avtomatik o'chirilgan
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* RTC Battery Warning */}
			{device.rtc_battery_dead && (
				<Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
					<CardContent className="flex items-center gap-3 p-4">
						<Battery className="h-5 w-5 text-red-600 shrink-0" />
						<div>
							<p className="text-sm font-medium text-red-800 dark:text-red-200">
								⚠️ RTC batareykasi zaiflashgan
							</p>
							<p className="text-xs text-red-600 dark:text-red-400">
								Qurilma vaqtni to'g'ri saqlay olmaydi. Batareykani almashtiring.
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Schedule Stale Warning */}
			{device.schedule_stale && (
				<Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
					<CardContent className="flex items-center gap-3 p-4">
						<Calendar className="h-5 w-5 text-orange-600 shrink-0" />
						<div>
							<p className="text-sm font-medium text-orange-800 dark:text-orange-200">
								Jadval 7+ kun sinxronlanmagan
							</p>
							<p className="text-xs text-orange-600 dark:text-orange-400">
								Qurilma eski jadval bilan ishlayapti. Internet ulanishini tekshiring.
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* WiFi Setup Guide - shown when device is offline */}
			{device.status !== 'active' && (
				<WifiSetupGuide device={device} />
			)}

			{/* Quick Actions */}
			<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
				<Card
					role='button'
					tabIndex={0}
					aria-label="Qo'ng'iroq chalish"
					className='cursor-pointer transition-colors hover:bg-accent/50'
					onClick={() =>
						!ringMutation.isPending &&
						device.status === 'active' &&
						setRingConfirmOpen(true)
					}
					onKeyDown={e => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault()
							!ringMutation.isPending &&
								device.status === 'active' &&
								setRingConfirmOpen(true)
						}
					}}
				>
					<CardContent className='flex items-center gap-4 p-4'>
						<div className='rounded-full bg-primary/10 p-2'>
							<Volume2 className='h-5 w-5 text-primary' />
						</div>
						<div>
							<p className='font-medium'>Qo'ng'iroq</p>
							<p className='text-xs text-muted-foreground'>
								{ringMutation.isPending ? 'Yuborilmoqda...' :
								 ringStatus === 'sent' ? 'Yuborildi...' :
								 ringStatus === 'delivered' ? 'Chalindi ✅' :
								 ringStatus === 'failed' || ringStatus === 'timeout' ? 'Yetib bormadi ❌' :
								 'Hozir chalish'}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card
					role='button'
					tabIndex={0}
					aria-label="Jadval bo'limiga o'tish"
					className='cursor-pointer transition-colors hover:bg-accent/50'
					onClick={() =>
						document
							.getElementById('schedule-section')
							?.scrollIntoView({ behavior: 'smooth' })
					}
					onKeyDown={e => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault()
							document
								.getElementById('schedule-section')
								?.scrollIntoView({ behavior: 'smooth' })
						}
					}}
				>
					<CardContent className='flex items-center gap-4 p-4'>
						<div className='rounded-full bg-blue-500/10 p-2'>
							<Calendar className='h-5 w-5 text-blue-500' />
						</div>
						<div>
							<p className='font-medium'>Jadval</p>
							<p className='text-xs text-muted-foreground'>
								Qo'ng'iroq vaqtlari
							</p>
						</div>
					</CardContent>
				</Card>

				<Card
					role='button'
					tabIndex={0}
					aria-label="Qo'ng'iroq tarixi"
					className='cursor-pointer transition-colors hover:bg-accent/50'
					onClick={() => navigate({ to: '/bell-logs' })}
					onKeyDown={e => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault()
							navigate({ to: '/bell-logs' })
						}
					}}
				>
					<CardContent className='flex items-center gap-4 p-4'>
						<div className='rounded-full bg-green-500/10 p-2'>
							<Clock className='h-5 w-5 text-green-500' />
						</div>
						<div>
							<p className='font-medium'>Tarix</p>
							<p className='text-xs text-muted-foreground'>Qo'ng'iroqlar</p>
						</div>
					</CardContent>
				</Card>

				<Card
					role='button'
					tabIndex={0}
					aria-label="Sozlamalar sahifasiga o'tish"
					className='cursor-pointer transition-colors hover:bg-accent/50'
					onClick={() => navigate({ to: '/settings' })}
					onKeyDown={e => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault()
							navigate({ to: '/settings' })
						}
					}}
				>
					<CardContent className='flex items-center gap-4 p-4'>
						<div className='rounded-full bg-orange-500/10 p-2'>
							<Settings className='h-5 w-5 text-orange-500' />
						</div>
						<div>
							<p className='font-medium'>Sozlamalar</p>
							<p className='text-xs text-muted-foreground'>Profil</p>
						</div>
					</CardContent>
				</Card>

				<Card
					role='button'
					tabIndex={0}
					aria-label="Qurilma diagnostikasi"
					className='cursor-pointer transition-colors hover:bg-accent/50'
					onClick={() => navigate({ to: '/device-health' })}
					onKeyDown={e => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault()
							navigate({ to: '/device-health' })
						}
					}}
				>
					<CardContent className='flex items-center gap-4 p-4'>
						<div className={`rounded-full p-2 ${device.rtc_battery_dead || device.schedule_stale ? 'bg-yellow-500/10' : 'bg-purple-500/10'}`}>
							<Activity className={`h-5 w-5 ${device.rtc_battery_dead || device.schedule_stale ? 'text-yellow-500' : 'text-purple-500'}`} />
						</div>
						<div>
							<p className='font-medium'>Diagnostika</p>
							<p className='text-xs text-muted-foreground'>
								{device.rtc_battery_dead ? 'RTC ⚠️' : device.schedule_stale ? 'Sinxron ⚠️' : 'Normal'}
							</p>
						</div>
					</CardContent>
				</Card>

				{canTriggerEmergency && (
					<Card
						role='button'
						tabIndex={0}
						aria-label="Favqulodda signal yuborish"
						className='cursor-pointer transition-colors hover:bg-red-50 dark:hover:bg-red-950 border-red-200 dark:border-red-900'
						onClick={() =>
							!emergencyMutation.isPending &&
							device.status === 'active' &&
							setEmergencyConfirmOpen(true)
						}
						onKeyDown={e => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault()
								!emergencyMutation.isPending &&
									device.status === 'active' &&
									setEmergencyConfirmOpen(true)
							}
						}}
					>
						<CardContent className='flex items-center gap-4 p-4'>
							<div className='rounded-full bg-red-500/10 p-2'>
								<ShieldAlert className='h-5 w-5 text-red-500' />
							</div>
							<div>
								<p className='font-medium text-red-700 dark:text-red-400'>Favqulodda</p>
								<p className='text-xs text-muted-foreground'>
									{device.status !== 'active' ? 'Qurilma offline' : 'Signal yuborish'}
								</p>
							</div>
						</CardContent>
					</Card>
				)}
			</div>

			{/* Device Info */}
			<Card>
				<CardHeader>
					<CardTitle>Qurilma ma'lumotlari</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
						<div>
							<p className='text-sm text-muted-foreground'>MAC Address</p>
							<p className='font-mono font-medium'>{device.device_id}</p>
						</div>
						<div>
							<p className='text-sm text-muted-foreground'>Firmware</p>
							<p className='font-medium'>
								{device.firmware_version || "Noma'lum"}
							</p>
						</div>
						<div>
							<p className='text-sm text-muted-foreground'>Oxirgi faollik</p>
							<p className='font-medium'>
								{device.last_seen
									? new Date(device.last_seen).toLocaleString('uz-UZ')
									: 'Hali ulanmagan'}
							</p>
						</div>
						<div>
							<p className='text-sm text-muted-foreground'>Signal (RSSI)</p>
							<p className='font-medium'>
								{device.rssi != null ? (
									<span className={device.rssi > -60 ? 'text-green-600' : device.rssi > -75 ? 'text-yellow-600' : 'text-red-600'}>
										{device.rssi} dBm
									</span>
								) : "Noma'lum"}
							</p>
						</div>
						<div>
							<p className='text-sm text-muted-foreground'>Uptime</p>
							<p className='font-medium'>
								{device.uptime_sec != null
									? device.uptime_sec >= 3600
										? `${Math.floor(device.uptime_sec / 3600)}s ${Math.floor((device.uptime_sec % 3600) / 60)}d`
										: `${Math.floor(device.uptime_sec / 60)}d`
									: "Noma'lum"}
							</p>
						</div>
						<div>
							<p className='text-sm text-muted-foreground'>Xotira (Heap)</p>
							<p className='font-medium'>
								{device.free_heap != null
									? `${(device.free_heap / 1024).toFixed(0)} KB`
									: "Noma'lum"}
							</p>
						</div>
						<div>
							<p className='text-sm text-muted-foreground'>RTC holati</p>
							<p className='font-medium'>
								{device.rtc_battery_dead ? (
									<span className='text-red-600 flex items-center gap-1'>
										<AlertTriangle className='h-3.5 w-3.5' />
										Batareya o'lgan
									</span>
								) : device.rtc_drift_sec != null && device.rtc_drift_sec > 300 ? (
									<span className='text-yellow-600'>
										Drift: {device.rtc_drift_sec}s
									</span>
								) : (
									<span className='text-green-600'>Normal</span>
								)}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Schedule Section */}
			<div id='schedule-section'>
				<ScheduleCard device={device} />
			</div>
		</div>
	)
}

// ============== Claim Device Schema ==============
const claimSchema = z.object({
	device_id: z
		.string()
		.min(1, 'MAC manzil kiritilishi shart')
		.regex(
			/^([0-9A-Fa-f]{2}[:-]?){5}([0-9A-Fa-f]{2})$|^[0-9A-Fa-f]{12}$/,
			"MAC manzil formati noto'g'ri (masalan: AA:BB:CC:DD:EE:FF)"
		),
	device_name: z.string().optional(),
})

type ClaimFormData = z.infer<typeof claimSchema>

// ============== Claim Device Card ==============
interface ClaimDeviceCardProps {
	userName?: string
	organizationName?: string
}

function ClaimDeviceCard({ userName, organizationName }: ClaimDeviceCardProps) {
	const queryClient = useQueryClient()
	const [isLoading, setIsLoading] = useState(false)
	const [claimedDevice, setClaimedDevice] = useState<any>(null)

	const form = useForm<ClaimFormData>({
		resolver: zodResolver(claimSchema),
		defaultValues: {
			device_id: '',
			device_name: '',
		},
	})

	const onSubmit = async (data: ClaimFormData) => {
		setIsLoading(true)
		try {
			const response = await deviceApi.claimDevice(data)
			setClaimedDevice(response.device)
			toast.success("Qurilma muvaffaqiyatli qo'shildi!", {
				description: response.message,
			})
		} catch (error: unknown) {
			console.error('Claim error:', error)
			if (error && typeof error === 'object' && 'response' in error) {
				const axiosError = error as {
					response?: { data?: { detail?: string; device_id?: string[] } }
				}
				const errorData = axiosError.response?.data
				if (errorData?.detail) {
					toast.error(errorData.detail)
				} else if (errorData?.device_id) {
					toast.error(errorData.device_id[0])
				} else {
					toast.error("Qurilmani qo'shishda xatolik")
				}
			} else {
				toast.error('Tizimda xatolik yuz berdi')
			}
		} finally {
			setIsLoading(false)
		}
	}

	const handleGoToDashboard = () => {
		setClaimedDevice(null)
		queryClient.invalidateQueries({ queryKey: ['my-devices'] })
	}

	// Success state
	if (claimedDevice) {
		return (
			<div className='flex min-h-[60vh] items-center justify-center'>
				<Card className='w-full max-w-md'>
					<CardHeader className='text-center'>
						<div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900'>
							<Check className='h-8 w-8 text-green-600 dark:text-green-400' />
						</div>
						<CardTitle className='text-xl'>
							Qurilma muvaffaqiyatli qo'shildi!
						</CardTitle>
						<CardDescription>
							Endi qurilmangizni boshqarishingiz mumkin.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='rounded-lg border p-4'>
							<div className='space-y-2 text-sm'>
								<div className='flex justify-between'>
									<span className='text-muted-foreground'>MAC Address:</span>
									<span className='font-mono'>{claimedDevice.device_id}</span>
								</div>
								{claimedDevice.school_name && (
									<div className='flex justify-between'>
										<span className='text-muted-foreground'>Nomi:</span>
										<span>{claimedDevice.school_name}</span>
									</div>
								)}
								<div className='flex justify-between'>
									<span className='text-muted-foreground'>Holati:</span>
									<span className='capitalize'>{claimedDevice.status}</span>
								</div>
							</div>
						</div>

						<Button className='w-full' onClick={handleGoToDashboard}>
							Boshqaruvga o'tish
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	// Claim form
	return (
		<div className='flex min-h-[60vh] items-center justify-center'>
			<Card className='w-full max-w-md'>
				<CardHeader className='text-center'>
					<div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10'>
						<Cpu className='h-8 w-8 text-primary' />
					</div>
					<CardTitle className='text-xl'>
						Xush kelibsiz{userName ? `, ${userName}` : ''}!
					</CardTitle>
					{organizationName && (
						<p className='text-muted-foreground'>{organizationName}</p>
					)}
					<CardDescription>
						Qurilmangiz ustidagi stikerdan MAC addressni kiriting.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
							<FormField
								control={form.control}
								name='device_id'
								render={({ field }) => (
									<FormItem>
										<FormLabel>MAC Address</FormLabel>
										<FormControl>
											<Input
												placeholder='AA:BB:CC:DD:EE:FF'
												className='font-mono'
												{...field}
												onChange={e => {
													// Auto-format MAC address
													let value = e.target.value
														.toUpperCase()
														.replace(/[^A-F0-9]/g, '')
													if (value.length > 12) value = value.slice(0, 12)
													const formatted =
														value.match(/.{1,2}/g)?.join(':') || value
													field.onChange(formatted)
												}}
											/>
										</FormControl>
										<FormDescription>
											Qurilma ustidagi stikerdan MAC addressni kiriting
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name='device_name'
								render={({ field }) => (
									<FormItem>
										<FormLabel>Qurilma nomi (ixtiyoriy)</FormLabel>
										<FormControl>
											<Input
												placeholder='Maktab qongiroq qurilmasi'
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Button type='submit' className='w-full' disabled={isLoading}>
								{isLoading ? 'Ulanmoqda...' : "Qurilmani qo'shish"}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	)
}

function DashboardSkeleton() {
	return (
		<Card className='max-w-2xl mx-auto'>
			<CardHeader>
				<div className='flex items-center justify-between'>
					<div className='space-y-2'>
						<Skeleton className='h-6 w-40' />
						<Skeleton className='h-4 w-60' />
					</div>
					<Skeleton className='h-6 w-16' />
				</div>
			</CardHeader>
			<CardContent className='space-y-4'>
				<div className='grid grid-cols-2 gap-4'>
					{[1, 2, 3, 4].map(i => (
						<div key={i} className='space-y-2'>
							<Skeleton className='h-4 w-24' />
							<Skeleton className='h-5 w-32' />
						</div>
					))}
				</div>
				<Skeleton className='h-10 w-full mt-4' />
			</CardContent>
		</Card>
	)
}
