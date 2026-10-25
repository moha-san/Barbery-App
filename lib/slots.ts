import { TZDate } from '@date-fns/tz'

export type TimeWindow = { open: string; close: string }
export type BusyRange = { start: string; end: string }

export type SlotInput = {
  date: string // "YYYY-MM-DD" en la zona del local
  windowsByWeekday: Readonly<Record<number, readonly TimeWindow[]>>
  timezone: string
  durationMin: number
  stepMin: number
  busy: readonly BusyRange[]
  now: Date
}

const MINUTE = 60_000

function localInstant(date: string, hhmm: string, timezone: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = hhmm.split(':').map(Number)
  return new TZDate(y, m - 1, d, hh, mm, timezone).getTime()
}

export function weekdayOf(date: string, timezone: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new TZDate(y, m - 1, d, 12, 0, timezone).getDay()
}

// Devuelve los inicios libres (ISO UTC) donde cabe un servicio de durationMin minutos.
export function computeSlots(input: SlotInput): string[] {
  const { date, windowsByWeekday, timezone, durationMin, stepMin, busy, now } = input
  const windows = windowsByWeekday[weekdayOf(date, timezone)] ?? []
  const busyMs = busy.map((b) => [Date.parse(b.start), Date.parse(b.end)] as const)
  const duration = durationMin * MINUTE
  const slots: string[] = []

  for (const w of windows) {
    const open = localInstant(date, w.open, timezone)
    const close = localInstant(date, w.close, timezone)
    for (let start = open; start + duration <= close; start += stepMin * MINUTE) {
      const end = start + duration
      if (start <= now.getTime()) continue
      // Rangos semiabiertos [inicio, fin): una cita que acaba a las 10:30 no bloquea las 10:30.
      if (busyMs.some(([bs, be]) => start < be && end > bs)) continue
      slots.push(new Date(start).toISOString())
    }
  }
  return slots
}
