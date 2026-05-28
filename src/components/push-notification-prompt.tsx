import { useState, useEffect } from 'react'
import { Bell, AlertCircle } from 'lucide-react'
import { isPushSubscribed, subscribeToPush } from '@/lib/push-notifications'

export function PushNotificationPrompt() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function check() {
      if (!('PushManager' in window) || !('serviceWorker' in navigator)) return
      if (Notification.permission === 'denied') return
      if (await isPushSubscribed()) return
      setShow(true)
    }
    check()
  }, [])

  if (!show) return null

  const handleEnable = async () => {
    setLoading(true)
    setError(null)
    const result = await subscribeToPush()
    setLoading(false)
    if (result.ok) {
      setShow(false)
    } else {
      setError(result.message)
    }
  }

  return (
    <div
      role="alert"
      className="mx-4 mt-4 p-4 rounded-lg border bg-card shadow-sm flex items-start gap-3"
    >
      <Bell className="h-5 w-5 text-primary mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Bildirishnomalarni yoqing</p>
        <p className="text-xs text-muted-foreground mt-1">
          Qurilma offline bo'lganda yoki jadval o'zgarganda xabar olasiz.
        </p>
        {error && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleEnable}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Yuklanmoqda...' : error ? 'Qayta urinish' : 'Yoqish'}
          </button>
          <button
            onClick={() => setShow(false)}
            className="px-3 py-1.5 text-xs font-medium rounded-md border hover:bg-accent"
          >
            Keyinroq
          </button>
        </div>
      </div>
    </div>
  )
}
