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
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { ScheduleGeneratorDialog } from '@/components/schedule-generator-dialog'
import { useScheduleEditor } from '@/hooks/use-schedule-editor'
import { deviceApi } from '@/lib/device-api'
import { calculateDuration } from '@/lib/schedule-utils'
import { cn } from '@/lib/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
	AlertCircle,
	ArrowLeft,
	Calendar,
	Check,
	Clock,
	GraduationCap,
	Plus,
	RefreshCw,
	Send,
	Trash2,
} from 'lucide-react'

export const Route = createFileRoute('/_authenticated/schedules')({
	component: SchedulesPage,
})

function SchedulesPage() {
	const queryClient = useQueryClient()

	const { data: devicesData, isLoading: isLoadingDevices } = useQuery({
		queryKey: ['my-devices'],
		queryFn: deviceApi.getMyDevices,
	})

	const device = devicesData?.results?.[0]

	const {
		data: schedule,
		isLoading: isLoadingSchedule,
		error: scheduleError,
	} = useQuery({
		queryKey: ['schedule', device?.id],
		queryFn: () => deviceApi.getSchedule(device?.id ?? ''),
		enabled: !!device?.id,
	})

	const {
		pairs,
		isActive,
		setIsActive,
		hasChanges,
		isMutating,
		handlePairChange,
		addPair,
		removePair,
		handleGeneratedSchedule,
		clearAll,
		handleSave,
		handleSync,
	} = useScheduleEditor({ deviceId: device?.id ?? '', schedule })

	const isLoading = isLoadingDevices || isLoadingSchedule

	if (isLoading) return <SchedulesSkeleton />

	if (!device) {
		return (
			<div className='flex min-h-[60vh] items-center justify-center'>
				<Card className='max-w-md text-center'>
					<CardContent className='pt-6'>
						<AlertCircle className='mx-auto mb-4 h-12 w-12 text-muted-foreground' />
						<h2 className='mb-2 text-lg font-semibold'>Qurilma topilmadi</h2>
						<p className='mb-4 text-sm text-muted-foreground'>
							Avval qurilma ulashingiz kerak
						</p>
						<Link to='/'>
							<Button>Bosh sahifaga</Button>
						</Link>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (scheduleError) {
		return (
			<div className='flex min-h-[60vh] items-center justify-center'>
				<Card className='max-w-md text-center'>
					<CardContent className='pt-6'>
						<AlertCircle className='mx-auto mb-4 h-12 w-12 text-destructive' />
						<h2 className='mb-2 text-lg font-semibold'>Xatolik yuz berdi</h2>
						<p className='mb-4 text-sm text-muted-foreground'>
							Jadval yuklanmadi. Qaytadan urinib ko&apos;ring.
						</p>
						<Button
							onClick={() =>
								queryClient.invalidateQueries({
									queryKey: ['schedule', device?.id],
								})
							}
						>
							Qayta yuklash
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	const needsSync = schedule?.sync_pending || false
	const validPairsCount = pairs.filter(p => p.entry && p.exit).length

	return (
		<div className='mx-auto max-w-2xl space-y-6'>
			<div className='flex items-center justify-between'>
				<div className='flex items-center gap-4'>
					<Link to='/'>
						<Button variant='ghost' size='icon'>
							<ArrowLeft className='h-5 w-5' />
						</Button>
					</Link>
					<div>
						<h1 className='text-2xl font-bold tracking-tight'>
							Qo&apos;ng&apos;iroq jadvali
						</h1>
						<p className='text-sm text-muted-foreground'>
							{device.school_name || device.device_id}
						</p>
					</div>
				</div>
			</div>

			{needsSync && (
				<Card className='border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950'>
					<CardContent className='flex items-center gap-3 py-3'>
						<AlertCircle className='h-5 w-5 text-orange-500' />
						<p className='text-sm'>
							Jadvaldagi o&apos;zgarishlar qurilmaga jo&apos;natilmagan.
						</p>
					</CardContent>
				</Card>
			)}

			<Card className='overflow-hidden'>
				<CardHeader className='bg-muted/30 pb-4'>
					<div className='flex items-start justify-between'>
						<div className='space-y-1'>
							<CardTitle className='flex items-center gap-2 text-lg'>
								<Calendar className='h-5 w-5 text-primary' />
								Qo&apos;ng&apos;iroq jadvali
							</CardTitle>
							<CardDescription className='flex items-center gap-2'>
								{validPairsCount > 0 ? (
									<>
										<GraduationCap className='h-4 w-4' />
										{validPairsCount} ta dars · {validPairsCount * 2} ta
										qo&apos;ng&apos;iroq
									</>
								) : (
									"Dars vaqtlarini qo'shing"
								)}
							</CardDescription>
						</div>
						<div className='flex items-center gap-3'>
							{needsSync && (
								<Badge variant='destructive' className='gap-1'>
									<AlertCircle className='h-3 w-3' />
									Sinxronlanmagan
								</Badge>
							)}
							{hasChanges && (
								<Badge
									variant='outline'
									className='gap-1 border-amber-500 text-amber-600'
								>
									<RefreshCw className='h-3 w-3' />
									O&apos;zgartirilgan
								</Badge>
							)}
							<div className='flex items-center gap-2 rounded-full bg-background px-3 py-1.5'>
								<Switch
									id='schedule-active'
									checked={isActive}
									onCheckedChange={setIsActive}
								/>
								<Label
									htmlFor='schedule-active'
									className='cursor-pointer text-sm font-medium'
								>
									{isActive ? 'Faol' : 'Nofaol'}
								</Label>
							</div>
						</div>
					</div>
				</CardHeader>

				<CardContent className='p-4'>
					<div className='mb-4 flex gap-2'>
						<ScheduleGeneratorDialog onGenerate={handleGeneratedSchedule} />
						{pairs.length > 0 && (
							<Button
								type='button'
								variant='ghost'
								size='sm'
								onClick={clearAll}
								className='text-muted-foreground hover:text-destructive'
							>
								Tozalash
							</Button>
						)}
					</div>

					{pairs.length > 0 ? (
						<div className='space-y-2'>
							<div className='grid grid-cols-[auto_1fr_1fr_auto] items-center gap-3 px-1 text-xs font-medium text-muted-foreground'>
								<span className='w-8'>Dars</span>
								<span className='text-center'>Kirish</span>
								<span className='text-center'>Chiqish</span>
								<span className='w-9'></span>
							</div>
							<Separator />
							{pairs.map((pair, index) => {
								const duration = calculateDuration(pair.entry, pair.exit)
								const isValid = pair.entry && pair.exit
								const hasError = duration !== null && duration <= 0

								return (
									<div
										key={index}
										className={cn(
											'group grid grid-cols-[auto_1fr_1fr_auto] items-center gap-3 rounded-lg p-2 transition-colors',
											'hover:bg-muted/50',
											hasError && 'bg-destructive/10'
										)}
									>
										<div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary'>
											{index + 1}
										</div>
										<div className='relative'>
											<Input
												type='time'
												value={pair.entry}
												onChange={e =>
													handlePairChange(index, 'entry', e.target.value)
												}
												className={cn(
													'h-10 border-green-200 bg-green-50/50 text-center font-mono focus:border-green-500 focus:ring-green-500 dark:border-green-900 dark:bg-green-950/30',
													!pair.entry && 'border-dashed'
												)}
											/>
											{!pair.entry && (
												<span className='pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground'>
													--:--
												</span>
											)}
										</div>
										<div className='relative'>
											<Input
												type='time'
												value={pair.exit}
												onChange={e =>
													handlePairChange(index, 'exit', e.target.value)
												}
												className={cn(
													'h-10 border-red-200 bg-red-50/50 text-center font-mono focus:border-red-500 focus:ring-red-500 dark:border-red-900 dark:bg-red-950/30',
													!pair.exit && 'border-dashed',
													hasError && 'border-destructive'
												)}
											/>
											{!pair.exit && (
												<span className='pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground'>
													--:--
												</span>
											)}
										</div>
										<div className='flex items-center gap-1'>
											{isValid && !hasError && (
												<TooltipProvider>
													<Tooltip>
														<TooltipTrigger asChild>
															<span className='hidden text-xs text-muted-foreground sm:inline'>
																{duration} daq
															</span>
														</TooltipTrigger>
														<TooltipContent>
															<p>Dars davomiyligi: {duration} daqiqa</p>
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											)}
											<Button
												type='button'
												variant='ghost'
												size='icon'
												onClick={() => removePair(index)}
												className='h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100'
											>
												<Trash2 className='h-4 w-4 text-muted-foreground hover:text-destructive' />
											</Button>
										</div>
									</div>
								)
							})}
						</div>
					) : (
						<div className='flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 text-center'>
							<Clock className='mb-3 h-10 w-10 text-muted-foreground/50' />
							<p className='mb-1 font-medium'>Jadval bo&apos;sh</p>
							<p className='mb-4 text-sm text-muted-foreground'>
								Jadval yarating yoki qo&apos;lda dars qo&apos;shing
							</p>
							<div className='flex gap-2'>
								<ScheduleGeneratorDialog onGenerate={handleGeneratedSchedule} />
								<Button variant='outline' size='sm' onClick={addPair}>
									<Plus className='mr-2 h-4 w-4' />
									Qo&apos;lda qo&apos;shish
								</Button>
							</div>
						</div>
					)}

					{pairs.length > 0 && (
						<Button
							type='button'
							variant='outline'
							size='sm'
							onClick={addPair}
							className='mt-3 w-full border-dashed'
						>
							<Plus className='mr-2 h-4 w-4' />
							{pairs.length + 1}-dars qo&apos;shish
						</Button>
					)}

					<div className='mt-4 flex gap-2'>
						<Button
							onClick={handleSave}
							disabled={isMutating || !hasChanges}
							className={cn(
								'flex-1 gap-2',
								hasChanges &&
									'bg-primary shadow-lg shadow-primary/25 hover:shadow-primary/40'
							)}
						>
							<Check className='h-4 w-4' />
							{isMutating ? 'Saqlanmoqda...' : 'Saqlash'}
						</Button>

						{schedule && (
							<Button
								variant={needsSync ? 'destructive' : 'outline'}
								onClick={handleSync}
								disabled={isMutating || hasChanges}
								className='gap-2'
							>
								<Send className='h-4 w-4' />
								Sinxronlash
							</Button>
						)}
					</div>

					{hasChanges && schedule && (
						<p className='mt-2 text-center text-xs text-muted-foreground'>
							Avval o&apos;zgarishlarni saqlang, keyin sinxronlang
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

function SchedulesSkeleton() {
	return (
		<div className='mx-auto max-w-2xl space-y-6'>
			<div className='flex items-center justify-between'>
				<div className='flex items-center gap-4'>
					<Skeleton className='h-10 w-10' />
					<div className='space-y-2'>
						<Skeleton className='h-6 w-48' />
						<Skeleton className='h-4 w-32' />
					</div>
				</div>
			</div>
			<Card>
				<CardHeader>
					<Skeleton className='h-5 w-40' />
					<Skeleton className='h-4 w-60' />
				</CardHeader>
				<CardContent className='space-y-2'>
					{[1, 2, 3, 4, 5].map(i => (
						<Skeleton key={i} className='h-14 w-full' />
					))}
				</CardContent>
			</Card>
		</div>
	)
}
