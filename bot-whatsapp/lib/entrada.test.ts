import { test } from 'node:test'
import assert from 'node:assert/strict'
import { leerBoton, leerWebhook, paraPlantilla } from './entrada.ts'

const webhook = (messages: unknown[]) => ({
  entry: [{ changes: [{ value: { contacts: [{ wa_id: '34600111222', profile: { name: 'Juan' } }], messages } }] }],
})

test('lee un texto del cliente', () => {
  const [m] = leerWebhook(webhook([{ id: 'w1', from: '34600111222', type: 'text', text: { body: ' Cita a las 8 ' } }]))
  assert.deepEqual(m, { waId: 'w1', de: '34600111222', nombre: 'Juan', texto: 'Cita a las 8', boton: null })
})

test('lee el botón de un mensaje normal y el de una plantilla', () => {
  const [a, b] = leerWebhook(
    webhook([
      { id: 'w2', from: '34600111222', type: 'interactive', interactive: { button_reply: { id: 'hecho:5', title: 'Hecho' } } },
      { id: 'w3', from: '34600111222', type: 'button', button: { payload: 'otra:7', text: 'Otra hora' } },
    ]),
  )
  assert.equal(a.boton, 'hecho:5')
  assert.equal(b.boton, 'otra:7')
})

test('un audio se convierte en aviso de texto', () => {
  const [m] = leerWebhook(webhook([{ id: 'w4', from: '34600111222', type: 'audio' }]))
  assert.match(m.texto, /audio/)
})

test('ignora avisos de estado (sin mensajes) y basura', () => {
  assert.deepEqual(leerWebhook({ entry: [{ changes: [{ value: { statuses: [{}] } }] }] }), [])
  assert.deepEqual(leerWebhook(null), [])
})

test('leerBoton', () => {
  assert.deepEqual(leerBoton('no:12'), { accion: 'no', peticionId: 12 })
  assert.deepEqual(leerBoton('mas30:3'), { accion: 'mas30', peticionId: 3 })
  assert.equal(leerBoton('borrar:12'), null)
  assert.equal(leerBoton(null), null)
})

test('paraPlantilla quita saltos de línea', () => {
  assert.equal(paraPlantilla('Juan\n\nCorte   y barba'), 'Juan · Corte y barba')
})
