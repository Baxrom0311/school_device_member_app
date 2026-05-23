import { describe, it, expect } from 'vitest'
import { timesToPairs, pairsToTimes, calculateDuration } from './schedule-utils'

describe('timesToPairs', () => {
	it('converts sorted times to entry/exit pairs', () => {
		const result = timesToPairs(['08:00', '08:45', '09:00', '09:45'])
		expect(result).toEqual([
			{ entry: '08:00', exit: '08:45' },
			{ entry: '09:00', exit: '09:45' },
		])
	})

	it('handles odd number of times', () => {
		const result = timesToPairs(['08:00', '08:45', '09:00'])
		expect(result).toEqual([
			{ entry: '08:00', exit: '08:45' },
			{ entry: '09:00', exit: '' },
		])
	})

	it('handles empty array', () => {
		expect(timesToPairs([])).toEqual([])
	})

	it('preserves order without sorting', () => {
		const result = timesToPairs(['09:00', '08:00'])
		expect(result).toEqual([{ entry: '09:00', exit: '08:00' }])
	})
})

describe('pairsToTimes', () => {
	it('converts pairs back to times preserving order', () => {
		const result = pairsToTimes([
			{ entry: '08:00', exit: '08:45' },
			{ entry: '09:00', exit: '09:45' },
		])
		expect(result).toEqual(['08:00', '08:45', '09:00', '09:45'])
	})

	it('skips empty values', () => {
		const result = pairsToTimes([{ entry: '08:00', exit: '' }])
		expect(result).toEqual(['08:00'])
	})

	it('handles empty pairs', () => {
		expect(pairsToTimes([])).toEqual([])
	})
})

describe('calculateDuration', () => {
	it('calculates duration in minutes', () => {
		expect(calculateDuration('08:00', '08:45')).toBe(45)
	})

	it('returns null for empty entry', () => {
		expect(calculateDuration('', '08:45')).toBeNull()
	})

	it('returns null for empty exit', () => {
		expect(calculateDuration('08:00', '')).toBeNull()
	})

	it('handles cross-hour durations', () => {
		expect(calculateDuration('08:30', '10:00')).toBe(90)
	})
})
