import { deviceApi, type Schedule } from '@/lib/device-api'
import {
	type LessonPair,
	timesToPairs,
	pairsToTimes,
} from '@/lib/schedule-utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

interface UseScheduleEditorOptions {
	deviceId: string
	schedule: Schedule | null | undefined
}

export function useScheduleEditor({ deviceId, schedule }: UseScheduleEditorOptions) {
	const queryClient = useQueryClient()
	const [pairs, setPairs] = useState<LessonPair[]>([])
	const [isActive, setIsActive] = useState(true)
	const [daysMask, setDaysMask] = useState(0x1f)
	const [bellDuration, setBellDuration] = useState(3000)
	const prevScheduleRef = useRef<string | null>(null)

	// Sync from schedule to local state when schedule data changes
	const scheduleKey = schedule ? `${schedule.id}-${schedule.times.join(',')}-${schedule.days_mask}-${schedule.bell_duration}` : null
	useEffect(() => {
		if (scheduleKey === prevScheduleRef.current) return
		prevScheduleRef.current = scheduleKey
		if (schedule) {
			/* eslint-disable react-hooks/set-state-in-effect -- syncing local editor state from external schedule prop */
			setPairs(timesToPairs(schedule.times))
			setIsActive(schedule.is_active)
			setDaysMask(schedule.days_mask ?? 0x1f)
			setBellDuration(schedule.bell_duration ?? 3000)
			/* eslint-enable react-hooks/set-state-in-effect */
		}
	}, [schedule, scheduleKey])

	const hasChanges = useMemo(() => {
		if (!schedule) {
			return pairsToTimes(pairs).length > 0
		}
		const currentTimes = pairsToTimes(pairs).sort().join(',')
		const originalTimes = [...schedule.times].sort().join(',')
		return currentTimes !== originalTimes || isActive !== schedule.is_active || daysMask !== (schedule.days_mask ?? 0x1f) || bellDuration !== (schedule.bell_duration ?? 3000)
	}, [pairs, isActive, daysMask, bellDuration, schedule])

	const updateMutation = useMutation({
		mutationFn: (data: { times: string[]; is_active: boolean; days_mask: number; bell_duration: number }) => {
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
					days_mask: data.days_mask,
					bell_duration: data.bell_duration,
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
		updateMutation.mutate({ times: pairsToTimes(pairs), is_active: isActive, days_mask: daysMask, bell_duration: bellDuration })
	}

	const handleSync = () => {
		if (schedule) syncMutation.mutate()
	}

	const isMutating = updateMutation.isPending || syncMutation.isPending

	return {
		pairs,
		isActive,
		setIsActive,
		daysMask,
		setDaysMask,
		bellDuration,
		setBellDuration,
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
