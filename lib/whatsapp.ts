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

// Tras el corte: pide una reseña en Google con el enlace ya puesto.
export function generateWhatsAppReviewLink(phone: string, name: string): string | null {
  if (!siteConfig.googleReviewUrl) return null
  const text = `Gracias por venir, ${name}. Si te ha gustado, nos ayudas mucho con una reseña en Google: ${siteConfig.googleReviewUrl}`
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}

// Para la lista de espera: avisa al cliente de que se ha liberado un hueco.
export function generateWhatsAppFreeSlotLink(phone: string, name: string, day: string): string {
  const text = `Hola ${name}, se ha liberado un hueco el ${day} en ${siteConfig.name}. ¿Te lo guardamos? Contesta a este mensaje.`
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}
