import { z } from 'zod'
import type { TimeWindow } from '@/lib/slots'

// Horario semanal: 0 = domingo … 6 = sábado. Varios tramos por día (mañana y tarde).
export type WeekHours = Record<number, TimeWindow[]>

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
const windowSchema = z.object({ open: hhmm, close: hhmm }).refine((w) => w.open < w.close, 'La hora de cierre va después de la de apertura')
export const weekHoursSchema = z.record(z.string().regex(/^[0-6]$/), z.array(windowSchema).max(3))

// Lee el horario guardado en la base de datos; si falta o está mal, usa el de config/site.ts.
export function parseWeekHours(value: unknown, fallback: Readonly<Record<number, readonly TimeWindow[]>>): WeekHours {
  const parsed = weekHoursSchema.safeParse(value)
  const out: WeekHours = {}
  for (let d = 0; d < 7; d++) {
    const saved = parsed.success ? parsed.data[String(d)] : undefined
    out[d] = saved ? [...saved].sort((a, b) => a.open.localeCompare(b.open)) : [...(fallback[d] ?? [])]
  }
  return out
}

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

// "Abierto hasta las 20:00" / "Cerrado · abre mañana a las 10:00". weekday y time en la zona del local.
export function openStatus(hours: WeekHours, weekday: number, time: string): { open: boolean; text: string } {
  const today = hours[weekday] ?? []
  const current = today.find((w) => time >= w.open && time < w.close)
  if (current) return { open: true, text: `Abierto hasta las ${current.close}` }
  const later = today.find((w) => time < w.open)
  if (later) return { open: false, text: `Cerrado · abre hoy a las ${later.open}` }
  for (let i = 1; i <= 7; i++) {
    const day = (weekday + i) % 7
    const next = hours[day]?.[0]
    if (next) return { open: false, text: `Cerrado · abre ${i === 1 ? 'mañana' : `el ${DAYS[day]}`} a las ${next.open}` }
  }
  return { open: false, text: 'Cerrado' }
}
