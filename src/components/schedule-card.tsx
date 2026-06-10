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
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { ScheduleGeneratorDialog } from '@/components/schedule-generator-dialog'
import { useScheduleEditor } from '@/hooks/use-schedule-editor'
import { deviceApi, type Device } from '@/lib/device-api'
import { calculateDuration } from '@/lib/schedule-utils'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
	AlertCircle,
	Calendar,
	Check,
	Clock,
	Cpu,
	GraduationCap,
	Plus,
	RefreshCw,
	Send,
	Trash2,
} from 'lucide-react'

export function ScheduleCardSkeleton() {
	return (
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
	)
}

interface ScheduleCardProps {
	device: Device
}

export function ScheduleCard({ device }: ScheduleCardProps) {
	const queryClient = useQueryClient()
	const { user } = useAuthStore()
	const canEdit = user?.role === 'ADMIN' || user?.role === 'SCHOOL_ADMIN'

	const {
		data: schedule,
		isLoading,
		error,
		dataUpdatedAt,
	} = useQuery({
		queryKey: ['schedule', device.id],
		queryFn: () => deviceApi.getSchedule(device.id),
	})

	const {
		pairs,
		hasChanges,
		isMutating,
		daysMask,
		setDaysMask,
		handlePairChange,
		addPair,
		removePair,
		handleGeneratedSchedule,
		clearAll,
		handleSave,
		handleSync,
	} = useScheduleEditor({ deviceId: device.id, schedule })

	if (isLoading) return <ScheduleCardSkeleton />

	if (error) {
		return (
			<Card>
				<CardContent className='pt-6'>
					<div className='flex flex-col items-center justify-center py-8 text-center'>
						<AlertCircle className='mb-4 h-12 w-12 text-destructive' />
						<h3 className='mb-2 text-lg font-medium'>Xatolik yuz berdi</h3>
						<p className='mb-4 text-sm text-muted-foreground'>
							Jadval yuklanmadi
						</p>
						<Button
							variant='outline'
							onClick={() =>
								queryClient.invalidateQueries({
									queryKey: ['schedule', device.id],
								})
							}
						>
							Qayta yuklash
						</Button>
					</div>
				</CardContent>
			</Card>
		)
	}

	const needsSync = schedule?.sync_pending || false
	const validPairsCount = pairs.filter(p => p.entry && p.exit).length
	// Compare against the timestamp react-query stamped on the response so this
	// stays a pure render computation (no Date.now()).
	const isStale = schedule?.synced_at && dataUpdatedAt
		? dataUpdatedAt - new Date(schedule.synced_at).getTime() > 7 * 24 * 60 * 60 * 1000
		: false

	return (
		<Card className='overflow-hidden'>
			<CardHeader className='bg-muted/30 pb-4'>
				<div className='mb-3 flex items-center gap-3 rounded-lg bg-background/50 p-3'>
					<div className='flex h-10 w-10 items-center justify-center rounded-full bg-primary/10'>
						<Cpu className='h-5 w-5 text-primary' />
					</div>
					<div className='flex-1'>
						<p className='font-semibold'>
							{device.name || device.school_name || 'Qurilma'}
						</p>
						<p className='font-mono text-xs text-muted-foreground'>
							{device.device_id}
						</p>
					</div>
				</div>

				<div className='flex items-start justify-between'>
					<div className='space-y-1'>
						<CardTitle className='flex items-center gap-2 text-lg'>
							<Calendar className='h-5 w-5 text-primary' />
							Qo'ng'iroq jadvali
						</CardTitle>
						<CardDescription className='flex items-center gap-2'>
							{validPairsCount > 0 ? (
								<>
									<GraduationCap className='h-4 w-4' />
									{validPairsCount} ta dars · {validPairsCount * 2} ta
									qo'ng'iroq
								</>
							) : (
								"Dars vaqtlarini qo'shing"
							)}
						</CardDescription>
					</div>
					<div className='flex items-center gap-3'>
						{isStale && (
							<Badge variant='outline' className='gap-1 border-orange-500 text-orange-600'>
								<AlertCircle className='h-3 w-3' />
								7+ kun sinxronlanmagan
							</Badge>
						)}
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
								O'zgartirilgan
							</Badge>
						)}
					</div>
				</div>
			</CardHeader>

			<CardContent className='p-4'>
				{canEdit && (
				<div className='mb-4'>
					<p className='mb-2 text-sm font-medium text-muted-foreground'>Hafta kunlari</p>
					<div className='flex gap-1'>
						{['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map((day, i) => (
							<button
								key={i}
								type='button'
								className={cn(
									'h-9 w-9 rounded-full text-sm font-medium transition-colors',
									daysMask & (1 << i)
										? 'bg-primary text-primary-foreground'
										: 'bg-muted text-muted-foreground hover:bg-muted/80'
								)}
								onClick={() => setDaysMask(daysMask ^ (1 << i))}
							>
								{day}
							</button>
						))}
					</div>
				</div>
				)}

				{canEdit && (
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
				)}

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
											disabled={!canEdit}
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
											disabled={!canEdit}
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
										{canEdit && (
										<Button
											type='button'
											variant='ghost'
											size='icon'
											onClick={() => removePair(index)}
											className='h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100'
										>
											<Trash2 className='h-4 w-4 text-muted-foreground hover:text-destructive' />
										</Button>
										)}
									</div>
								</div>
							)
						})}
					</div>
				) : (
					<div className='flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 text-center'>
						<Clock className='mb-3 h-10 w-10 text-muted-foreground/50' />
						<p className='mb-1 font-medium'>Jadval bo'sh</p>
						<p className='mb-4 text-sm text-muted-foreground'>
							{canEdit ? "Jadval yarating yoki qo'lda dars qo'shing" : "Jadval hali yaratilmagan"}
						</p>
						{canEdit && (
						<div className='flex gap-2'>
							<ScheduleGeneratorDialog onGenerate={handleGeneratedSchedule} />
							<Button variant='outline' size='sm' onClick={addPair}>
								<Plus className='mr-2 h-4 w-4' />
								Qo'lda qo'shish
							</Button>
						</div>
						)}
					</div>
				)}

				{canEdit && pairs.length > 0 && (
					<Button
						type='button'
						variant='outline'
						size='sm'
						onClick={addPair}
						className='mt-3 w-full border-dashed'
					>
						<Plus className='mr-2 h-4 w-4' />
						{pairs.length + 1}-dars qo'shish
					</Button>
				)}

				{canEdit && (
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
				)}

				{canEdit && hasChanges && schedule && (
					<p className='mt-2 text-center text-xs text-muted-foreground'>
						Avval o'zgarishlarni saqlang, keyin sinxronlang
					</p>
				)}
			</CardContent>
		</Card>
	)
}
