import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { deviceApi } from '@/lib/device-api'
import { RouteErrorBoundary } from '@/components/route-error-boundary'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { formatDistanceToNow } from 'date-fns'
import { uz } from 'date-fns/locale'
import {
	Activity,
	AlertTriangle,
	ArrowLeft,
	BatteryWarning,
	CheckCircle2,
	Clock,
	Cpu,
	RefreshCw,
	Wifi,
	WifiOff,
} from 'lucide-react'

export const Route = createFileRoute('/_authenticated/device-health')({
	component: DeviceHealthPage,
	errorComponent: ({ error, reset }) => (
		<RouteErrorBoundary error={error} reset={reset} />
	),
})

function DeviceHealthPage() {
	const {
		data: devicesData,
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ['my-devices'],
		queryFn: deviceApi.getMyDevices,
		refetchInterval: 15000,
	})

	const device = devicesData?.results?.[0]

	if (isLoading) return <HealthSkeleton />

	if (error || !device) {
		return (
			<div className="space-y-6">
				<Header />
				<Card>
					<CardContent className="py-8 text-center">
						<AlertTriangle className="mx-auto mb-3 h-8 w-8 text-destructive" />
						<p className="text-sm text-muted-foreground">
							{error ? "Ma'lumotlarni yuklashda xatolik" : 'Qurilma topilmadi'}
						</p>
						{error && (
							<Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
								<RefreshCw className="mr-2 h-4 w-4" />
								Qayta urinish
							</Button>
						)}
					</CardContent>
				</Card>
			</div>
		)
	}

	const isOnline = device.status === 'active'
	const rtcOk = !device.rtc_battery_dead && (device.rtc_drift_sec == null || device.rtc_drift_sec <= 300)
	const rtcWarning = !device.rtc_battery_dead && device.rtc_drift_sec != null && device.rtc_drift_sec > 300
	const signalGood = device.rssi != null && device.rssi > -70

	return (
		<div className="space-y-6">
			<Header />

			{/* Overall Status */}
			<Card>
				<CardContent className="flex items-center gap-4 p-4">
					<div className={`rounded-full p-3 ${isOnline && rtcOk && !device.schedule_stale ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900'}`}>
						<Activity className={`h-6 w-6 ${isOnline && rtcOk && !device.schedule_stale ? 'text-green-600' : 'text-yellow-600'}`} />
					</div>
					<div>
						<p className="font-semibold">
							{isOnline && rtcOk && !device.schedule_stale
								? "Qurilma normal ishlayapti"
								: "Diqqat talab etiladi"}
						</p>
						<p className="text-sm text-muted-foreground">
							{device.name || device.school_name || device.device_id}
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Connection */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-base">
						{isOnline ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />}
						Ulanish
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Row label="Holat" value={isOnline ? 'Online' : 'Offline'} ok={isOnline} />
					<Row
						label="Oxirgi faollik"
						value={device.last_seen ? formatDistanceToNow(new Date(device.last_seen), { addSuffix: true, locale: uz }) : "Noma'lum"}
						ok={isOnline}
					/>
					<Row
						label="Signal kuchi"
						value={device.rssi != null ? `${device.rssi} dBm` : "Noma'lum"}
						ok={signalGood}
						warn={device.rssi != null && !signalGood}
					/>
					<Row
						label="Uptime"
						value={device.uptime_sec != null
							? device.uptime_sec >= 3600
								? `${Math.floor(device.uptime_sec / 3600)}s ${Math.floor((device.uptime_sec % 3600) / 60)}d`
								: `${Math.floor(device.uptime_sec / 60)} daqiqa`
							: "Noma'lum"}
					/>
				</CardContent>
			</Card>

			{/* RTC & Time */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<Clock className="h-4 w-4" />
						RTC va Vaqt
						{device.rtc_battery_dead && (
							<Badge variant="destructive" className="text-xs">Batareya o'lgan</Badge>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Row
						label="RTC holati"
						value={device.rtc_battery_dead ? "Batareya almashtirish kerak" : rtcWarning ? "Drift aniqlandi" : "Normal"}
						ok={rtcOk}
						bad={device.rtc_battery_dead}
						warn={rtcWarning}
					/>
					<Row
						label="Vaqt farqi (drift)"
						value={device.rtc_drift_sec != null ? `${device.rtc_drift_sec} soniya` : "Yo'q"}
						ok={device.rtc_drift_sec == null || device.rtc_drift_sec <= 30}
						warn={device.rtc_drift_sec != null && device.rtc_drift_sec > 30 && device.rtc_drift_sec <= 300}
						bad={device.rtc_drift_sec != null && device.rtc_drift_sec > 300}
					/>
					<Row
						label="RTC sinxronlangan"
						value={device.rtc_synced ? 'Ha' : "Yo'q"}
						ok={device.rtc_synced}
					/>
					{device.rtc_battery_dead && (
						<div className="mt-2 rounded-md bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
							<BatteryWarning className="h-4 w-4 mt-0.5 shrink-0" />
							<p>RTC batareykasi o'lgan. Qurilma har safar yoqilganda SNTP'dan vaqt olishi kerak. Batareykani almashtiring.</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Schedule Sync */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<Cpu className="h-4 w-4" />
						Jadval sinxronizatsiya
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Row
						label="Jadval holati"
						value={device.schedule_stale ? "Yangilanmagan" : "Yangilangan"}
						ok={!device.schedule_stale}
						warn={device.schedule_stale}
					/>
					<Row label="Firmware" value={device.firmware_version || "Noma'lum"} />
					<Row
						label="Xotira (Heap)"
						value={device.free_heap != null ? `${(device.free_heap / 1024).toFixed(0)} KB` : "Noma'lum"}
						ok={device.free_heap != null && device.free_heap > 50000}
						warn={device.free_heap != null && device.free_heap <= 50000}
					/>
					{device.schedule_stale && (
						<div className="mt-2 rounded-md bg-orange-50 dark:bg-orange-950 p-3 text-sm text-orange-700 dark:text-orange-300 flex items-start gap-2">
							<AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
							<p>Qurilmaga yangi jadval yuborilmagan. "Sinxronlash" tugmasini bosing.</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

function Header() {
	return (
		<div className="flex items-center gap-4">
			<Link to="/">
				<Button variant="ghost" size="icon">
					<ArrowLeft className="h-5 w-5" />
				</Button>
			</Link>
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Qurilma diagnostikasi</h1>
				<p className="text-muted-foreground">Batafsil holat va sog'liq ko'rsatkichlari</p>
			</div>
		</div>
	)
}

function Row({ label, value, ok, warn, bad }: { label: string; value: string; ok?: boolean; warn?: boolean; bad?: boolean }) {
	return (
		<div className="flex items-center justify-between">
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className={`text-sm font-medium flex items-center gap-1 ${bad ? 'text-red-600' : warn ? 'text-yellow-600' : ok ? 'text-green-600' : ''}`}>
				{bad ? <AlertTriangle className="h-3.5 w-3.5" /> : ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
				{value}
			</span>
		</div>
	)
}

function HealthSkeleton() {
	return (
		<div className="space-y-6">
			<Header />
			{[1, 2, 3].map(i => (
				<Card key={i}>
					<CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
					<CardContent className="space-y-3">
						<Skeleton className="h-5 w-full" />
						<Skeleton className="h-5 w-full" />
						<Skeleton className="h-5 w-full" />
					</CardContent>
				</Card>
			))}
		</div>
	)
}
