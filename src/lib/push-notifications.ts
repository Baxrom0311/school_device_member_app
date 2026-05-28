import apiClient from './api-client'

export type PushError = 'unsupported' | 'permission_denied' | 'sw_failed' | 'network' | 'unknown'

export type PushResult =
  | { ok: true }
  | { ok: false; error: PushError; message: string }

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export async function getVapidPublicKey(): Promise<string> {
  const { data } = await apiClient.get('/notifications/push/subscribe/')
  return data.public_key
}

export async function subscribeToPush(): Promise<PushResult> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, error: 'unsupported', message: "Push notifications bu brauzerda qo'llab-quvvatlanmaydi." }
  }

  let registration: ServiceWorkerRegistration
  try {
    registration = await navigator.serviceWorker.ready
  } catch {
    return { ok: false, error: 'sw_failed', message: "Service worker ishlamadi. Maxfiy rejimni o'chiring." }
  }

  if (Notification.permission === 'denied') {
    return { ok: false, error: 'permission_denied', message: "Bildirishnoma ruxsati rad etilgan. Brauzer sozlamalaridan yoqing." }
  }

  let publicKey: string
  try {
    publicKey = await getVapidPublicKey()
    if (!publicKey) {
      return { ok: false, error: 'network', message: "Serverdan push konfiguratsiyasini olishda xatolik." }
    }
  } catch {
    return { ok: false, error: 'network', message: "Tarmoq xatosi. Internetni tekshiring." }
  }

  let subscription: PushSubscription
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as ArrayBuffer,
    })
  } catch (e) {
    if ((Notification.permission as string) === 'denied') {
      return { ok: false, error: 'permission_denied' as const, message: "Bildirishnoma ruxsati rad etilgan. Brauzer sozlamalaridan yoqing." }
    }
    return { ok: false, error: 'unknown', message: `Obuna xatosi: ${e instanceof Error ? e.message : 'noma\'lum'}` }
  }

  try {
    const json = subscription.toJSON()
    await apiClient.post('/notifications/push/subscribe/', {
      endpoint: json.endpoint,
      keys: json.keys,
    })
  } catch {
    return { ok: false, error: 'network', message: "Serverga obunani saqlashda xatolik." }
  }

  return { ok: true }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    await apiClient.post('/notifications/push/unsubscribe/', {
      endpoint: subscription.endpoint,
    })
    await subscription.unsubscribe()
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  return !!subscription
}
