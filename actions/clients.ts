'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { siteConfig } from '@/config/site'
import { freeSlots } from '@/lib/shop'
import { localDateKey } from '@/lib/format'
import { getStaff } from '@/lib/staff'
import { createAdminClient, createSessionClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/actions/appointments'

const uuid = z.string().uuid()
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige el día')
const phoneSchema = z
  .string()
  .transform((v) => v.replace(/[\s\-().]/g, ''))
  .pipe(z.string().regex(/^\+?[0-9]{6,15}$/, 'Teléfono inválido'))
const MISSING_SQL = 'Falta preparar la base de datos (pega el SQL clientes.sql en Supabase)'

async function staff() {
  const supabase = createSessionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('rol').eq('id', user.id).single()
  if (!data || data.rol === 'cliente') return null
  return supabase
}

// ─── Ficha de cliente ─────────────────────────────────────────────────────
export async function saveClientNotes(id: string, notas: string): Promise<ActionResult> {
  const supabase = await staff()
  if (!supabase) return { ok: false, error: 'Inicia sesión otra vez' }
  const parsed = z.object({ id: uuid, notas: z.string().trim().max(1000, 'Máximo 1000 letras') }).safeParse({ id, notas })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const { error } = await supabase.from('users').update({ notas: parsed.data.notas || null }).eq('id', id)
  if (error) return { ok: false, error: error.code === '42703' ? MISSING_SQL : 'No se pudieron guardar las notas' }
  revalidatePath(`/dashboard/clientes/${id}`)
  return { ok: true, data: undefined }
}

// ─── Cita rápida (el barbero la apunta: cliente que llama o entra sin cita) ──
export async function staffSlots(date: string, barberId: string, serviceId: string): Promise<ActionResult<string[]>> {
  if (!(await staff())) return { ok: false, error: 'Inicia sesión otra vez' }
  if (!dateSchema.safeParse(date).success || !uuid.safeParse(barberId).success || !uuid.safeParse(serviceId).success) return { ok: true, data: [] }
  const { data: service } = await createAdminClient().from('services').select('duracion_min').eq('id', serviceId).single()
  if (!service) return { ok: true, data: [] }
  try {
    return { ok: true, data: await freeSlots(date, barberId, service.duracion_min) }
  } catch {
    return { ok: false, error: 'No se pudieron cargar las horas libres' }
  }
}

const quickSchema = z.object({
  barberId: uuid,
  serviceId: uuid,
  startTime: z.string().datetime({ offset: true }),
  nombre: z.string().trim().min(2, 'Escribe el nombre').max(100),
  telefono: phoneSchema,
})

// Sin reglas de horario: el barbero manda. Solo Postgres impide que se solapen dos citas.
export async function quickBook(input: z.input<typeof quickSchema>): Promise<ActionResult<{ id: string; fecha: string }>> {
  const s = await getStaff()
  if (!s) return { ok: false, error: 'Inicia sesión otra vez' }
  const parsed = quickSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const v = parsed.data
  // Un barbero con cuenta propia solo apunta citas en su agenda.
  if (s.barberId && v.barberId !== s.barberId) return { ok: false, error: 'Solo puedes apuntar citas en tu agenda' }
  const { data: id, error } = await createAdminClient().rpc('book_appointment', {
    p_barber_id: v.barberId,
    p_service_id: v.serviceId,
    p_start_time: new Date(v.startTime).toISOString(),
    p_nombre: v.nombre,
    p_telefono: v.telefono,
  })
  if (error) {
    if (error.code === '23P01') return { ok: false, error: 'A esa hora ese barbero ya tiene otra cita' }
    if (error.code === 'P0002') return { ok: false, error: error.message }
    return { ok: false, error: 'No se pudo guardar la cita' }
  }
  revalidatePath('/dashboard')
  return { ok: true, data: { id, fecha: localDateKey(v.startTime) } }
}

// ─── Lista de espera ──────────────────────────────────────────────────────
const waitSchema = z.object({
  fecha: dateSchema,
  barberId: uuid.nullable(),
  serviceId: uuid.nullable(),
  nombre: z.string().trim().min(2, 'Escribe tu nombre').max(100),
  telefono: phoneSchema,
})

// El cliente se apunta desde la web, sin cuenta (por eso va por el servidor).
export async function joinWaitlist(input: z.input<typeof waitSchema>): Promise<ActionResult> {
  const parsed = waitSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const v = parsed.data
  const today = localDateKey(new Date())
  if (v.fecha < today) return { ok: false, error: 'Ese día ya ha pasado' }
  const { error } = await createAdminClient()
    .from('waitlist')
    .upsert(
      { fecha: v.fecha, barber_id: v.barberId, service_id: v.serviceId, nombre: v.nombre, telefono: v.telefono },
      { onConflict: 'fecha,telefono' },
    )
  if (error) {
    console.error('[joinWaitlist]', error)
    return { ok: false, error: `No se pudo apuntar. Escríbenos por WhatsApp al ${siteConfig.phone}.` }
  }
  revalidatePath('/dashboard')
  return { ok: true, data: undefined }
}

export async function removeFromWaitlist(id: string): Promise<ActionResult> {
  const supabase = await staff()
  if (!supabase) return { ok: false, error: 'Inicia sesión otra vez' }
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Datos inválidos' }
  const { error } = await supabase.from('waitlist').delete().eq('id', id)
  if (error) return { ok: false, error: 'No se pudo quitar' }
  revalidatePath('/dashboard')
  return { ok: true, data: undefined }
}
