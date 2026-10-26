import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dueReminder, reminderText } from './reminders.ts'

const start = '2026-10-27T10:00:00Z'
const base = { start, createdAt: '2026-10-20T10:00:00Z', sent: [] as number[], hoursBefore: [24, 1] }

test('24 h antes toca el de 24', () => {
  assert.equal(dueReminder({ ...base, now: new Date('2026-10-26T10:05:00Z') }), 24)
})
test('fuera de ventana no toca nada', () => {
  assert.equal(dueReminder({ ...base, now: new Date('2026-10-26T20:00:00Z') }), null)
})
test('1 h antes toca el de 1', () => {
  assert.equal(dueReminder({ ...base, sent: [24], now: new Date('2026-10-27T09:02:00Z') }), 1)
})
test('ya enviado no se repite', () => {
  assert.equal(dueReminder({ ...base, sent: [24, 1], now: new Date('2026-10-27T09:02:00Z') }), null)
})
test('reserva hecha 5 h antes: solo el de 1 h', () => {
  const r = { ...base, createdAt: '2026-10-27T05:00:00Z' }
  assert.equal(dueReminder({ ...r, now: new Date('2026-10-26T10:05:00Z') }), null)
  assert.equal(dueReminder({ ...r, now: new Date('2026-10-27T09:05:00Z') }), 1)
})
test('textos', () => {
  assert.equal(reminderText(24, '10:00', 'lunes'), 'Mañana a las 10:00')
  assert.equal(reminderText(1, '10:00', 'lunes'), 'En 1 hora, a las 10:00')
  assert.equal(reminderText(3, '10:00', 'lunes'), 'En 3 horas, a las 10:00')
})
