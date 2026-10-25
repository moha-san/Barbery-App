import 'server-only'
import { addDays } from 'date-fns'
import { TZDate } from '@date-fns/tz'
import { siteConfig } from '@/config/site'
import { formatDateLong, formatTime, localDateKey } from '@/lib/format'
import { sendPush } from '@/lib/push'
import { createAdminClient } from '@/lib/supabase/server'
import type { AppointmentWithRelations } from '@/types/database'

// Sin 'use server' a propósito: esto solo se llama desde el servidor (reserva y cron), no desde el navegador.
// generateWhatsAppReminderLink vive en lib/whatsapp.ts porque la usa el dashboard en el cliente.

// Aviso al móvil del dueño y los barberos que activaron los avisos en el panel.
export async function sendImmediateAlert(appointment: AppointmentWithRelations): Promise<void> {
  const supabase = createAdminClient()
  const { data: staff } = await supabase.from('users').select('id').in('rol', ['admin', 'barbero'])
  if (!staff?.length) return
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', staff.map((u) => u.id))

  const when = `${formatDateLong(appointment.start_time)} a las ${formatTime(appointment.start_time)}`
  await sendPush(subs ?? [], {
    title: `Nueva cita: ${appointment.client?.nombre ?? 'cliente'}`,
    body: `${appointment.service?.nombre ?? 'Servicio'} con ${appointment.barber?.nombre ?? '-'} · ${when}`,
    url: `/dashboard?fecha=${localDateKey(appointment.start_time)}`,
    tag: `cita-${appointment.id}`,
  })
}

// Recordatorio a los clientes con cita mañana (lo llama el cron una vez al día).
export async function sendTomorrowReminders(now = new Date()): Promise<{ citas: number; avisos: number }> {
  const [y, m, d] = localDateKey(addDays(now, 1)).split('-').map(Number)
  const start = new TZDate(y, m - 1, d, 0, 0, siteConfig.timezone)
  const end = addDays(start, 1)
  const supabase = createAdminClient()

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('id, client_id, start_time, barber:barbers(nombre), service:services(nombre)')
    .eq('status', 'confirmada')
    .eq('recordatorio_enviado', false)
    .gte('start_time', start.toISOString())
    .lt('start_time', end.toISOString())
  if (error) throw new Error(error.message)

  let avisos = 0
  for (const a of appointments ?? []) {
    const { data: subs } = await supabase.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', a.client_id)
    const barber = (a.barber as { nombre: string } | null)?.nombre
    const service = (a.service as { nombre: string } | null)?.nombre
    avisos += await sendPush(subs ?? [], {
      title: `Mañana tienes cita en ${siteConfig.name}`,
      body: `${service ?? 'Tu cita'}${barber ? ` con ${barber}` : ''} a las ${formatTime(a.start_time)}. Si no puedes venir, avísanos.`,
      url: '/',
      tag: `recordatorio-${a.id}`,
    })
    // Se marca aunque el cliente no activara avisos, para no repasarla otra vez.
    await supabase.from('appointments').update({ recordatorio_enviado: true }).eq('id', a.id)
  }
  return { citas: appointments?.length ?? 0, avisos }
}
