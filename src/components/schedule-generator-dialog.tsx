import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { LessonPair } from '@/lib/schedule-utils'
import { cn } from '@/lib/utils'
import {
	Building2,
	Check,
	Clock,
	School,
	Settings2,
	Wand2,
} from 'lucide-react'
import { useState } from 'react'

type ScheduleType = 'school' | 'university' | 'custom'

interface ScheduleGeneratorConfig {
	type: ScheduleType
	startTime: string
	lessonDuration: number
	shortBreak: number
	longBreak: number
	longBreakAfter: number
	lessonsCount: number
}

const SCHEDULE_PRESETS: Record<
	ScheduleType,
	Omit<ScheduleGeneratorConfig, 'type'>
> = {
	school: {
		startTime: '08:00',
		lessonDuration: 45,
		shortBreak: 5,
		longBreak: 15,
		longBreakAfter: 3,
		lessonsCount: 7,
	},
	university: {
		startTime: '08:30',
		lessonDuration: 80,
		shortBreak: 10,
		longBreak: 30,
		longBreakAfter: 2,
		lessonsCount: 4,
	},
	custom: {
		startTime: '08:00',
		lessonDuration: 45,
		shortBreak: 5,
		longBreak: 15,
		longBreakAfter: 3,
		lessonsCount: 6,
	},
}

function generateSchedule(config: ScheduleGeneratorConfig): LessonPair[] {
	const pairs: LessonPair[] = []
	const [startHour, startMin] = config.startTime.split(':').map(Number)
	let currentMinutes = startHour * 60 + startMin

	for (let i = 0; i < config.lessonsCount; i++) {
		const entryHour = Math.floor(currentMinutes / 60)
		const entryMin = currentMinutes % 60
		const entry = `${String(entryHour).padStart(2, '0')}:${String(entryMin).padStart(2, '0')}`

		currentMinutes += config.lessonDuration
		const exitHour = Math.floor(currentMinutes / 60)
		const exitMin = currentMinutes % 60
		const exit = `${String(exitHour).padStart(2, '0')}:${String(exitMin).padStart(2, '0')}`

		pairs.push({ entry, exit })

		if (i < config.lessonsCount - 1) {
			const isLongBreak = (i + 1) % config.longBreakAfter === 0
			currentMinutes += isLongBreak ? config.longBreak : config.shortBreak
		}
	}

	return pairs
}

export function ScheduleGeneratorDialog({
	onGenerate,
}: {
	onGenerate: (pairs: LessonPair[]) => void
}) {
	const [open, setOpen] = useState(false)
	const [config, setConfig] = useState<ScheduleGeneratorConfig>({
		type: 'school',
		...SCHEDULE_PRESETS.school,
	})

	const handleTypeChange = (type: ScheduleType) => {
		setConfig({ type, ...SCHEDULE_PRESETS[type] })
	}

	const handleGenerate = () => {
		onGenerate(generateSchedule(config))
		setOpen(false)
	}

	const previewPairs = generateSchedule(config)

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type='button' variant='outline' size='sm' className='gap-2'>
					<Wand2 className='h-4 w-4' />
					Jadval yaratish
				</Button>
			</DialogTrigger>
			<DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<Settings2 className='h-5 w-5' />
						Jadval generatori
					</DialogTitle>
					<DialogDescription>
						Ta'lim muassasasi turini tanlang va jadval parametrlarini sozlang
					</DialogDescription>
				</DialogHeader>

				<div className='grid gap-6 py-4'>
					<div className='grid grid-cols-3 gap-3'>
						<button
							type='button'
							onClick={() => handleTypeChange('school')}
							className={cn(
								'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all',
								config.type === 'school'
									? 'border-primary bg-primary/5'
									: 'border-muted hover:border-primary/50'
							)}
						>
							<School className='h-8 w-8 text-blue-600' />
							<span className='font-medium'>Maktab</span>
							<span className='text-xs text-muted-foreground'>45 min dars</span>
						</button>
						<button
							type='button'
							onClick={() => handleTypeChange('university')}
							className={cn(
								'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all',
								config.type === 'university'
									? 'border-primary bg-primary/5'
									: 'border-muted hover:border-primary/50'
							)}
						>
							<Building2 className='h-8 w-8 text-purple-600' />
							<span className='font-medium'>Universitet</span>
							<span className='text-xs text-muted-foreground'>80 min dars</span>
						</button>
						<button
							type='button'
							onClick={() => handleTypeChange('custom')}
							className={cn(
								'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all',
								config.type === 'custom'
									? 'border-primary bg-primary/5'
									: 'border-muted hover:border-primary/50'
							)}
						>
							<Settings2 className='h-8 w-8 text-gray-600' />
							<span className='font-medium'>Maxsus</span>
							<span className='text-xs text-muted-foreground'>
								O'zingiz sozlang
							</span>
						</button>
					</div>

					<Separator />

					<div className='grid gap-4 sm:grid-cols-2'>
						<div className='space-y-2'>
							<Label htmlFor='startTime'>Birinchi dars boshlanishi</Label>
							<Input
								id='startTime'
								type='time'
								value={config.startTime}
								onChange={e =>
									setConfig({ ...config, startTime: e.target.value })
								}
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='lessonsCount'>Darslar soni</Label>
							<Select
								value={String(config.lessonsCount)}
								onValueChange={v =>
									setConfig({ ...config, lessonsCount: Number(v) })
								}
							>
								<SelectTrigger id='lessonsCount'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
										<SelectItem key={n} value={String(n)}>
											{n} ta dars
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='lessonDuration'>Dars davomiyligi (min)</Label>
							<Select
								value={String(config.lessonDuration)}
								onValueChange={v =>
									setConfig({ ...config, lessonDuration: Number(v) })
								}
							>
								<SelectTrigger id='lessonDuration'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{[30, 35, 40, 45, 50, 55, 60, 70, 80, 90].map(n => (
										<SelectItem key={n} value={String(n)}>
											{n} daqiqa{' '}
											{n >= 60 &&
												`(${Math.floor(n / 60)} soat ${n % 60 > 0 ? `${n % 60} min` : ''})`}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='shortBreak'>Oddiy tanaffus (min)</Label>
							<Select
								value={String(config.shortBreak)}
								onValueChange={v =>
									setConfig({ ...config, shortBreak: Number(v) })
								}
							>
								<SelectTrigger id='shortBreak'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{[5, 10, 15, 20].map(n => (
										<SelectItem key={n} value={String(n)}>
											{n} daqiqa
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='longBreak'>Katta tanaffus (min)</Label>
							<Select
								value={String(config.longBreak)}
								onValueChange={v =>
									setConfig({ ...config, longBreak: Number(v) })
								}
							>
								<SelectTrigger id='longBreak'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{[15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map(n => (
										<SelectItem key={n} value={String(n)}>
											{n} daqiqa
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='longBreakAfter'>Katta tanaffus (har ...)</Label>
							<Select
								value={String(config.longBreakAfter)}
								onValueChange={v =>
									setConfig({ ...config, longBreakAfter: Number(v) })
								}
							>
								<SelectTrigger id='longBreakAfter'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{[1, 2, 3, 4, 5].map(n => (
										<SelectItem key={n} value={String(n)}>
											Har {n} darsdan keyin
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<Separator />

					<div className='space-y-2'>
						<Label className='flex items-center gap-2'>
							<Clock className='h-4 w-4' />
							Jadval ko'rinishi
						</Label>
						<div className='max-h-48 overflow-y-auto rounded-lg border bg-muted/30 p-3'>
							<div className='grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4'>
								{previewPairs.map((pair, index) => (
									<div
										key={index}
										className='flex items-center gap-2 rounded-md bg-background p-2 text-sm'
									>
										<span className='flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary'>
											{index + 1}
										</span>
										<span className='font-mono text-xs'>
											{pair.entry} - {pair.exit}
										</span>
									</div>
								))}
							</div>
						</div>
						<p className='text-xs text-muted-foreground'>
							Jami: {previewPairs.length} ta dars, {previewPairs.length * 2} ta
							qo'ng'iroq
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button variant='outline' onClick={() => setOpen(false)}>
						Bekor qilish
					</Button>
					<Button onClick={handleGenerate} className='gap-2'>
						<Check className='h-4 w-4' />
						Qo'llash
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
