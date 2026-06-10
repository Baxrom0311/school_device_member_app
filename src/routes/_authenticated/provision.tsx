import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { createFileRoute } from '@tanstack/react-router'
import { AlertTriangle, Bluetooth, CheckCircle, Globe, KeyRound, Loader2, Smartphone, Wifi } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { deviceApi } from '@/lib/device-api'

export const Route = createFileRoute('/_authenticated/provision')({
  component: ProvisionPage,
})

const SERVICE_UUID = 0xff01
const CHAR_SSID_UUID = 0xff02
const CHAR_PASS_UUID = 0xff03
const CONNECTION_TIMEOUT_MS = 15000

type Status = 'idle' | 'scanning' | 'connecting' | 'connected' | 'confirm' | 'sending' | 'done' | 'error'

function ProvisionPage() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [ssid, setSsid] = useState('')
  const [password, setPassword] = useState('')
  const [device, setDevice] = useState<BluetoothDevice | null>(null)
  const [server, setServer] = useState<BluetoothRemoteGATTServer | null>(null)
  const [service, setService] = useState<BluetoothRemoteGATTService | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isWebBluetoothSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    server?.disconnect()
  }, [server])

  // Handle BLE disconnect
  useEffect(() => {
    if (!device) return
    const onDisconnect = () => {
      if (status !== 'done') {
        setError('Device disconnected unexpectedly')
        setStatus('error')
      }
      setServer(null)
      setService(null)
    }
    device.addEventListener('gattserverdisconnected', onDisconnect)
    return () => {
      device.removeEventListener('gattserverdisconnected', onDisconnect)
    }
  }, [device, status])

  // Cleanup on unmount
  useEffect(() => () => cleanup(), [cleanup])

  async function handleScan() {
    setError('')
    setStatus('scanning')
    try {
      const dev = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'SchoolDevice-' }],
        optionalServices: [SERVICE_UUID],
      })
      setDevice(dev)
      setDeviceName(dev.name || 'Unknown')
      setStatus('connecting')

      // Connection timeout
      const connectPromise = dev.gatt!.connect()
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutRef.current = setTimeout(
          () => reject(new Error('Connection timed out')),
          CONNECTION_TIMEOUT_MS
        )
      })

      const srv = await Promise.race([connectPromise, timeoutPromise])
      if (timeoutRef.current) clearTimeout(timeoutRef.current)

      setServer(srv)
      const svc = await srv.getPrimaryService(SERVICE_UUID)
      setService(svc)
      setStatus('connected')
    } catch (e: unknown) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setError(e instanceof Error ? e.message : 'BLE connection failed')
      setStatus('error')
    }
  }

  function validateAndConfirm() {
    if (!ssid.trim()) {
      setError('SSID is required')
      return
    }
    if (ssid.trim().length > 32) {
      setError('SSID must be 32 characters or less')
      return
    }
    if (password.length > 64) {
      setError('Password must be 64 characters or less')
      return
    }
    setError('')
    setStatus('confirm')
  }

  async function handleSend() {
    if (!service) return
    setStatus('sending')
    setError('')
    try {
      const encoder = new TextEncoder()

      const ssidChar = await service.getCharacteristic(CHAR_SSID_UUID)
      await ssidChar.writeValue(encoder.encode(ssid.trim()))

      const passChar = await service.getCharacteristic(CHAR_PASS_UUID)
      await passChar.writeValue(encoder.encode(password))

      setStatus('done')
      server?.disconnect()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send credentials')
      setStatus('error')
    }
  }

  function handleReset() {
    cleanup()
    setStatus('idle')
    setError('')
    setSsid('')
    setPassword('')
    setDevice(null)
    setServer(null)
    setService(null)
  }

  if (!isWebBluetoothSupported) {
    return (
      <div className="space-y-6 max-w-md mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Web Bluetooth qo'llab-quvvatlanmaydi</CardTitle>
            <CardDescription>
              BLE orqali sozlash uchun Chrome yoki Edge brauzeridan foydalaning.
              Quyida Captive Portal usulidan foydalanishingiz mumkin.
            </CardDescription>
          </CardHeader>
        </Card>
        <CaptivePortalGuide />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-md mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bluetooth className="h-5 w-5" />
            BLE orqali WiFi sozlash
          </CardTitle>
          <CardDescription>
            Bluetooth orqali qurilmaga WiFi ma'lumotlarini yuboring.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'idle' || status === 'error' ? (
            <>
              <Button onClick={handleScan} className="w-full">
                <Bluetooth className="mr-2 h-4 w-4" />
                Qurilmani qidirish
              </Button>
              {error && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}
            </>
          ) : status === 'scanning' || status === 'connecting' ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {status === 'scanning' ? 'Qidirilmoqda...' : `${deviceName} ga ulanmoqda...`}
            </div>
          ) : status === 'connected' ? (
            <>
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                {deviceName} ga ulandi
              </p>
              <div className="space-y-2">
                <Label htmlFor="ssid">WiFi SSID</Label>
                <Input
                  id="ssid"
                  value={ssid}
                  onChange={(e) => setSsid(e.target.value)}
                  placeholder="WiFi tarmoq nomi"
                  maxLength={32}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pass">WiFi Parol</Label>
                <Input
                  id="pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="WiFi paroli"
                  maxLength={64}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button onClick={validateAndConfirm} disabled={!ssid.trim()} className="w-full">
                <Wifi className="mr-2 h-4 w-4" />
                Yuborish
              </Button>
            </>
          ) : status === 'confirm' ? (
            <>
              <p className="text-sm font-medium">Tasdiqlang:</p>
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <p><span className="font-medium">SSID:</span> {ssid.trim()}</p>
                <p><span className="font-medium">Parol:</span> {'•'.repeat(password.length || 0)}</p>
                <p><span className="font-medium">Qurilma:</span> {deviceName}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Qurilma ma'lumotlarni qabul qilgandan keyin qayta ishga tushadi.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStatus('connected')} className="flex-1">
                  Orqaga
                </Button>
                <Button onClick={handleSend} className="flex-1">
                  Tasdiqlash
                </Button>
              </div>
            </>
          ) : status === 'sending' ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {deviceName} ga yuborilmoqda...
            </div>
          ) : status === 'done' ? (
            <div className="text-center space-y-2">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <p className="font-medium">WiFi muvaffaqiyatli sozlandi!</p>
              <p className="text-sm text-muted-foreground">
                Qurilma qayta ishga tushadi va WiFi'ga ulanadi.
              </p>
              <Button variant="outline" onClick={handleReset} className="mt-4">
                Boshqa qurilma sozlash
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Separator />

      <CaptivePortalGuide />
    </div>
  )
}

function CaptivePortalGuide() {
  const { data: devicesData } = useQuery({
    queryKey: ['my-devices'],
    queryFn: deviceApi.getMyDevices,
    staleTime: 1000 * 60,
  })

  const device = devicesData?.results?.[0]
  const cleanMac = device?.device_id?.replace(/[:-]/g, '').toUpperCase() ?? ''
  const apSsid = cleanMac ? `SchoolBell_${cleanMac.slice(-4)}` : 'SchoolBell_XXXX'
  const apPassword = cleanMac ? `SchoolBell_${cleanMac.slice(-6)}` : 'SchoolBell_XXXXXX'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Captive Portal orqali sozlash
        </CardTitle>
        <CardDescription>
          Qurilma WiFi'ga ulanolmasa avtomatik AP rejimiga o'tadi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">1</div>
            <p>Telefoningiz WiFi sozlamalaridan quyidagi tarmoqqa ulaning:</p>
          </div>
          <div className="ml-9 rounded-md bg-muted p-3 font-mono text-xs space-y-1">
            <p><span className="text-muted-foreground">SSID:</span> <span className="font-semibold">{apSsid}</span></p>
            <p className="flex items-center gap-1">
              <KeyRound className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Parol:</span> <span className="font-semibold">{apPassword}</span>
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">2</div>
            <p>
              Brauzerda avtomatik sahifa ochiladi. Agar ochilmasa — <span className="font-mono font-semibold">192.168.4.1</span> ga kiring.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">3</div>
            <p>Yangi WiFi SSID va parolni kiriting va saqlang. Qurilma qayta ishga tushadi.</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground border-t pt-3">
          <Smartphone className="inline h-3 w-3 mr-1" />
          AP rejimi 5 daqiqa ichida sozlanmasa o'chadi, 10 daqiqadan keyin qayta yoqiladi.
        </p>
      </CardContent>
    </Card>
  )
}
