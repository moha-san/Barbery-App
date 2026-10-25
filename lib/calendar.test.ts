import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildIcs, googleCalendarUrl } from './calendar.ts'

const event = {
  title: 'Corte, con Carlos',
  start: '2026-11-02T09:00:00.000Z',
  end: '2026-11-02T09:30:00.000Z',
  location: 'Calle Mayor 1; Madrid',
}

test('ics con fechas UTC y texto escapado', () => {
  const ics = buildIcs(event)
  assert.match(ics, /DTSTART:20261102T090000Z\r\n/)
  assert.match(ics, /DTEND:20261102T093000Z\r\n/)
  assert.match(ics, /SUMMARY:Corte\\, con Carlos\r\n/)
  assert.match(ics, /LOCATION:Calle Mayor 1\\\; Madrid\r\n/)
})

test('enlace de Google Calendar con el rango de la cita', () => {
  const url = new URL(googleCalendarUrl(event))
  assert.equal(url.searchParams.get('dates'), '20261102T090000Z/20261102T093000Z')
  assert.equal(url.searchParams.get('text'), event.title)
})
