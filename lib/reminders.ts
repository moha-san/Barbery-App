// Qué recordatorio toca enviar a una cita ahora. Sin dependencias para poder probarlo con node --test.

const HOUR = 3_600_000

// Margen para enviar cada aviso: el cron pasa cada 10 min. Si se pierde la ventana, ese aviso se salta
// (mejor no avisar "mañana" a 3 horas de la cita).
export const reminderWindowMs = (hours: number) => Math.max(20 * 60_000, hours * HOUR * 0.1)

export function dueReminder(
  opts: { start: string; createdAt: string; sent: number[]; hoursBefore: readonly number[]; now: Date },
): number | null {
  const start = new Date(opts.start).getTime()
  const created = new Date(opts.createdAt).getTime()
  const now = opts.now.getTime()
  // De más cercano a la cita a más lejano: si tocan dos a la vez, gana el más cercano.
  for (const h of [...opts.hoursBefore].sort((a, b) => a - b)) {
    if (opts.sent.includes(h)) continue
    const at = start - h * HOUR
    if (created > at) continue // reservó después de ese momento: no hace falta
    if (now >= at && now < at + reminderWindowMs(h) && now < start) return h
  }
  return null
}

export function reminderText(hours: number, time: string, date: string): string {
  if (hours === 24) return `Mañana a las ${time}`
  if (hours > 24) return `El ${date} a las ${time}`
  if (hours === 1) return `En 1 hora, a las ${time}`
  return `En ${hours} horas, a las ${time}`
}
