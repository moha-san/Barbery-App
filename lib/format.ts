import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { siteConfig } from '@/config/site'

const tz = siteConfig.timezone

export const toLocal = (iso: string | Date) => new TZDate(new Date(iso).getTime(), tz)
export const formatTime = (iso: string) => format(toLocal(iso), 'HH:mm')
export const formatDateLong = (iso: string | Date) => format(toLocal(iso), "EEEE d 'de' MMMM", { locale: es })
// "YYYY-MM-DD" del instante visto en la zona del local
export const localDateKey = (iso: string | Date) => format(toLocal(iso), 'yyyy-MM-dd')

export const formatPrice = (value: number) =>
  new Intl.NumberFormat(siteConfig.locale, { style: 'currency', currency: siteConfig.currency }).format(value)

// "hoy a las 17:30" / "mañana a las 10:00" / "jueves 29 de octubre a las 10:00"
export function whenLabel(iso: string): string {
  const day = new Date(iso)
  const key = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: tz })
  const today = new Date()
  const tomorrow = new Date(today.getTime() + 86_400_000)
  const prefix = key(day) === key(today) ? 'hoy' : key(day) === key(tomorrow) ? 'mañana' : formatDateLong(iso)
  return `${prefix} a las ${formatTime(iso)}`
}

// Precio de un servicio: 0 € significa "según el trabajo" (por ejemplo, el color).
export const servicePrice = (precio: number) => (precio > 0 ? formatPrice(precio) : 'Variable')

// Servicios en el orden del dueño (columna "orden": los más pedidos arriba) y, si no hay orden, por precio.
export function sortServices<T extends { precio: number; orden?: number | null }>(list: T[] | null): T[] {
  return [...(list ?? [])].sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999) || a.precio - b.precio)
}
