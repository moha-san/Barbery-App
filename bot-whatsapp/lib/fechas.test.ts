import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aInstante, cuando } from './fechas.ts'

const tz = 'Europe/Madrid'

test('convierte la hora de Madrid a UTC (invierno y verano)', () => {
  assert.equal(aInstante('2026-11-06', '20:00', tz)?.toISOString(), '2026-11-06T19:00:00.000Z')
  assert.equal(aInstante('2026-07-06', '9:30', tz)?.toISOString(), '2026-07-06T07:30:00.000Z')
})

test('rechaza fechas y horas imposibles', () => {
  assert.equal(aInstante('2026-02-31', '10:00', tz), null)
  assert.equal(aInstante('2026-11-06', '25:00', tz), null)
  assert.equal(aInstante('mañana', '10:00', tz), null)
})

test('escribe la fecha en español', () => {
  assert.equal(cuando('2026-11-06T19:00:00.000Z', tz), 'viernes 6 de noviembre a las 20:00')
})
