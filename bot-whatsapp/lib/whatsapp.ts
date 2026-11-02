import { createHmac, timingSafeEqual } from 'node:crypto'
import { paraPlantilla } from './entrada.ts'

// Envío de mensajes con la API oficial de WhatsApp (Meta Cloud API).
const API = 'https://graph.facebook.com/v23.0'

// Fuera de las 24 h desde el último mensaje de esa persona, WhatsApp solo deja mandar plantillas aprobadas.
const FUERA_DE_VENTANA = 131047

class ErrorWhatsApp extends Error {
  codigo: number | undefined
  constructor(message: string, codigo: number | undefined) {
    super(message)
    this.codigo = codigo
  }
}

async function enviar(cuerpo: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...cuerpo }),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: { message?: string; code?: number } } | null
    throw new ErrorWhatsApp(data?.error?.message ?? `WhatsApp respondió ${res.status}`, data?.error?.code)
  }
}

export const enviarTexto = (to: string, texto: string) => enviar({ to, type: 'text', text: { body: texto.slice(0, 4096) } })

export type Boton = { id: string; titulo: string } // título: 20 letras como mucho

// Plantilla aprobada en Meta con un hueco {{1}} en el texto y, si hace falta, botones de respuesta rápida.
function enviarPlantilla(to: string, nombre: string, texto: string, botones: Boton[] = []) {
  return enviar({
    to,
    type: 'template',
    template: {
      name: nombre,
      language: { code: 'es' },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: paraPlantilla(texto) }] },
        ...botones.map((b, i) => ({ type: 'button', sub_type: 'quick_reply', index: String(i), parameters: [{ type: 'payload', payload: b.id }] })),
      ],
    },
  })
}

// Mensaje con botones (hasta 3). Si la persona no ha escrito en 24 h, se manda la plantilla (si se da una).
// textoPlantilla: lo que va en el hueco {{1}} de la plantilla (por defecto, el mismo texto).
export async function enviarConBotones(to: string, texto: string, botones: Boton[], plantilla?: string, textoPlantilla = texto): Promise<void> {
  try {
    await enviar({
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: texto.slice(0, 1024) },
        action: { buttons: botones.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.titulo.slice(0, 20) } })) },
      },
    })
  } catch (e) {
    if (plantilla && e instanceof ErrorWhatsApp && e.codigo === FUERA_DE_VENTANA) return enviarPlantilla(to, plantilla, textoPlantilla, botones)
    throw e
  }
}

// Texto normal; si la persona no ha escrito en 24 h, se manda la plantilla con el mismo texto.
export async function enviarAviso(to: string, texto: string, plantilla: string): Promise<void> {
  try {
    await enviarTexto(to, texto)
  } catch (e) {
    if (e instanceof ErrorWhatsApp && e.codigo === FUERA_DE_VENTANA) return enviarPlantilla(to, plantilla, texto)
    throw e
  }
}

// Comprueba que el mensaje viene de verdad de Meta (cabecera X-Hub-Signature-256).
export function firmaValida(cuerpo: string, firma: string | null, secreto: string): boolean {
  if (!firma?.startsWith('sha256=')) return false
  const esperada = Buffer.from(createHmac('sha256', secreto).update(cuerpo).digest('hex'))
  const recibida = Buffer.from(firma.slice(7))
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida)
}
