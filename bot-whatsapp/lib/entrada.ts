// Lee lo que manda WhatsApp (webhook de Meta) y lo deja en algo simple.
// Sin dependencias para poder probarlo con `npm test`.

export type Entrante = {
  waId: string // id del mensaje en WhatsApp (para no procesarlo dos veces)
  de: string // teléfono del que escribe, solo números (34600111222)
  nombre: string // nombre de su perfil de WhatsApp
  texto: string // lo que escribió (vacío si pulsó un botón)
  boton: string | null // id del botón pulsado ("hecho:12")
}

type Mensaje = {
  id?: string
  from?: string
  type?: string
  text?: { body?: string }
  button?: { payload?: string; text?: string }
  interactive?: { button_reply?: { id?: string; title?: string } }
}
type Payload = {
  entry?: { changes?: { value?: { contacts?: { wa_id?: string; profile?: { name?: string } }[]; messages?: Mensaje[] } }[] }[]
}

export function leerWebhook(body: unknown): Entrante[] {
  const out: Entrante[] = []
  for (const entry of (body as Payload)?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value
      for (const m of value?.messages ?? []) {
        if (!m.id || !m.from) continue
        const nombre = value?.contacts?.find((c) => c.wa_id === m.from)?.profile?.name ?? ''
        // Botón de mensaje normal (interactive) o de plantilla (button).
        const boton = m.interactive?.button_reply?.id ?? m.button?.payload ?? null
        let texto = m.text?.body ?? ''
        if (!texto && !boton) {
          // Audio, foto, ubicación…: el bot pide que lo escriba.
          texto = `[El cliente ha enviado un mensaje de tipo "${m.type ?? 'desconocido'}" que no es texto]`
        }
        out.push({ waId: m.id, de: m.from, nombre, texto: texto.trim(), boton })
      }
    }
  }
  return out
}

export type AccionBoton = { accion: 'hecho' | 'otra' | 'no' | 'mas30' | 'mas60' | 'escribir'; peticionId: number }

// Botones del aviso al barbero: "hecho:12", "otra:12", "no:12" y, tras "Otra hora", "mas30:12", "mas60:12", "escribir:12".
export function leerBoton(id: string | null): AccionBoton | null {
  const m = /^(hecho|otra|no|mas30|mas60|escribir):(\d+)$/.exec(id ?? '')
  return m ? { accion: m[1] as AccionBoton['accion'], peticionId: Number(m[2]) } : null
}

export const soloNumeros = (tel: string) => tel.replace(/\D/g, '')

// Las plantillas de WhatsApp no aceptan saltos de línea ni muchos espacios seguidos en sus huecos.
export const paraPlantilla = (texto: string) => texto.replace(/\s*\n+\s*/g, ' · ').replace(/\s{2,}/g, ' ').trim().slice(0, 1000)
