'use server'

import { z } from 'zod'
import { createAdminClient, createSessionClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/actions/appointments'

const subscriptionSchema = z.object({
  endpoint: z.string().url().startsWith('https://').max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
})
export type PushSubscriptionInput = z.input<typeof subscriptionSchema>

async function save(userId: string, sub: z.output<typeof subscriptionSchema>): Promise<ActionResult> {
  const { error } = await createAdminClient()
    .from('push_subscriptions')
    .upsert({ user_id: userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth }, { onConflict: 'endpoint' })
  if (error) {
    console.error('[push] guardar', error)
    return { ok: false, error: 'No se pudieron activar los avisos' }
  }
  return { ok: true, data: undefined }
}

// Panel: el dueño o un barbero activa los avisos de reservas nuevas en este móvil.
export async function saveStaffSubscription(input: PushSubscriptionInput): Promise<ActionResult> {
  const parsed = subscriptionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' }

  const supabase = createSessionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Inicia sesión otra vez' }
  const { data: profile } = await supabase.from('users').select('rol').eq('id', user.id).single()
  if (!profile || profile.rol === 'cliente') return { ok: false, error: 'Sin permiso' }

  return save(user.id, parsed.data)
}

// Reserva: el cliente pide que le recordemos su cita. Solo vale para citas futuras y confirmadas;
// el id de la cita solo lo conoce quien la acaba de reservar.
export async function saveClientSubscription(appointmentId: string, input: PushSubscriptionInput): Promise<ActionResult> {
  const parsed = subscriptionSchema.safeParse(input)
  if (!parsed.success || !z.string().uuid().safeParse(appointmentId).success) return { ok: false, error: 'Datos inválidos' }

  const { data: appointment } = await createAdminClient()
    .from('appointments')
    .select('client_id')
    .eq('id', appointmentId)
    .eq('status', 'confirmada')
    .gt('start_time', new Date().toISOString())
    .single()
  if (!appointment) return { ok: false, error: 'No encontramos la cita' }

  return save(appointment.client_id, parsed.data)
}
