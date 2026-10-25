'use server'

import { revalidatePath } from 'next/cache'
import { addDays } from 'date-fns'
import { TZDate } from '@date-fns/tz'
import { z } from 'zod'
import { siteConfig } from '@/config/site'
import { computeSlots } from '@/lib/slots'
import { localDateKey } from '@/lib/format'
import { createAdminClient, createSessionClient } from '@/lib/supabase/server'
import { sendImmediateAlert } from '@/actions/notifications'
import type { AppointmentWithRelations } from '@/types/database'

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
const uuidSchema = z.string().uuid()

function dayBounds(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const start = new TZDate(y, m - 1, d, 0, 0, siteConfig.timezone)
  return { start, end: addDays(start, 1) }
}

function isBookableDate(date: string): boolean {
  const today = localDateKey(new Date())
  const last = localDateKey(addDays(new Date(), siteConfig.bookingWindowDays))
  return date >= today && date <= last
}

async function freeSlots(date: string, barberId: string, durationMin: number): Promise<string[]> {
  const { start, end } = dayBounds(date)
  const { data, error } = await createAdminClient()
    .from('appointments')
    .select('start_time, end_time')
    .eq('barber_id', barberId)
    .neq('status', 'cancelada')
    .lt('start_time', end.toISOString())
    .gt('end_time', start.toISOString())
  if (error) throw new Error(error.message)

  return computeSlots({
    date,
    windowsByWeekday: siteConfig.businessHours,
    timezone: siteConfig.timezone,
    durationMin,
    stepMin: siteConfig.slotStepMin,
    busy: data.map((a) => ({ start: a.start_time, end: a.end_time })),
    now: new Date(),
  })
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

  // 3) Aviso al dueño. Un fallo de email no deshace una reserva ya guardada.
  try {
    const { data: appointment } = await supabase
      .from('appointments')
      .select('*, barber:barbers(id, nombre), client:users(id, nombre, telefono), service:services(id, nombre, duracion_min, precio)')
      .eq('id', id)
      .single()
    if (appointment) await sendImmediateAlert(appointment as AppointmentWithRelations)
  } catch (e) {
    console.error('[bookAppointment] email', e)
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
