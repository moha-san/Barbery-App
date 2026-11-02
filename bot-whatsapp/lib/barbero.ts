import { barberia } from '../config/barberia.ts'
import { cambiarEstado, guardarMensaje, marcar, pendientesSin, ponerEspera, sacarEspera, verPeticion, type Peticion } from './db.ts'
import { leerBoton, soloNumeros, type Entrante } from './entrada.ts'
import { cuando } from './fechas.ts'
import { enviarAviso, enviarConBotones, enviarTexto } from './whatsapp.ts'

// Lo que pasa en el lado del barbero: recibe la petición, la pasa a Booksy y pulsa un botón.

const PLANTILLA_BARBERO = process.env.WHATSAPP_PLANTILLA_BARBERO || 'peticion_cita'
const PLANTILLA_CLIENTE = process.env.WHATSAPP_PLANTILLA_CLIENTE || 'aviso_cita'

export const CUALQUIERA = 'el primero libre'

export const localDe = (nombre: string) => barberia.locales.find((l) => l.nombre.toLowerCase() === nombre.toLowerCase())

// WhatsApp al que va la cita: el del barbero; si no tiene (o es "el primero libre"), el del local; si no, el del dueño.
export function telefonoDe(p: Pick<Peticion, 'local' | 'barbero'>): string {
  const local = localDe(p.local)
  const b = local?.barberos.find((x) => x.nombre.toLowerCase() === p.barbero.toLowerCase())
  return soloNumeros(b?.whatsapp || local?.whatsapp || barberia.whatsappDueno)
}

export function esDelEquipo(telefono: string): boolean {
  const equipo = [barberia.whatsappDueno, ...barberia.locales.flatMap((l) => [l.whatsapp, ...l.barberos.map((b) => b.whatsapp)])]
    .map(soloNumeros)
    .filter(Boolean)
  return equipo.includes(soloNumeros(telefono))
}

const enLocal = (p: Peticion) => (barberia.locales.length > 1 ? ` en ${p.local}` : '')
const resumen = (p: Peticion) =>
  `${p.cliente_nombre} (+${p.cliente_telefono}): ${p.servicio} con ${p.barbero}${enLocal(p)}, ${cuando(p.inicio, barberia.zonaHoraria)}`

export async function avisarPeticion(p: Peticion, recordatorio = false): Promise<void> {
  const texto =
    `${recordatorio ? '⏰ Sigue sin contestar' : '📅 Nueva cita para pasar a Booksy'}\n${resumen(p)}\n\n` +
    `Mírala en Booksy y apúntala. Luego pulsa "Hecho" y se lo confirmo al cliente.`
  await enviarConBotones(
    telefonoDe(p),
    texto,
    [
      { id: `hecho:${p.id}`, titulo: 'Hecho' },
      { id: `otra:${p.id}`, titulo: 'Otra hora' },
      { id: `no:${p.id}`, titulo: 'No hay hueco' },
    ],
    PLANTILLA_BARBERO,
    resumen(p),
  )
}

export async function avisarCancelacion(p: Peticion): Promise<void> {
  await enviarAviso(telefonoDe(p), `❌ Cita cancelada por el cliente. Bórrala de Booksy: ${resumen(p)}`, PLANTILLA_CLIENTE)
}

// Mensaje al cliente que también queda en su conversación con el bot.
async function decirAlCliente(telefono: string, texto: string) {
  await enviarAviso(telefono, texto, PLANTILLA_CLIENTE)
  await guardarMensaje(telefono, 'bot', texto)
}

// "20:30": la hora de la cita movida unos minutos (para el botón).
const horaDe = (iso: string, minutos: number) => cuando(new Date(Date.parse(iso) + minutos * 60_000), barberia.zonaHoraria).split(' a las ')[1]

// El barbero no puede a esa hora y propone otra: se la ofrecemos al cliente.
async function proponer(barbero: string, p: Peticion, propuesta: string) {
  await cambiarEstado(p.id, 'otra_hora')
  await decirAlCliente(
    p.cliente_telefono,
    `${p.barbero} no tiene hueco el ${cuando(p.inicio, barberia.zonaHoraria)}, pero te propone: ${propuesta}. ¿Te va bien?`,
  )
  return enviarTexto(barbero, `Se lo he dicho a ${p.cliente_nombre}. Si acepta, te llegará la cita nueva para apuntarla.`)
}

export async function atenderEquipo(m: Entrante): Promise<void> {
  const boton = leerBoton(m.boton)

  if (boton) {
    const p = await verPeticion(boton.peticionId)
    if (!p) return enviarTexto(m.de, 'No encuentro esa cita.')
    if (p.estado === 'cancelada') return enviarTexto(m.de, 'Esa cita la canceló el cliente. No hace falta hacer nada.')
    if (p.estado !== 'pendiente') return enviarTexto(m.de, 'Esa cita ya estaba contestada.')
    const hora = cuando(p.inicio, barberia.zonaHoraria)

    if (boton.accion === 'hecho') {
      await cambiarEstado(p.id, 'confirmada')
      await decirAlCliente(
        p.cliente_telefono,
        `✅ ¡Cita confirmada! ${p.servicio} con ${p.barbero} el ${hora} en ${barberia.nombre}${enLocal(p)} (${localDe(p.local)?.direccion ?? barberia.ciudad}). Si no puedes venir, escríbenos por aquí.`,
      )
      return enviarTexto(m.de, `Hecho. Se lo he confirmado a ${p.cliente_nombre}.`)
    }
    if (boton.accion === 'no') {
      await cambiarEstado(p.id, 'rechazada')
      await decirAlCliente(p.cliente_telefono, `Lo siento, ${p.barbero} no tiene hueco el ${hora}. ¿Te viene bien otra hora u otro día?`)
      return enviarTexto(m.de, `Vale. Le he dicho a ${p.cliente_nombre} que elija otra hora.`)
    }
    if (boton.accion === 'otra') {
      // Lo normal es mover la cita un poco: dos botones y, si no, que la escriba.
      return enviarConBotones(
        m.de,
        `¿Qué hora le propones a ${p.cliente_nombre}? (pidió ${hora})`,
        [
          { id: `mas30:${p.id}`, titulo: `${horaDe(p.inicio, 30)}` },
          { id: `mas60:${p.id}`, titulo: `${horaDe(p.inicio, 60)}` },
          { id: `escribir:${p.id}`, titulo: 'Escribir otra' },
        ],
      )
    }
    if (boton.accion === 'mas30' || boton.accion === 'mas60') {
      const nueva = new Date(Date.parse(p.inicio) + (boton.accion === 'mas30' ? 30 : 60) * 60_000)
      return proponer(m.de, p, cuando(nueva, barberia.zonaHoraria))
    }
    await ponerEspera(soloNumeros(m.de), p.id)
    return enviarTexto(m.de, `Escribe la hora que le propones a ${p.cliente_nombre}, por ejemplo: "20:30" o "viernes a las 18:00".`)
  }

  // Si el barbero pulsó "Otra hora", lo que escriba ahora es la hora que propone.
  const id = await sacarEspera(soloNumeros(m.de))
  if (id && m.texto) {
    const p = await verPeticion(id)
    if (p && p.estado === 'pendiente') return proponer(m.de, p, m.texto)
  }

  return enviarTexto(m.de, 'Hola 👋 Soy el asistente de citas. Te mando aquí las citas que piden los clientes; tú solo tienes que pulsar los botones.')
}

// Lo llama el planificador cada 5 min: recuerda al barbero las citas sin contestar y, si tarda mucho, avisa al cliente.
export async function revisarPendientes(): Promise<{ recordadas: number; clientes: number }> {
  let recordadas = 0
  let clientes = 0
  for (const p of await pendientesSin('recordada', barberia.minutosRecordatorio)) {
    await marcar(p.id, 'recordada') // primero se marca: si el envío falla, no se repite en bucle
    await avisarPeticion(p, true).then(() => recordadas++, (e) => console.error('[recordatorio]', p.id, e))
  }
  for (const p of await pendientesSin('cliente_avisado', barberia.minutosAvisoCliente)) {
    await marcar(p.id, 'cliente_avisado')
    const llamar = barberia.telefono ? ` Si te corre prisa, llama al ${barberia.telefono}.` : ''
    await decirAlCliente(p.cliente_telefono, `${p.barbero === CUALQUIERA ? 'El barbero' : p.barbero} aún no ha podido mirar tu cita. Te aviso en cuanto conteste.${llamar}`).then(
      () => clientes++,
      (e) => console.error('[aviso cliente]', p.id, e),
    )
  }
  return { recordadas, clientes }
}
