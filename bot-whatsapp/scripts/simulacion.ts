// Simulación gratis del bot: sin WhatsApp, sin Supabase y sin gastar en IA.
// Finge un cliente y un barbero hablando con el bot y enseña lo que se mandan.
// Uso: npm run simulacion
import { mock } from 'node:test'
import { createHmac } from 'node:crypto'
import assert from 'node:assert/strict'

const CLIENTE = '34611000111'
const ADRIAN = '34622000222'
const DUENO = '34633000333'
const SECRETO = 'secreto-de-prueba'
process.env.WHATSAPP_APP_SECRET = SECRETO
process.env.WHATSAPP_PHONE_NUMBER_ID = '123'
process.env.WHATSAPP_TOKEN = 'token'
process.env.ANTHROPIC_API_KEY = 'clave-falsa'

const aqui = (ruta: string) => new URL(ruta, import.meta.url).href

// ── Datos de la barbería con teléfonos de prueba ──
const { barberia } = await import(aqui('../config/barberia.ts'))
mock.module(aqui('../config/barberia.ts'), {
  namedExports: {
    barberia: {
      ...barberia,
      whatsappDueno: DUENO,
      semanasVolver: 5,
      resenaGoogle: 'https://g.page/r/dradeb-prueba/review',
      locales: barberia.locales.map((l: { nombre: string }, i: number) =>
        i === 0 ? { ...l, barberos: [{ nombre: 'Josiko', whatsapp: '' }, { nombre: 'Adrián', whatsapp: ADRIAN }] } : l,
      ),
    },
  },
})

// ── Base de datos en memoria ──
type Fila = Record<string, unknown> & { id: number }
const tablas = { mensajes: [] as { telefono: string; rol: string; texto: string }[], recibidos: new Set<string>(), peticiones: [] as Fila[], esperas: new Map<string, number>(), recuperados: new Set<string>(), pausas: new Map<string, number>() }
mock.module(aqui('../lib/db.ts'), {
  namedExports: {
    marcarRecibido: async (id: string) => (tablas.recibidos.has(id) ? false : (tablas.recibidos.add(id), true)),
    guardarMensaje: async (telefono: string, rol: string, texto: string) => void tablas.mensajes.push({ telefono, rol, texto }),
    historial: async (telefono: string) => tablas.mensajes.filter((m) => m.telefono === telefono).slice(-20).map(({ rol, texto }) => ({ rol, texto })),
    crearPeticion: async (p: Record<string, unknown>) => {
      const fila = { ...p, id: tablas.peticiones.length + 1, estado: 'pendiente', recordada: false, cliente_avisado: false, created_at: new Date().toISOString() }
      tablas.peticiones.push(fila)
      return fila
    },
    verPeticion: async (id: number) => tablas.peticiones.find((p) => p.id === id) ?? null,
    cambiarEstado: async (id: number, estado: string) => void Object.assign(tablas.peticiones.find((p) => p.id === id)!, { estado }),
    citasFuturas: async (tel: string) =>
      tablas.peticiones.filter((p) => p.cliente_telefono === tel && ['pendiente', 'confirmada'].includes(p.estado as string) && Date.parse(p.inicio as string) > Date.now()),
    pendientesSin: async (campo: string, min: number) =>
      tablas.peticiones.filter((p) => p.estado === 'pendiente' && !p[campo] && Date.parse(p.created_at as string) < Date.now() - min * 60_000),
    citasParaResena: async (h: number) =>
      tablas.peticiones.filter((p) => p.estado === 'confirmada' && !p.resena_pedida && Date.parse(p.inicio as string) < Date.now() - h * 3_600_000),
    clientesParaVolver: async (sem: number) => {
      const viejas = tablas.peticiones.filter((p) => p.estado === 'confirmada' && Date.parse(p.inicio as string) < Date.now() - sem * 7 * 86_400_000)
      return viejas.filter((p) => !tablas.recuperados.has(p.cliente_telefono as string))
    },
    marcarRecuperado: async (tel: string) => void tablas.recuperados.add(tel),
    pausadoHasta: async (tel: string) => ((tablas.pausas.get(tel) ?? 0) > Date.now() ? new Date(tablas.pausas.get(tel)!) : null),
    marcar: async (id: number, campo: string) => void (tablas.peticiones.find((p) => p.id === id)![campo] = true),
    ponerEspera: async (tel: string, id: number) => void tablas.esperas.set(tel, id),
    sacarEspera: async (tel: string) => {
      const id = tablas.esperas.get(tel) ?? null
      tablas.esperas.delete(tel)
      return id
    },
  },
})

// waitUntil de Vercel: aquí guardamos el trabajo pendiente para esperarlo.
const pendientes: Promise<unknown>[] = []
mock.module('@vercel/functions', { namedExports: { waitUntil: (p: Promise<unknown>) => void pendientes.push(p) } })

// ── WhatsApp e IA falsos (se intercepta fetch) ──
type Enviado = { to: string; tipo: string; texto: string; botones: string[] }
const enviados: Enviado[] = []
let fallarVentanaUnaVez = true // la primera vez, el barbero "lleva más de 24 h sin escribir"
const peticionesIA: { system: string; fallbacks: unknown; betas: string | null; ultima: unknown }[] = []

// Siguiente viernes en formato AAAA-MM-DD.
const viernes = (() => {
  const d = new Date()
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7))
  return d.toISOString().slice(0, 10)
})()

// "Claude" de mentira: responde según el último mensaje, con las mismas formas que la API real.
function iaFalsa(body: { messages: { role: string; content: unknown }[] }) {
  const ultimo = body.messages.at(-1)!
  const textoUsuario = [...body.messages].reverse().find((m) => m.role === 'user' && typeof m.content === 'string')?.content as string
  const herramienta = (name: string, input: object) => ({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: `t${Math.random()}`, name, input }] })
  const texto = (t: string) => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: t }] })
  if (Array.isArray(ultimo.content)) {
    const r = (ultimo.content as { content: string }[])[0].content
    if (r.startsWith('id ')) return herramienta('cancelar_cita', { id: Number(/^id (\d+)/.exec(r)![1]) })
    return texto(`Hecho 👍 (${r.split('.')[0]}). Te aviso por aquí.`)
  }
  if (/cuánto|precio/i.test(textoUsuario)) return texto('El corte + barba completa son 15 €. ¿Quieres cita?')
  if (/viernes/i.test(textoUsuario)) return herramienta('pedir_cita', { nombre: 'Juan', local: 'Centro', servicio: 'Corte + barba completa', barbero: 'Adrián', fecha: viernes, hora: '20:00' })
  if (/vale/i.test(textoUsuario)) return herramienta('pedir_cita', { nombre: 'Juan', local: 'Centro', servicio: 'Corte + barba completa', barbero: 'Adrián', fecha: viernes, hora: '20:30' })
  if (/domicilio/i.test(textoUsuario)) return herramienta('avisar_al_dueno', { nombre: 'Juan', motivo: 'Corte a domicilio el sábado para 3 personas en La Manga' })
  if (/cancela/i.test(textoUsuario)) return herramienta('ver_mis_citas', {})
  return texto('¿En qué te ayudo?')
}

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input)
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
  const raw = init?.body ?? (input instanceof Request ? await input.text() : '')
  const body = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw as ArrayBuffer))
  if (url.includes('graph.facebook.com')) {
    if (body.type === 'interactive' && body.to === ADRIAN && fallarVentanaUnaVez) {
      fallarVentanaUnaVez = false
      return Response.json({ error: { message: 'Re-engagement message', code: 131047 } }, { status: 400 })
    }
    const texto = body.text?.body ?? body.interactive?.body?.text ?? `[plantilla ${body.template?.name}] ${body.template?.components?.[0]?.parameters?.[0]?.text}`
    const botones = body.interactive?.action?.buttons?.map((b: { reply: { id: string } }) => b.reply.id) ??
      body.template?.components?.slice(1).map((c: { parameters: { payload: string }[] }) => c.parameters[0].payload) ?? []
    enviados.push({ to: body.to, tipo: body.type, texto, botones })
    return Response.json({ messages: [{ id: 'wamid.x' }] })
  }
  if (url.includes('anthropic.com')) {
    peticionesIA.push({ system: body.system, fallbacks: body.fallbacks, betas: headers.get('anthropic-beta'), ultima: body.messages.at(-1) })
    const r = iaFalsa(body)
    return Response.json({ id: 'msg_x', type: 'message', role: 'assistant', model: body.model, stop_details: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 }, ...r })
  }
  throw new Error(`fetch inesperado: ${url}`)
}) as typeof fetch

const { POST } = await import(aqui('../app/api/whatsapp/route.ts'))

// ── Conversación ──
let n = 0
async function llega(de: string, texto: string, boton?: string) {
  const mensaje = boton
    ? { id: `w${++n}`, from: de, type: 'interactive', interactive: { button_reply: { id: boton, title: boton } } }
    : { id: `w${++n}`, from: de, type: 'text', text: { body: texto } }
  const cuerpo = JSON.stringify({ entry: [{ changes: [{ value: { contacts: [{ wa_id: de, profile: { name: 'Juan' } }], messages: [mensaje] } }] }] })
  const firma = 'sha256=' + createHmac('sha256', SECRETO).update(cuerpo).digest('hex')
  const antes = enviados.length
  const res = await POST(new Request('http://x/api/whatsapp', { method: 'POST', body: cuerpo, headers: { 'x-hub-signature-256': firma } }))
  assert.equal(res.status, 200)
  await Promise.all(pendientes.splice(0))
  const quien = de === CLIENTE ? 'CLIENTE' : de === ADRIAN ? 'ADRIÁN' : de
  console.log(`\n▶ ${quien}: ${boton ? `[pulsa ${boton}]` : texto}`)
  for (const e of enviados.slice(antes)) {
    const a = e.to === CLIENTE ? 'cliente' : e.to === ADRIAN ? 'Adrián' : e.to === DUENO ? 'dueño' : e.to
    console.log(`  ◀ bot → ${a}${e.tipo === 'template' ? ' (plantilla)' : ''}: ${e.texto}${e.botones.length ? `  [botones: ${e.botones.join(', ')}]` : ''}`)
  }
  return enviados.slice(antes)
}

const ultimoA = (lista: Enviado[], to: string) => lista.filter((e) => e.to === to).at(-1)

let r = await llega(CLIENTE, '¿Cuánto cuesta corte y barba?')
assert.match(ultimoA(r, CLIENTE)!.texto, /15 €/)

r = await llega(CLIENTE, 'Quiero cita el viernes a las 8 con Adrián')
assert.equal(ultimoA(r, ADRIAN)?.tipo, 'template', 'barbero fuera de las 24 h: plantilla')
assert.deepEqual(ultimoA(r, ADRIAN)?.botones, ['hecho:1', 'otra:1', 'no:1'])
assert.match(ultimoA(r, CLIENTE)!.texto, /Te aviso/)

r = await llega(ADRIAN, '', 'otra:1')
assert.deepEqual(ultimoA(r, ADRIAN)?.botones, ['mas30:1', 'mas60:1', 'escribir:1'])
r = await llega(ADRIAN, '', 'escribir:1')
assert.match(ultimoA(r, ADRIAN)!.texto, /Escribe la hora/)
r = await llega(ADRIAN, '20:30')
assert.match(ultimoA(r, CLIENTE)!.texto, /te propone: 20:30/)

r = await llega(CLIENTE, 'Vale, a las 20:30')
assert.deepEqual(ultimoA(r, ADRIAN)?.botones, ['hecho:2', 'otra:2', 'no:2'])
r = await llega(ADRIAN, '', 'hecho:2')
assert.match(ultimoA(r, CLIENTE)!.texto, /Cita confirmada/)
r = await llega(ADRIAN, '', 'hecho:2')
assert.match(ultimoA(r, ADRIAN)!.texto, /ya estaba contestada/)

// Cita sin contestar: recordatorio al barbero a los 10 min y aviso al cliente a los 30.
const { revisarPendientes } = await import(aqui('../lib/barbero.ts'))
r = await llega(CLIENTE, 'Quiero cita el viernes a las 8 con Adrián')
const p3 = tablas.peticiones[2]
p3.created_at = new Date(Date.now() - 31 * 60_000).toISOString()
let antesR = enviados.length
assert.deepEqual(await revisarPendientes(), { recordadas: 1, clientes: 1, resenas: 0, vuelven: 0 })
console.log('\n▶ [pasan 30 minutos sin que Adrián conteste]')
for (const e of enviados.slice(antesR)) console.log(`  ◀ bot → ${e.to === CLIENTE ? 'cliente' : 'Adrián'}: ${e.texto.split('\n')[0]}`)
assert.deepEqual(await revisarPendientes(), { recordadas: 0, clientes: 0, resenas: 0, vuelven: 0 }, 'cada aviso solo una vez')
// "Otra hora" con el botón de 30 min más tarde.
r = await llega(ADRIAN, '', 'otra:3')
r = await llega(ADRIAN, '', 'mas30:3')
assert.match(ultimoA(r, CLIENTE)!.texto, /te propone: viernes \d+ de \w+ a las 20:30/)

r = await llega(CLIENTE, 'Cancela mi cita, porfa')
assert.match(ultimoA(r, ADRIAN)!.texto, /cancelada/)
assert.equal(tablas.peticiones[1].estado, 'cancelada')

// Encargo especial (domicilio): se le pasa al dueño.
r = await llega(CLIENTE, '¿Hacéis cortes a domicilio? Somos 3 el sábado en La Manga')
assert.match(ultimoA(r, DUENO)!.texto, /domicilio.*\n\nEscríbele: https:\/\/wa.me\/34611000111/s)

// Reseña de Google unas horas después de una cita confirmada (una sola vez).
tablas.peticiones.push({ id: 99, cliente_telefono: CLIENTE, cliente_nombre: 'Juan', local: 'Centro', servicio: 'Corte clásico con perfilado básico', barbero: 'Adrián', inicio: new Date(Date.now() - 3 * 3_600_000).toISOString(), estado: 'confirmada', resena_pedida: false })
antesR = enviados.length
assert.equal((await revisarPendientes()).resenas, 1)
assert.match(enviados.slice(antesR).find((e) => e.to === CLIENTE)!.texto, /reseña en Google.*g\.page/)
console.log(`\n▶ [3 horas después de la cita]\n  ◀ bot → cliente: ${enviados.at(-1)!.texto}`)
assert.equal((await revisarPendientes()).resenas, 0, 'la reseña se pide una vez')

// Cliente que lleva 5 semanas sin venir: el bot le escribe (solo de 11 a 20 h, hora de la barbería).
const horaMadrid = Number(new Intl.DateTimeFormat('es-ES', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Madrid' }).format(new Date()))
const enHorario = horaMadrid >= 11 && horaMadrid < 20
tablas.peticiones.push({ id: 100, cliente_telefono: '34655000444', cliente_nombre: 'Luis', local: 'Centro', servicio: 'Degradado / skin fade', barbero: 'Jared', inicio: new Date(Date.now() - 36 * 86_400_000).toISOString(), estado: 'confirmada', resena_pedida: true })
antesR = enviados.length
assert.equal((await revisarPendientes()).vuelven, enHorario ? 1 : 0)
if (enHorario) {
  assert.match(enviados.at(-1)!.texto, /Luis.*Jared/)
  console.log(`\n▶ [Luis lleva 5 semanas sin venir]\n  ◀ bot → Luis: ${enviados.at(-1)!.texto}`)
  assert.equal((await revisarPendientes()).vuelven, 0, 'solo una vez')
} else console.log('\n▶ [fuera de 11-20 h: el mensaje para que vuelvan no se manda ahora]')

// El dueño habla con el cliente desde el panel: el bot se calla y le reenvía lo que escribe el cliente.
tablas.pausas.set(CLIENTE, Date.now() + 3_600_000)
r = await llega(CLIENTE, '¿Entonces a qué hora venís?')
assert.equal(ultimoA(r, CLIENTE), undefined, 'el bot no contesta')
assert.match(ultimoA(r, DUENO)!.texto, /a qué hora venís/)
tablas.pausas.clear()

// El mismo mensaje dos veces (WhatsApp a veces lo repite): solo se contesta una.
const cuerpo = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ id: 'w1', from: CLIENTE, type: 'text', text: { body: 'hola' } }] } }] }] })
const antes = enviados.length
await POST(new Request('http://x', { method: 'POST', body: cuerpo, headers: { 'x-hub-signature-256': 'sha256=' + createHmac('sha256', SECRETO).update(cuerpo).digest('hex') } }))
await Promise.all(pendientes.splice(0))
assert.equal(enviados.length, antes, 'mensaje repetido ignorado')

// Firma falsa: rechazado.
assert.equal((await POST(new Request('http://x', { method: 'POST', body: cuerpo, headers: { 'x-hub-signature-256': 'sha256=00' } }))).status, 401)

// Cómo se llamó a la IA.
assert.ok(peticionesIA.every((p) => p.fallbacks === 'default' && p.betas?.includes('server-side-fallback-2026-07-01')))
assert.match(peticionesIA[0].system, /Barbería Dradeb/)
assert.match(peticionesIA[0].system, /San Ginés/)

console.log('\n✅ Simulación correcta: dudas, cita, otra hora, confirmación, cancelación, encargo al dueño, el dueño contesta, reseña, clientes que vuelven, repetidos y firma.')
