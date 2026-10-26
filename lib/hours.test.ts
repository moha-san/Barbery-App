import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openStatus, parseWeekHours } from './hours.ts'

const fallback = { 0: [], 1: [{ open: '10:00', close: '14:00' }], 2: [], 3: [], 4: [], 5: [], 6: [] }

test('usa el horario guardado y, si falta, el de config', () => {
  const h = parseWeekHours({ '1': [{ open: '16:00', close: '20:00' }, { open: '09:00', close: '13:00' }] }, fallback)
  assert.deepEqual(h[1], [{ open: '09:00', close: '13:00' }, { open: '16:00', close: '20:00' }])
  assert.deepEqual(parseWeekHours(null, fallback)[1], [{ open: '10:00', close: '14:00' }])
  assert.deepEqual(parseWeekHours({ '1': [{ open: '20:00', close: '10:00' }] }, fallback)[1], [{ open: '10:00', close: '14:00' }])
})

test('dice si está abierto y cuándo abre', () => {
  const h = parseWeekHours(null, fallback)
  assert.equal(openStatus(h, 1, '11:00').text, 'Abierto hasta las 14:00')
  assert.equal(openStatus(h, 1, '09:00').text, 'Cerrado · abre hoy a las 10:00')
  assert.equal(openStatus(h, 0, '12:00').text, 'Cerrado · abre mañana a las 10:00')
  assert.equal(openStatus(h, 2, '12:00').text, 'Cerrado · abre el lunes a las 10:00')
})
