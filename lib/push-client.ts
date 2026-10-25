// Pide permiso de avisos en este móvil y devuelve la suscripción para guardarla en el servidor.

export type PushSupport = 'ok' | 'ios-install' | 'unsupported'

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isInstalled = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

// En iPhone los avisos solo funcionan con la app añadida a la pantalla de inicio (iOS 16.4+).
export function pushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported'
  if (isIos() && !isInstalled()) return 'ios-install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return 'unsupported'
  return 'ok'
}

function base64UrlToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

// Devuelve la suscripción ya existente sin preguntar nada (para saber si ya están activados).
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== 'ok' || Notification.permission !== 'granted') return null
  const reg = await navigator.serviceWorker.getRegistration()
  return (await reg?.pushManager.getSubscription()) ?? null
}

export async function subscribeToPush(): Promise<{ ok: true; sub: PushSubscriptionJSON } | { ok: false; error: string }> {
  if (pushSupport() !== 'ok') return { ok: false, error: 'Este navegador no admite avisos' }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, error: 'Has bloqueado los avisos. Actívalos en los ajustes del móvil.' }

  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'))
  await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    }))
  return { ok: true, sub: sub.toJSON() }
}
