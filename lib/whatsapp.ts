import { siteConfig } from '@/config/site'
import { formatDateLong, formatTime } from '@/lib/format'

// Enlace wa.me con el recordatorio ya escrito; el barbero solo pulsa "Enviar" en su móvil.
export function generateWhatsAppReminderLink(phone: string, name: string, time: string): string {
  const digits = phone.replace(/\D/g, '')
  const text =
    `Hola ${name}, te recordamos tu cita en ${siteConfig.name} el ${formatDateLong(time)} a las ${formatTime(time)}. ` +
    `Si no puedes venir, avísanos por aquí. ¡Te esperamos!`
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export const shopWhatsAppLink = (text?: string) =>
  `https://wa.me/${siteConfig.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`
