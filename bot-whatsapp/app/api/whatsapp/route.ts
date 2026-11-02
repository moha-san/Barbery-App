import { waitUntil } from '@vercel/functions'
import { responder } from '../../../lib/agente.ts'
import { atenderEquipo, esDelEquipo, reenviarAlDueno } from '../../../lib/barbero.ts'
import { barberia } from '../../../config/barberia.ts'
import { guardarMensaje, marcarRecibido, mensajesHoy, pausadoHasta } from '../../../lib/db.ts'
import { leerWebhook, textoFoto, type Entrante } from '../../../lib/entrada.ts'
import { enviarTexto, firmaValida } from '../../../lib/whatsapp.ts'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Meta comprueba la dirección una vez al configurar el webhook.
export function GET(request: Request) {
  const url = new URL(request.url)
  const ok = url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN
  return ok ? new Response(url.searchParams.get('hub.challenge') ?? '') : new Response('No autorizado', { status: 403 })
}

async function atender(m: Entrante) {
  try {
    if (!(await marcarRecibido(m.waId))) return // repetido
    if (esDelEquipo(m.de)) return await atenderEquipo(m)

    // Si un cliente pulsa un botón viejo, lo tratamos como texto.
    const texto = m.foto ? textoFoto(m.foto, m.texto) : m.texto || m.boton || ''
    await guardarMensaje(m.de, 'cliente', texto)
    // Tope de mensajes al día por cliente, para que nadie dispare el gasto de la IA.
    const hoy = await mensajesHoy(m.de)
    if (hoy > barberia.maxMensajesDia) {
      if (hoy === barberia.maxMensajesDia + 1) {
        const llamar = barberia.telefono ? ` Si es urgente, llama al ${barberia.telefono}.` : ''
        await enviarTexto(m.de, `Por hoy ya no puedo contestar más mensajes. Mañana sigo contigo.${llamar}`)
      }
      return
    }
    // El dueño está hablando con este cliente desde el panel: el bot no contesta, solo le pasa el mensaje.
    if (await pausadoHasta(m.de)) return await reenviarAlDueno(m.de, m.nombre, texto)
    const respuesta = await responder(m.de, m.nombre)
    await enviarTexto(m.de, respuesta)
    await guardarMensaje(m.de, 'bot', respuesta)
  } catch (e) {
    console.error('[whatsapp]', e)
    await enviarTexto(m.de, 'Perdona, ahora mismo no puedo contestar. Inténtalo en un rato.').catch(() => {})
  }
}

// WhatsApp manda aquí cada mensaje. Contestamos "ok" enseguida y el bot trabaja después.
export async function POST(request: Request) {
  const cuerpo = await request.text()
  const secreto = process.env.WHATSAPP_APP_SECRET
  if (!secreto || !firmaValida(cuerpo, request.headers.get('x-hub-signature-256'), secreto)) {
    return new Response('Firma no válida', { status: 401 })
  }
  let mensajes: Entrante[] = []
  try {
    mensajes = leerWebhook(JSON.parse(cuerpo))
  } catch {
    return new Response('JSON no válido', { status: 400 })
  }
  // Uno detrás de otro para que dos mensajes seguidos del mismo cliente no se crucen.
  waitUntil(mensajes.reduce((cola, m) => cola.then(() => atender(m)), Promise.resolve()))
  return new Response('ok')
}
