import 'server-only'
import { siteConfig } from '@/config/site'
import { formatDateLong, formatPrice, formatTime } from '@/lib/format'
import type { AppointmentWithRelations } from '@/types/database'

// Sin 'use server' a propósito: esto solo se llama desde bookAppointment, no desde el navegador.
// generateWhatsAppReminderLink vive en lib/whatsapp.ts porque la usa el dashboard en el cliente.

export async function sendImmediateAlert(appointment: AppointmentWithRelations): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.OWNER_EMAIL
  if (!apiKey || !to) {
    console.warn('[notifications] RESEND_API_KEY u OWNER_EMAIL sin configurar; no se envía email')
    return
  }

  const when = `${formatDateLong(appointment.start_time)} a las ${formatTime(appointment.start_time)}`
  const text = [
    `Nueva reserva en ${siteConfig.name}`,
    '',
    `Cliente: ${appointment.client?.nombre ?? '-'} (${appointment.client?.telefono ?? '-'})`,
    `Servicio: ${appointment.service?.nombre ?? '-'}${appointment.service ? ` · ${formatPrice(appointment.service.precio)}` : ''}`,
    `Barbero: ${appointment.barber?.nombre ?? '-'}`,
    `Cuándo: ${when}`,
  ].join('\n')

  // Solo texto plano: el nombre lo escribe el cliente y así no hay que escapar HTML.
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? 'Reservas <onboarding@resend.dev>',
      to: [to],
      subject: `Nueva cita: ${appointment.client?.nombre ?? 'cliente'} · ${when}`,
      text,
    }),
  })
  if (!res.ok) throw new Error(`Resend respondió ${res.status}: ${await res.text()}`)
}
