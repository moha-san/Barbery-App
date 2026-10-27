'use server'

import { revalidatePath } from 'next/cache'
import { addDays } from 'date-fns'
import { z } from 'zod'
import { siteConfig } from '@/config/site'
import { freeSlots } from '@/lib/shop'
import { localDateKey } from '@/lib/format'
import { createAdminClient, createSessionClient } from '@/lib/supabase/server'
import { sendCancelAlert, sendImmediateAlert, sendManualReminder } from '@/actions/notifications'
import type { AppointmentWithRelations } from '@/types/database'

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
const uuidSchema = z.string().uuid()

function isBookableDate(date: string): boolean {
  const today = localDateKey(new Date())
  const last = localDateKey(addDays(new Date(), siteConfig.bookingWindowDays))
  return date >= today && date <= last
}

export async function getAvailableSlots(
  date: string,
  barberId: string,
  serviceDuration: number,
): Promise<ActionResult<string[]>> {
  const parsed = z
    .object({ date: dateSchema, barberId: uuidSchema, serviceDuration: z.number().int().min(5).max(480) })
    .safeParse({ date, barberId, serviceDuration })
  if (!parsed.success) return { ok: false, error: 'Datos de búsqueda inválidos' }
  if (!isBookableDate(date)) return { ok: true, data: [] }

  try {
    return { ok: true, data: await freeSlots(date, barberId, serviceDuration) }
  } catch (e) {
    console.error('[getAvailableSlots]', e)
    return { ok: false, error: 'No se pudo cargar la disponibilidad' }
  }
}

const bookingSchema = z.object({
  barberId: uuidSchema,
  serviceId: uuidSchema,
  startTime: z.string().datetime({ offset: true }),
  nombre: z.string().trim().min(2, 'Escribe tu nombre').max(100),
  telefono: z
    .string()
    .transform((v) => v.replace(/[\s\-().]/g, ''))
    .pipe(z.string().regex(/^\+?[0-9]{6,15}$/, 'Teléfono inválido')),
})

export type BookingInput = z.input<typeof bookingSchema>

export async function bookAppointment(input: BookingInput): Promise<ActionResult<{ id: string }>> {
  const parsed = bookingSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const data = parsed.data
  const supabase = createAdminClient()

  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('duracion_min')
    .eq('id', data.serviceId)
    .eq('activo', true)
    .single()
  if (serviceError || !service) return { ok: false, error: 'Servicio no disponible' }

  // 1) Reglas de negocio: dentro del horario, en el futuro y libre ahora mismo.
  const date = localDateKey(data.startTime)
  const startIso = new Date(data.startTime).toISOString()
  if (!isBookableDate(date)) return { ok: false, error: 'Fecha fuera del periodo de reservas' }
  try {
    const slots = await freeSlots(date, data.barberId, service.duracion_min)
    if (!slots.includes(startIso)) return { ok: false, error: 'Esa hora ya no está disponible. Elige otra.' }
  } catch (e) {
    console.error('[bookAppointment] disponibilidad', e)
    return { ok: false, error: 'No se pudo comprobar la disponibilidad' }
  }

  // 2) Inserción atómica. Si otra reserva entró entre el paso 1 y este, la restricción
  //    de exclusión de Postgres la rechaza con 23P01: nunca hay dos citas solapadas.
  const { data: id, error } = await supabase.rpc('book_appointment', {
    p_barber_id: data.barberId,
    p_service_id: data.serviceId,
    p_start_time: startIso,
    p_nombre: data.nombre,
    p_telefono: data.telefono,
  })
  if (error) {
    if (error.code === '23P01') return { ok: false, error: 'Alguien acaba de reservar esa hora. Elige otra.' }
    if (error.code === 'P0002') return { ok: false, error: error.message }
    console.error('[bookAppointment] insert', error)
    return { ok: false, error: 'No se pudo guardar la reserva' }
  }

  // 3) Aviso al móvil del dueño. Si falla, la reserva ya guardada sigue valiendo.
  try {
    const { data: appointment } = await supabase
      .from('appointments')
      .select('*, barber:barbers(id, nombre), client:users(id, nombre, telefono), service:services(id, nombre, duracion_min, precio)')
      .eq('id', id)
      .single()
    if (appointment) await sendImmediateAlert(appointment as AppointmentWithRelations)
  } catch (e) {
    console.error('[bookAppointment] aviso', e)
  }

  revalidatePath('/dashboard')
  return { ok: true, data: { id } }
}

const statusSchema = z.object({
  id: uuidSchema,
  status: z.enum(['completada', 'no_presentado', 'confirmada', 'cancelada']),
})

// Usa la sesión del barbero: RLS decide si puede cambiarla.
export async function updateAppointmentStatus(
  id: string,
  status: 'completada' | 'no_presentado' | 'confirmada' | 'cancelada',
): Promise<ActionResult> {
  const parsed = statusSchema.safeParse({ id, status })
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' }

  const { data, error } = await createSessionClient()
    .from('appointments')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.id)
    .select('id')
  if (error) {
    // Volver a 'confirmada' una cita cancelada puede chocar con otra ya reservada.
    if (error.code === '23P01') return { ok: false, error: 'Ese hueco ya está ocupado por otra cita' }
    return { ok: false, error: 'No se pudo actualizar la cita' }
  }
  if (!data.length) return { ok: false, error: 'Sin permiso para cambiar esta cita' }

  revalidatePath('/dashboard')
  return { ok: true, data: undefined }
}

// Botón "Avisar" del panel: manda un recordatorio al móvil del cliente.
export async function remindClient(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: 'Datos inválidos' }
  // Con la sesión del barbero: si RLS no le deja ver la cita, no puede avisar.
  const { data } = await createSessionClient().from('appointments').select('id').eq('id', id).eq('status', 'confirmada').maybeSingle()
  if (!data) return { ok: false, error: 'Sin permiso para esta cita' }
  try {
    const sent = await sendManualReminder(id)
    if (!sent) return { ok: false, error: 'Este cliente no tiene los avisos activados. Usa WhatsApp.' }
    return { ok: true, data: undefined }
  } catch (e) {
    console.error('[remindClient]', e)
    return { ok: false, error: 'No se pudo enviar el aviso' }
  }
}

const normalizePhone = (v: string) => v.replace(/[\s\-().]/g, '')

// El cliente cancela su cita desde el móvil. Sin cuenta: se comprueba con el teléfono con el que reservó.
export async function cancelMyAppointment(id: string, telefono: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success || !telefono) return { ok: false, error: 'Datos inválidos' }
  const supabase = createAdminClient()
  const { data: a } = await supabase
    .from('appointments')
    .select('id, barber_id, start_time, status, client:users(nombre, telefono), barber:barbers(nombre)')
    .eq('id', id)
    .maybeSingle()
  const appt = a as unknown as { id: string; barber_id: string; start_time: string; status: string; client: { nombre: string; telefono: string } | null; barber: { nombre: string } | null } | null
  if (!appt || !appt.client || normalizePhone(appt.client.telefono) !== normalizePhone(telefono)) {
    return { ok: false, error: 'No encontramos esa cita. Escríbenos por WhatsApp.' }
  }
  if (appt.status === 'cancelada') return { ok: true, data: undefined }
  if (appt.status !== 'confirmada' || new Date(appt.start_time).getTime() <= Date.now()) {
    return { ok: false, error: 'Esta cita ya no se puede cancelar desde aquí. Llámanos.' }
  }
  const { error } = await supabase.from('appointments').update({ status: 'cancelada' }).eq('id', id).eq('status', 'confirmada')
  if (error) return { ok: false, error: 'No se pudo cancelar. Inténtalo otra vez.' }
  try {
    // Si hay gente en lista de espera para ese día, el aviso lo dice para que el barbero les escriba.
    const { count } = await supabase.from('waitlist').select('id', { count: 'exact', head: true }).eq('fecha', localDateKey(appt.start_time))
    await sendCancelAlert(appt, count ?? 0)
  } catch (e) {
    console.error('[cancelMyAppointment] aviso', e)
  }
  revalidatePath('/dashboard')
  return { ok: true, data: undefined }
}
