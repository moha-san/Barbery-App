// Archivo .ics y enlace de Google Calendar para que el cliente guarde su cita.

export type CalendarEvent = { title: string; start: string; end: string; location: string; details?: string }

// "2026-11-02T09:00:00.000Z" -> "20261102T090000Z"
const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
// RFC 5545: escapar \ ; , y saltos de línea
const icsText = (s: string) => s.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')

export function buildIcs(e: CalendarEvent): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//barbery-app//ES',
    'BEGIN:VEVENT',
    `UID:${icsDate(e.start)}-${Math.abs(hash(e.title + e.start))}@barbery-app`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(e.start)}`,
    `DTEND:${icsDate(e.end)}`,
    `SUMMARY:${icsText(e.title)}`,
    `LOCATION:${icsText(e.location)}`,
    ...(e.details ? [`DESCRIPTION:${icsText(e.details)}`] : []),
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(e.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${icsDate(e.start)}/${icsDate(e.end)}`,
    location: e.location,
    details: e.details ?? '',
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

function hash(s: string): number {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0
  return h
}
