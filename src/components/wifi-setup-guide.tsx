import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type Device } from '@/lib/device-api'
import { Link } from '@tanstack/react-router'
import { Bluetooth, Wifi, Smartphone, Globe, KeyRound } from 'lucide-react'

interface WifiSetupGuideProps {
	device: Device
}

function getApCredentials(macAddress: string) {
	const cleanMac = macAddress.replace(/[:-]/g, '').toUpperCase()
	const lastFour = cleanMac.slice(-4)
	const lastSix = cleanMac.slice(-6)
	return {
		ssid: `SchoolBell_${lastFour}`,
		password: `SchoolBell_${lastSix}`,
	}
}

export function WifiSetupGuide({ device }: WifiSetupGuideProps) {
	const { ssid, password } = getApCredentials(device.device_id)

	return (
		<Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-base">
					<Wifi className="h-5 w-5 text-blue-600" />
					WiFi sozlash yo'riqnomasi
				</CardTitle>
				<CardDescription>
					Qurilma offline bo'lganda WiFi'ni qayta sozlash uchun
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-3 text-sm">
					<div className="flex items-start gap-3">
						<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">1</div>
						<div>
							<p className="font-medium">Qurilma AP rejimiga o'tadi</p>
							<p className="text-muted-foreground">WiFi'ga 3 marta ulanolmasa, qurilma o'zi tarqatuvchi bo'ladi</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">2</div>
						<div>
							<p className="font-medium flex items-center gap-1">
								<Smartphone className="h-3.5 w-3.5" />
								Telefoningizdan ulaning
							</p>
							<div className="mt-1 rounded-md bg-background p-2 font-mono text-xs space-y-1">
								<p><span className="text-muted-foreground">SSID:</span> <span className="font-semibold">{ssid}</span></p>
								<p className="flex items-center gap-1">
									<KeyRound className="h-3 w-3 text-muted-foreground" />
									<span className="text-muted-foreground">Parol:</span> <span className="font-semibold">{password}</span>
								</p>
							</div>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">3</div>
						<div>
							<p className="font-medium flex items-center gap-1">
								<Globe className="h-3.5 w-3.5" />
								Brauzerda sozlang
							</p>
							<p className="text-muted-foreground">
								Avtomatik sahifa ochiladi yoki <span className="font-mono">192.168.4.1</span> ga kiring. Faqat WiFi SSID va parolni o'zgartiring.
							</p>
						</div>
					</div>
				</div>
				<div className="border-t pt-3 space-y-2">
					<p className="text-xs text-muted-foreground">
						⏱ AP rejimi 5 daqiqa ichida sozlanmasa o'chadi, 10 daqiqadan keyin qayta yoqiladi.
					</p>
					<Link to="/provision">
						<Button variant="outline" size="sm" className="w-full gap-2">
							<Bluetooth className="h-4 w-4" />
							BLE orqali sozlash
						</Button>
					</Link>
				</div>
			</CardContent>
		</Card>
	)
}
