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
	registration_status: RegistrationStatus
	registered_at: string | null
	last_seen: string | null
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
	is_active?: boolean
	timezone?: string
}

// ============== API Functions ==============
export const deviceApi = {
	// Get user's devices (typically just one)
	getMyDevices: async (): Promise<DeviceListResponse> => {
		const response = await apiClient.get<DeviceListResponse>(
			'/devices/my_devices/'
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
	ringBell: async (deviceId: string, duration: number = 5): Promise<void> => {
		await apiClient.post(`/devices/${deviceId}/ring/`, { duration })
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
}
