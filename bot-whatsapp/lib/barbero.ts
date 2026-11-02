import { barberia } from '../config/barberia.ts'
import { cambiarEstado, guardarMensaje, ponerEspera, sacarEspera, verPeticion, type Peticion } from './db.ts'
import { leerBoton, soloNumeros, type Entrante } from './entrada.ts'
import { cuando } from './fechas.ts'
import { enviarAviso, enviarConBotones, enviarTexto } from './whatsapp.ts'

// Lo que pasa en el lado del barbero: recibe la petición, la pasa a Booksy y pulsa un botón.

const PLANTILLA_BARBERO = process.env.WHATSAPP_PLANTILLA_BARBERO || 'peticion_cita'
const PLANTILLA_CLIENTE = process.env.WHATSAPP_PLANTILLA_CLIENTE || 'aviso_cita'

// WhatsApp al que van las peticiones de ese barbero ("cualquiera" o sin número → dueño).
export function telefonoDe(nombreBarbero: string): string {
  const b = barberia.barberos.find((x) => x.nombre.toLowerCase() === nombreBarbero.toLowerCase())
  return soloNumeros(b?.whatsapp || barberia.whatsappDueno)
}

export function esDelEquipo(telefono: string): boolean {
  const equipo = [barberia.whatsappDueno, ...barberia.barberos.map((b) => b.whatsapp)].map(soloNumeros).filter(Boolean)
  return equipo.includes(soloNumeros(telefono))
}

const resumen = (p: Peticion) => `${p.cliente_nombre} (+${p.cliente_telefono}): ${p.servicio} con ${p.barbero}, ${cuando(p.inicio, barberia.zonaHoraria)}`

export async function avisarPeticion(p: Peticion): Promise<void> {
  const texto =
    `📅 Nueva cita para pasar a Booksy\n${resumen(p)}\n\n` +
    `Mírala en Booksy y apúntala. Luego pulsa "Hecho" y se lo confirmo al cliente.`
  await enviarConBotones(
    telefonoDe(p.barbero),
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
  await enviarAviso(telefonoDe(p.barbero), `❌ Cita cancelada por el cliente. Bórrala de Booksy: ${resumen(p)}`, PLANTILLA_CLIENTE)
}

// Mensaje al cliente que también queda en su conversación con el bot.
async function decirAlCliente(telefono: string, texto: string) {
  await enviarAviso(telefono, texto, PLANTILLA_CLIENTE)
  await guardarMensaje(telefono, 'bot', texto)
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
        `✅ ¡Cita confirmada! ${p.servicio} con ${p.barbero} el ${hora} en ${barberia.nombre} (${barberia.direccion}). Si no puedes venir, escríbenos por aquí.`,
      )
      return enviarTexto(m.de, `Hecho. Se lo he confirmado a ${p.cliente_nombre}.`)
    }
    if (boton.accion === 'no') {
      await cambiarEstado(p.id, 'rechazada')
      await decirAlCliente(p.cliente_telefono, `Lo siento, ${p.barbero} no tiene hueco el ${hora}. ¿Te viene bien otra hora u otro día?`)
      return enviarTexto(m.de, `Vale. Le he dicho a ${p.cliente_nombre} que elija otra hora.`)
    }
    await ponerEspera(soloNumeros(m.de), p.id)
    return enviarTexto(m.de, `¿Qué hora le propones a ${p.cliente_nombre}? Escríbela, por ejemplo: "20:30" o "viernes a las 18:00".`)
  }

  // Si el barbero pulsó "Otra hora", lo que escriba ahora es la hora que propone.
  const id = await sacarEspera(soloNumeros(m.de))
  if (id && m.texto) {
    const p = await verPeticion(id)
    if (p && p.estado === 'pendiente') {
      await cambiarEstado(p.id, 'otra_hora')
      await decirAlCliente(
        p.cliente_telefono,
        `${p.barbero} no tiene hueco el ${cuando(p.inicio, barberia.zonaHoraria)}, pero te propone: ${m.texto}. ¿Te va bien?`,
      )
      return enviarTexto(m.de, `Se lo he dicho a ${p.cliente_nombre}. Si acepta, te llegará la cita nueva para apuntarla.`)
    }
  }

  return enviarTexto(m.de, 'Hola 👋 Soy el asistente de citas. Te mando aquí las citas que piden los clientes; tú solo tienes que pulsar los botones.')
}
