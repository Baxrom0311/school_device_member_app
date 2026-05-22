import { deviceApi, type Schedule } from '@/lib/device-api'
import {
	type LessonPair,
	timesToPairs,
	pairsToTimes,
} from '@/lib/schedule-utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

interface UseScheduleEditorOptions {
	deviceId: string
	schedule: Schedule | null | undefined
}

export function useScheduleEditor({ deviceId, schedule }: UseScheduleEditorOptions) {
	const queryClient = useQueryClient()
	const [pairs, setPairs] = useState<LessonPair[]>([])
	const [isActive, setIsActive] = useState(true)
	const prevScheduleRef = useRef<string | null>(null)

	// Sync from schedule to local state when schedule data changes
	const scheduleKey = schedule ? `${schedule.id}-${schedule.times.join(',')}` : null
	if (scheduleKey !== prevScheduleRef.current) {
		prevScheduleRef.current = scheduleKey
		if (schedule) {
			setPairs(timesToPairs(schedule.times))
			setIsActive(schedule.is_active)
		}
	}

	const hasChanges = useMemo(() => {
		if (!schedule) {
			return pairsToTimes(pairs).length > 0
		}
		const currentTimes = pairsToTimes(pairs).sort().join(',')
		const originalTimes = [...schedule.times].sort().join(',')
		return currentTimes !== originalTimes || isActive !== schedule.is_active
	}, [pairs, isActive, schedule])

	const updateMutation = useMutation({
		mutationFn: (data: { times: string[]; is_active: boolean }) => {
			if (schedule?.id) {
				return deviceApi.updateSchedule(schedule.id, data)
			}
			return deviceApi.createSchedule(deviceId, data)
		},
		onMutate: async (data) => {
			await queryClient.cancelQueries({ queryKey: ['schedule', deviceId] })
			const previousSchedule = queryClient.getQueryData(['schedule', deviceId])
			if (schedule) {
				queryClient.setQueryData(['schedule', deviceId], {
					...schedule,
					times: data.times,
					is_active: data.is_active,
				})
			}
			return { previousSchedule }
		},
		onSuccess: () => {
			toast.success(schedule?.id ? 'Jadval yangilandi' : 'Jadval yaratildi')
			queryClient.invalidateQueries({ queryKey: ['schedule', deviceId] })
		},
		onError: (_err, _data, context) => {
			if (context?.previousSchedule) {
				queryClient.setQueryData(['schedule', deviceId], context.previousSchedule)
			}
			toast.error('Jadval saqlashda xatolik')
		},
	})

	const syncMutation = useMutation({
		mutationFn: () => {
			if (!schedule?.id) return Promise.reject(new Error('No schedule'))
			return deviceApi.syncSchedule(schedule.id)
		},
		onSuccess: () => {
			toast.success("Jadval qurilmaga jo'natildi!")
			queryClient.invalidateQueries({ queryKey: ['schedule', deviceId] })
		},
		onError: () => {
			toast.error("Jadval jo'natishda xatolik. Qurilma offline bo'lishi mumkin.")
		},
	})

	const handlePairChange = (index: number, field: 'entry' | 'exit', value: string) => {
		const newPairs = [...pairs]
		newPairs[index] = { ...newPairs[index], [field]: value }
		setPairs(newPairs)
	}

	const addPair = () => {
		const lastPair = pairs[pairs.length - 1]
		let newEntry = ''
		if (lastPair?.exit) {
			const [h, m] = lastPair.exit.split(':').map(Number)
			const newMinutes = h * 60 + m + 5
			newEntry = `${String(Math.floor(newMinutes / 60)).padStart(2, '0')}:${String(newMinutes % 60).padStart(2, '0')}`
		}
		setPairs([...pairs, { entry: newEntry, exit: '' }])
	}

	const removePair = (index: number) => {
		setPairs(pairs.filter((_, i) => i !== index))
	}

	const handleGeneratedSchedule = (generatedPairs: LessonPair[]) => {
		setPairs(generatedPairs)
	}

	const clearAll = () => {
		setPairs([])
	}

	const handleSave = () => {
		updateMutation.mutate({ times: pairsToTimes(pairs), is_active: isActive })
	}

	const handleSync = () => {
		if (schedule) syncMutation.mutate()
	}

	const isMutating = updateMutation.isPending || syncMutation.isPending

	return {
		pairs,
		isActive,
		setIsActive,
		hasChanges,
		isMutating,
		updateMutation,
		syncMutation,
		handlePairChange,
		addPair,
		removePair,
		handleGeneratedSchedule,
		clearAll,
		handleSave,
		handleSync,
	}
}
