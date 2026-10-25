import 'server-only'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/server'

export type PushPayload = { title: string; body: string; url: string; tag?: string }
type Subscription = { endpoint: string; p256dh: string; auth: string }

let configured: boolean | null = null

// Las claves VAPID identifican a esta app ante Google/Apple/Mozilla. Se generan una vez por cliente.
function configure(): boolean {
  if (configured !== null) return configured
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    console.warn('[push] Faltan NEXT_PUBLIC_VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY; no se envían avisos')
    return (configured = false)
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:avisos@barberia.app', publicKey, privateKey)
  return (configured = true)
}

// Envía el aviso a cada móvil y borra los que ya no existen (app desinstalada o permiso quitado).
// Devuelve cuántos se entregaron.
export async function sendPush(subs: Subscription[], payload: PushPayload): Promise<number> {
  if (!subs.length || !configure()) return 0
  const body = JSON.stringify(payload)
  const dead: string[] = []
  let sent = 0

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
          TTL: 60 * 60 * 12,
          urgency: 'high',
        })
        sent++
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) dead.push(s.endpoint)
        else console.error('[push]', status, (e as Error).message)
      }
    }),
  )

  if (dead.length) await createAdminClient().from('push_subscriptions').delete().in('endpoint', dead)
  return sent
}
