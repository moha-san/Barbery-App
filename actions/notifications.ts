import 'server-only'
import { siteConfig } from '@/config/site'
import { formatDateLong, formatTime, localDateKey } from '@/lib/format'
import { sendPush } from '@/lib/push'
import { dueReminder, reminderText } from '@/lib/reminders'
import { getShopSettings } from '@/lib/shop'
import { createAdminClient } from '@/lib/supabase/server'
import type { AppointmentWithRelations } from '@/types/database'

// Sin 'use server' a propósito: esto solo se llama desde el servidor (reserva, cron y panel), no desde el navegador.
// generateWhatsAppReminderLink vive en lib/whatsapp.ts porque la usa el dashboard en el cliente.

// Aviso al móvil del dueño y los barberos que activaron los avisos en el panel.
async function sendStaffAlert(payload: { title: string; body: string; url: string; tag: string }): Promise<void> {
  const supabase = createAdminClient()
  const { data: staff } = await supabase.from('users').select('id').in('rol', ['admin', 'barbero'])
  if (!staff?.length) return
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', staff.map((u) => u.id))
  await sendPush(subs ?? [], payload)
}

export async function sendImmediateAlert(appointment: AppointmentWithRelations): Promise<void> {
  const when = `${formatDateLong(appointment.start_time)} a las ${formatTime(appointment.start_time)}`
  await sendStaffAlert({
    title: `Nueva cita: ${appointment.client?.nombre ?? 'cliente'}`,
    body: `${appointment.service?.nombre ?? 'Servicio'} con ${appointment.barber?.nombre ?? '-'} · ${when}`,
    url: `/dashboard?fecha=${localDateKey(appointment.start_time)}`,
    tag: `cita-${appointment.id}`,
  })
}

// El cliente canceló desde su móvil: el hueco queda libre.
export async function sendCancelAlert(appointment: { id: string; start_time: string; client: { nombre: string } | null; barber: { nombre: string } | null }, waiting = 0): Promise<void> {
  await sendStaffAlert({
    title: `Cita cancelada: ${appointment.client?.nombre ?? 'cliente'}`,
    body: `${formatDateLong(appointment.start_time)} a las ${formatTime(appointment.start_time)} con ${appointment.barber?.nombre ?? '-'}. El hueco ya está libre.${waiting ? ` Hay ${waiting} en lista de espera.` : ''}`,
    url: `/dashboard?fecha=${localDateKey(appointment.start_time)}`,
    tag: `cita-${appointment.id}`,
  })
}

type ReminderAppointment = {
  id: string
  client_id: string
  start_time: string
  barber: { nombre: string } | null
  service: { nombre: string } | null
}

async function clientSubs(clientId: string) {
  const { data } = await createAdminClient().from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', clientId)
  return data ?? []
}

function reminderBody(a: ReminderAppointment, lead: string): string {
  return `${lead}: ${a.service?.nombre ?? 'tu cita'}${a.barber ? ` con ${a.barber.nombre}` : ''}. Si no puedes venir, avísanos.`
}

// Recordatorios automáticos (24 h, 1 h… según siteConfig.reminderHoursBefore). Lo llama el cron cada 10 min.
export async function sendDueReminders(now = new Date()): Promise<{ avisos: number }> {
  const hours = siteConfig.reminderHoursBefore
  if (!hours.length) return { avisos: 0 }
  const maxAhead = Math.max(...hours) * 3_600_000
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('appointments')
    .select('id, client_id, start_time, created_at, recordatorios_enviados, barber:barbers(nombre), service:services(nombre)')
    .eq('status', 'confirmada')
    .gt('start_time', now.toISOString())
    .lte('start_time', new Date(now.getTime() + maxAhead).toISOString())
  if (error) throw new Error(error.message)

  let avisos = 0
  for (const row of data ?? []) {
    const h = dueReminder({ start: row.start_time, createdAt: row.created_at, sent: row.recordatorios_enviados, hoursBefore: hours, now })
    if (h === null) continue
    const a = row as unknown as ReminderAppointment
    const lead = reminderText(h, formatTime(a.start_time), formatDateLong(a.start_time))
    avisos += await sendPush(await clientSubs(a.client_id), {
      title: `Tu cita en ${siteConfig.name}`,
      body: reminderBody(a, lead),
      url: '/',
      tag: `recordatorio-${a.id}`,
    })
    // Se marca aunque el cliente no tenga avisos activados, para no repasarla.
    await supabase
      .from('appointments')
      .update({ recordatorios_enviados: [...row.recordatorios_enviados, h] })
      .eq('id', a.id)
  }
  return { avisos }
}

// Recordatorio que manda el barbero a mano desde el panel. Devuelve cuántos móviles lo recibieron.
export async function sendManualReminder(appointmentId: string): Promise<number> {
  const { data } = await createAdminClient()
    .from('appointments')
    .select('id, client_id, start_time, barber:barbers(nombre), service:services(nombre)')
    .eq('id', appointmentId)
    .single()
  if (!data) return 0
  const a = data as unknown as ReminderAppointment
  const lead = localDateKey(a.start_time) === localDateKey(new Date())
    ? `Hoy a las ${formatTime(a.start_time)}`
    : `El ${formatDateLong(a.start_time)} a las ${formatTime(a.start_time)}`
  return sendPush(await clientSubs(a.client_id), {
    title: `Recordatorio de ${siteConfig.name}`,
    body: reminderBody(a, lead),
    url: '/',
    tag: `recordatorio-${a.id}`,
  })
}

// Un rato después de cada cita, el cliente recibe en el móvil "¿Nos dejas una reseña?".
// Al tocar el aviso se abre la página de reseñas de Google. Solo una vez por cita.
export async function sendReviewRequests(now = new Date()): Promise<{ resenas: number }> {
  const { reviewUrl } = await getShopSettings()
  if (!reviewUrl) return { resenas: 0 }
  const supabase = createAdminClient()
  const until = new Date(now.getTime() - siteConfig.reviewDelayMin * 60_000)
  const from = new Date(until.getTime() - 6 * 3_600_000) // si el aviso se retrasa mucho, mejor no mandarlo

  const { data, error } = await supabase
    .from('appointments')
    .select('id, client_id, barber:barbers(nombre)')
    .in('status', ['confirmada', 'completada'])
    .eq('resena_enviada', false)
    .lte('end_time', until.toISOString())
    .gt('end_time', from.toISOString())
  if (error) throw new Error(error.message)

  let resenas = 0
  for (const row of data ?? []) {
    const barber = (row as unknown as { barber: { nombre: string } | null }).barber
    resenas += await sendPush(await clientSubs(row.client_id), {
      title: `¿Qué tal tu corte${barber ? ` con ${barber.nombre}` : ''}?`,
      body: `Si te ha gustado, déjanos una reseña en Google. Son 10 segundos y nos ayudas muchísimo.`,
      url: reviewUrl,
      tag: `resena-${row.id}`,
    })
    await supabase.from('appointments').update({ resena_enviada: true }).eq('id', row.id)
  }
  return { resenas }
}
