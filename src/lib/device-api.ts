import apiClient from './api-client'

// ============== Device Types ==============
export type DeviceStatus = 'active' | 'inactive' | 'maintenance' | 'decommissioned'
export type RegistrationStatus = 'unregistered' | 'pending' | 'registered'

export interface Device {
	id: string
	device_id: string // MAC address
	school_name: string
	name?: string
	status: DeviceStatus
	firmware_version: string
	rtc_synced: boolean
	rtc_battery_dead: boolean
	rtc_drift_sec: number | null
	schedule_stale: boolean
	registration_status: RegistrationStatus
	registered_at: string | null
	last_seen: string | null
	rssi: number | null
	uptime_sec: number | null
	free_heap: number | null
	created_at: string
	updated_at: string
}

export interface DeviceListResponse {
	count: number
	next: string | null
	previous: string | null
	results: Device[]
}

export interface DeviceClaimRequest {
	device_id: string // MAC address
	device_name?: string
}

export interface DeviceClaimResponse {
	status: string
	message: string
	device: {
		id: string
		device_id: string
		school_name: string
		status: DeviceStatus
	}
}

// ============== Schedule Types ==============
// Schedule is OneToOne with Device, stores times as JSON array
export interface Schedule {
	id: string
	device: string
	device_id: string
	device_name: string
	times: string[] // ["08:30", "09:15", "10:00"]
	times_count: number
	days_mask: number // 0-127, bit0=Mon...bit6=Sun
	bell_duration: number // milliseconds, default 3000
	is_active: boolean
	timezone: string
	version: number
	synced_at: string | null
	sync_pending: boolean
	created_at: string
	updated_at: string
}

export interface ScheduleUpdateRequest {
	times?: string[]
	days_mask?: number
	bell_duration?: number
	is_active?: boolean
	timezone?: string
}

// ============== Alert Types ==============
export type AlertType = 'panic' | 'lockdown' | 'emergency_ring' | 'offline' | 'rtc_drift' | 'rtc_battery'

export interface AlertMetadata {
	drift_sec?: number
	battery_status?: 'ok' | 'low' | 'dead'
	consecutive_days?: number
}

export interface DeviceAlert {
	id: string
	device: string | null
	device_id?: string
	device_name?: string
	alert_type: AlertType
	metadata?: AlertMetadata
	resolved: boolean
	resolved_at: string | null
	created_at: string
}

export interface AlertListResponse {
	count: number
	next: string | null
	previous: string | null
	results: DeviceAlert[]
}

// ============== Bell Log Types ==============
export type BellTriggerSource = 'schedule' | 'manual' | 'emergency' | 'mqtt'

export interface BellLog {
	id: string
	device: string
	device_id: string
	rang_at: string
	duration_ms: number
	trigger_source: BellTriggerSource
	created_at: string
}

export interface BellLogListResponse {
	count: number
	next: string | null
	previous: string | null
	results: BellLog[]
}

// ============== Holiday Types ==============
export interface Holiday {
	id: string
	name: string
	date: string
	recurring: boolean
}

export interface HolidayListResponse {
	count: number
	next: string | null
	previous: string | null
	results: Holiday[]
}

export interface HolidayRange {
	id: string
	name: string
	from_month: number
	from_day: number
	to_month: number
	to_day: number
	created_at: string
}

export interface HolidayRangeListResponse {
	count: number
	next: string | null
	previous: string | null
	results: HolidayRange[]
}

// ============== API Functions ==============
export const deviceApi = {
	// Get user's devices (typically just one)
	getMyDevices: async (): Promise<DeviceListResponse> => {
		const response = await apiClient.get<DeviceListResponse>(
			'/member/my-devices/'
		)
		return response.data
	},

	// Claim a device by MAC address
	claimDevice: async (
		data: DeviceClaimRequest
	): Promise<DeviceClaimResponse> => {
		// Normalize MAC address - remove colons/dashes
		const normalizedMac = data.device_id.replace(/[:-]/g, '').toUpperCase()
		const response = await apiClient.post<DeviceClaimResponse>(
			'/devices/claim/',
			{
				device_id: normalizedMac,
				device_name: data.device_name,
			}
		)
		return response.data
	},

	// Get device detail
	getDevice: async (id: string): Promise<Device> => {
		const response = await apiClient.get<Device>(`/devices/${id}/`)
		return response.data
	},

	// Ring device bell
	ringBell: async (deviceId: string, duration: number = 5): Promise<{ msg_id: string }> => {
		const response = await apiClient.post<{ status: string; duration: number; msg_id: string }>(
			`/member/devices/${deviceId}/ring/`, { duration }
		)
		return { msg_id: response.data.msg_id }
	},

	// Get command delivery status
	getCommandStatus: async (msgId: string): Promise<{ status: string; sent_at: string; acked_at: string | null }> => {
		const response = await apiClient.get<{ status: string; sent_at: string; acked_at: string | null }>(
			`/member/commands/${msgId}/status/`
		)
		return response.data
	},

	// Poll command status until delivered/failed/timeout
	pollCommandStatus: (msgId: string, onUpdate: (status: string) => void): (() => void) => {
		let attempts = 0
		const maxAttempts = 15
		const interval = setInterval(async () => {
			attempts++
			try {
				const data = await deviceApi.getCommandStatus(msgId)
				if (data.status !== 'sent' || attempts >= maxAttempts) {
					clearInterval(interval)
					onUpdate(data.status)
				}
			} catch {
				clearInterval(interval)
				onUpdate('failed')
			}
		}, 2000)
		return () => clearInterval(interval)
	},

	// Get device schedule (OneToOne - each device has one schedule)
	getSchedule: async (deviceId: string): Promise<Schedule | null> => {
		const device = await apiClient.get<{ schedule: Schedule | null }>(
			`/devices/${deviceId}/`
		)
		return device.data.schedule
	},

	// Create schedule for a device that doesn't have one
	createSchedule: async (
		deviceId: string,
		data: ScheduleUpdateRequest
	): Promise<Schedule> => {
		const response = await apiClient.post<Schedule>('/schedules/', {
			device: deviceId,
			...data,
		})
		return response.data
	},

	// Update schedule times
	updateSchedule: async (
		scheduleId: string,
		data: ScheduleUpdateRequest
	): Promise<Schedule> => {
		const response = await apiClient.patch<Schedule>(
			`/schedules/${scheduleId}/`,
			data
		)
		return response.data
	},

	// Sync schedule to device
	syncSchedule: async (scheduleId: string): Promise<void> => {
		await apiClient.post(`/schedules/${scheduleId}/sync_to_device/`)
	},

	// Get bell log history for a device
	getBellLogs: async (deviceId: string, page = 1, dateFrom?: string, dateTo?: string): Promise<BellLogListResponse> => {
		const response = await apiClient.get<BellLogListResponse>(
			`/member/bell-logs/`,
			{ params: { device: deviceId, page, date_from: dateFrom, date_to: dateTo } }
		)
		return response.data
	},

	// Get device alerts
	getAlerts: async (page = 1): Promise<AlertListResponse> => {
		const response = await apiClient.get<AlertListResponse>(
			`/member/alerts/`,
			{ params: { page } }
		)
		return response.data
	},

	// Get holidays list
	getHolidays: async (date?: string): Promise<HolidayListResponse> => {
		const response = await apiClient.get<HolidayListResponse>(
			'/member/holidays/',
			{ params: date ? { date } : undefined }
		)
		return response.data
	},

	// Create a holiday
	createHoliday: async (data: { name: string; date: string; recurring: boolean }): Promise<Holiday> => {
		const response = await apiClient.post<Holiday>('/member/holidays/create/', data)
		return response.data
	},

	// Delete a holiday
	deleteHoliday: async (id: string): Promise<void> => {
		await apiClient.delete(`/member/holidays/${id}/`)
	},

	// Get holiday ranges
	getHolidayRanges: async (): Promise<HolidayRangeListResponse> => {
		const response = await apiClient.get<HolidayRangeListResponse>('/member/holiday-ranges/')
		return response.data
	},

	// Create a holiday range
	createHolidayRange: async (data: Omit<HolidayRange, 'id' | 'created_at'>): Promise<HolidayRange> => {
		const response = await apiClient.post<HolidayRange>('/member/holiday-ranges/', data)
		return response.data
	},

	// Delete a holiday range
	deleteHolidayRange: async (id: string): Promise<void> => {
		await apiClient.delete(`/member/holiday-ranges/${id}/`)
	},

	// Today silent - mute all bells for today
	setTodaySilent: async (): Promise<void> => {
		await apiClient.post('/member/holidays/today-silent/')
	},

	// Trigger emergency alert
	triggerEmergency: async (deviceId: string, alertType: 'panic' | 'lockdown' | 'emergency_ring'): Promise<void> => {
		await apiClient.post(`/member/devices/${deviceId}/emergency/`, { alert_type: alertType })
	},

	// Resolve emergency alert
	resolveEmergency: async (alertId: string): Promise<void> => {
		await apiClient.post(`/member/alerts/${alertId}/resolve/`)
	},
}
