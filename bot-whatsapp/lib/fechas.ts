import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Fecha "2026-11-06" + hora "20:00" en la hora de la barbería → instante real.
export function aInstante(fecha: string, hora: string, zona: string): Date | null {
  const f = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha)
  const h = /^(\d{1,2}):(\d{2})$/.exec(hora)
  if (!f || !h) return null
  const [y, m, d, hh, mm] = [f[1], f[2], f[3], h[1], h[2]].map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31 || hh > 23 || mm > 59) return null
  const t = new TZDate(y, m - 1, d, hh, mm, zona)
  // 31 de febrero y similares: date-fns lo pasa al mes siguiente; lo rechazamos.
  if (t.getDate() !== d) return null
  return new Date(t.getTime())
}

// Hora del día (0-23) ahora mismo en la barbería.
export const horaLocal = (zona: string) => new TZDate(Date.now(), zona).getHours()

// "jueves 6 de noviembre a las 20:00"
export const cuando = (iso: string | Date, zona: string) =>
  format(new TZDate(new Date(iso).getTime(), zona), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })

// "lunes 2 de noviembre de 2026, 18:30" para que el bot sepa qué día es hoy.
export const ahoraTexto = (zona: string, ahora = new Date()) =>
  format(new TZDate(ahora.getTime(), zona), "EEEE d 'de' MMMM 'de' yyyy, HH:mm '(fecha:' yyyy-MM-dd')'", { locale: es })
