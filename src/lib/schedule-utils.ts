// Shared schedule utility functions

export interface LessonPair {
	entry: string
	exit: string
}

export function timesToPairs(times: string[]): LessonPair[] {
	const pairs: LessonPair[] = []
	const sorted = [...times].sort()
	for (let i = 0; i < sorted.length; i += 2) {
		pairs.push({
			entry: sorted[i] || '',
			exit: sorted[i + 1] || '',
		})
	}
	return pairs
}

export function pairsToTimes(pairs: LessonPair[]): string[] {
	const times: string[] = []
	pairs.forEach((pair) => {
		if (pair.entry) times.push(pair.entry)
		if (pair.exit) times.push(pair.exit)
	})
	return times.sort()
}

export function calculateDuration(entry: string, exit: string): number | null {
	if (!entry || !exit) return null
	const [eh, em] = entry.split(':').map(Number)
	const [xh, xm] = exit.split(':').map(Number)
	const entryMinutes = eh * 60 + em
	const exitMinutes = xh * 60 + xm
	return exitMinutes - entryMinutes
}
