import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeSlots } from './slots.ts'

const base = {
  date: '2026-11-02', // lunes
  windowsByWeekday: { 1: [{ open: '10:00', close: '11:00' }] },
  timezone: 'Europe/Madrid', // UTC+1 en noviembre
  stepMin: 15,
  now: new Date('2026-11-01T00:00:00Z'),
}

test('sin citas: huecos donde cabe el servicio', () => {
  assert.deepEqual(computeSlots({ ...base, durationMin: 30, busy: [] }), [
    '2026-11-02T09:00:00.000Z',
    '2026-11-02T09:15:00.000Z',
    '2026-11-02T09:30:00.000Z',
  ])
})

test('una cita bloquea los huecos que se solapan, no el que empieza cuando acaba', () => {
  const busy = [{ start: '2026-11-02T09:00:00Z', end: '2026-11-02T09:30:00Z' }]
  assert.deepEqual(computeSlots({ ...base, durationMin: 30, busy }), ['2026-11-02T09:30:00.000Z'])
})

test('día cerrado y horas pasadas no devuelven huecos', () => {
  assert.deepEqual(computeSlots({ ...base, date: '2026-11-01', durationMin: 30, busy: [] }), [])
  assert.deepEqual(computeSlots({ ...base, durationMin: 30, busy: [], now: new Date('2026-11-02T09:20:00Z') }), [
    '2026-11-02T09:30:00.000Z',
  ])
})
