import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { deviceApi, type ScheduleHistory } from '@/lib/device-api'
import { timesToPairs, calculateDuration } from '@/lib/schedule-utils'
import { useQuery } from '@tanstack/react-query'
import { History, Clock, Calendar } from 'lucide-react'

const DAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']

function formatDaysMask(mask: number): string {
	return DAYS.filter((_, i) => mask & (1 << i)).join(', ')
}

function formatDate(iso: string): string {
	const d = new Date(iso)
	return d.toLocaleDateString('uz-UZ', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

function HistoryEntry({ entry }: { entry: ScheduleHistory }) {
	const pairs = timesToPairs(entry.times)
	return (
		<div className='space-y-2 rounded-lg border p-3'>
			<div className='flex items-center justify-between'>
				<Badge variant='outline' className='gap-1'>
					<Calendar className='h-3 w-3' />
					v{entry.version}
				</Badge>
				<span className='text-xs text-muted-foreground'>
					{formatDate(entry.created_at)}
				</span>
			</div>
			<div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
				<span>{formatDaysMask(entry.days_mask)}</span>
				<span>·</span>
				<span>{entry.bell_duration / 1000}s qo'ng'iroq</span>
				<span>·</span>
				<span>{entry.times_count} ta vaqt</span>
			</div>
			{pairs.length > 0 && (
				<div className='space-y-1'>
					{pairs.map((pair, i) => {
						const dur = calculateDuration(pair.entry, pair.exit)
						return (
							<div
								key={i}
								className='flex items-center gap-2 text-sm font-mono'
							>
								<span className='w-5 text-xs text-muted-foreground'>
									{i + 1}.
								</span>
								<span className='text-green-600'>{pair.entry || '--:--'}</span>
								<span className='text-muted-foreground'>—</span>
								<span className='text-red-600'>{pair.exit || '--:--'}</span>
								{dur !== null && dur > 0 && (
									<span className='text-xs text-muted-foreground'>
										({dur} daq)
									</span>
								)}
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}

export function ScheduleHistoryDialog({ deviceId }: { deviceId: string }) {
	const { data: history, isLoading } = useQuery({
		queryKey: ['schedule-history', deviceId],
		queryFn: () => deviceApi.getScheduleHistory(deviceId),
		enabled: !!deviceId,
	})

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant='outline' size='sm' className='gap-2'>
					<History className='h-4 w-4' />
					Tarix
				</Button>
			</DialogTrigger>
			<DialogContent className='max-h-[80vh] overflow-y-auto sm:max-w-lg'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<Clock className='h-5 w-5' />
						Jadval tarixi
					</DialogTitle>
				</DialogHeader>
				<Separator />
				{isLoading ? (
					<div className='space-y-3 py-4'>
						{[1, 2, 3].map(i => (
							<div
								key={i}
								className='h-24 animate-pulse rounded-lg bg-muted'
							/>
						))}
					</div>
				) : !history || history.length === 0 ? (
					<div className='flex flex-col items-center justify-center py-8 text-center'>
						<History className='mb-3 h-10 w-10 text-muted-foreground/50' />
						<p className='font-medium'>Tarix yo'q</p>
						<p className='text-sm text-muted-foreground'>
							Jadval o'zgartirilganda avvalgi versiyalar shu yerda ko'rinadi
						</p>
					</div>
				) : (
					<div className='space-y-3 py-2'>
						{history.map(entry => (
							<HistoryEntry key={entry.id} entry={entry} />
						))}
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}
