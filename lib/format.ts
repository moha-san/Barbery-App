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
