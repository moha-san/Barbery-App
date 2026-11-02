'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { guardarMensaje, pausar, quitarPausa } from '../../lib/db.ts'
import { soloNumeros } from '../../lib/entrada.ts'
import { COOKIE, claveCorrecta, cookieValida, firmaPanel } from '../../lib/panel.ts'
import { enviarAviso } from '../../lib/whatsapp.ts'

const PLANTILLA_CLIENTE = process.env.WHATSAPP_PLANTILLA_CLIENTE || 'aviso_cita'
// Minutos que el bot se calla con un cliente después de que el dueño le escriba.
const MINUTOS_PAUSA = 120

function exigirAcceso() {
  if (!cookieValida(cookies().get(COOKIE)?.value)) redirect('/panel')
}

export async function entrar(form: FormData) {
  const firma = firmaPanel()
  if (!firma || !claveCorrecta(String(form.get('clave') ?? ''))) redirect('/panel?error=1')
  cookies().set(COOKIE, firma, { httpOnly: true, secure: true, sameSite: 'lax', path: '/panel', maxAge: 60 * 60 * 24 * 30 })
  redirect('/panel')
}

export async function salir() {
  cookies().delete(COOKIE)
  redirect('/panel')
}

// El dueño contesta al cliente desde el panel; el bot se calla con él un rato.
export async function contestar(form: FormData) {
  exigirAcceso()
  const telefono = soloNumeros(String(form.get('telefono') ?? ''))
  const texto = String(form.get('texto') ?? '').trim().slice(0, 4000)
  if (!telefono || !texto) redirect(`/panel/c/${telefono}`)
  await enviarAviso(telefono, texto, PLANTILLA_CLIENTE)
  await guardarMensaje(telefono, 'bot', texto)
  await pausar(telefono, MINUTOS_PAUSA)
  redirect(`/panel/c/${telefono}`)
}

export async function devolverAlBot(form: FormData) {
  exigirAcceso()
  const telefono = soloNumeros(String(form.get('telefono') ?? ''))
  await quitarPausa(telefono)
  redirect(`/panel/c/${telefono}`)
}
