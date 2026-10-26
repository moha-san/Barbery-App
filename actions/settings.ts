'use server'

import { revalidatePath } from 'next/cache'
import { addDays } from 'date-fns'
import { TZDate } from '@date-fns/tz'
import { z } from 'zod'
import { siteConfig } from '@/config/site'
import { weekHoursSchema } from '@/lib/hours'
import { createSessionClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/actions/appointments'

// Todo con la sesión del usuario: las reglas de la base de datos (RLS) deciden quién puede cambiar qué.
// Precios, barberos, horario y fotos: solo el dueño (admin). Bloqueos de agenda: cualquier barbero.

async function staff() {
  const supabase = createSessionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('rol').eq('id', user.id).single()
  if (!data || data.rol === 'cliente') return null
  return { supabase, isAdmin: data.rol === 'admin' }
}

const NO_PERMISO: ActionResult<never> = { ok: false, error: 'Solo el dueño puede cambiar esto' }
const firstError = (e: z.ZodError) => e.issues[0]?.message ?? 'Datos inválidos'

function done<T>(data: T): ActionResult<T> {
  revalidatePath('/', 'layout')
  return { ok: true, data }
}

// ─── Servicios ────────────────────────────────────────────────────────────
const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().trim().min(2, 'Escribe el nombre del servicio').max(80),
  duracion_min: z.coerce.number().int().min(5, 'Mínimo 5 minutos').max(480, 'Máximo 8 horas'),
  precio: z.coerce.number().min(0, 'El precio no puede ser negativo').max(10000),
  activo: z.boolean(),
})

export async function saveService(input: z.input<typeof serviceSchema>): Promise<ActionResult<{ id: string }>> {
  const s = await staff()
  if (!s?.isAdmin) return NO_PERMISO
  const parsed = serviceSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }
  const { id, ...row } = parsed.data
  const q = id ? s.supabase.from('services').update(row).eq('id', id) : s.supabase.from('services').insert(row)
  const { data, error } = await q.select('id').single()
  if (error || !data) return { ok: false, error: 'No se pudo guardar el servicio' }
  return done({ id: data.id })
}

// ─── Barberos ─────────────────────────────────────────────────────────────
const barberSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().trim().min(2, 'Escribe el nombre').max(60),
  especialidad: z.string().trim().max(80).nullable(),
  avatar_url: z.string().url().nullable(),
  activo: z.boolean(),
})

export async function saveBarber(input: z.input<typeof barberSchema>): Promise<ActionResult<{ id: string }>> {
  const s = await staff()
  if (!s?.isAdmin) return NO_PERMISO
  const parsed = barberSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }
  const { id, ...row } = parsed.data
  const q = id ? s.supabase.from('barbers').update(row).eq('id', id) : s.supabase.from('barbers').insert(row)
  const { data, error } = await q.select('id').single()
  if (error || !data) return { ok: false, error: 'No se pudo guardar el barbero' }
  return done({ id: data.id })
}

// ─── Horario y fotos del local ────────────────────────────────────────────
const MISSING_SQL = 'Falta preparar la base de datos (pega el SQL de ajustes en Supabase)'

export async function saveHours(hours: unknown): Promise<ActionResult> {
  const s = await staff()
  if (!s?.isAdmin) return NO_PERMISO
  const parsed = weekHoursSchema.safeParse(hours)
  if (!parsed.success) return { ok: false, error: 'Revisa las horas: el cierre va después de la apertura' }
  const { error } = await s.supabase.from('shop_settings').upsert({ id: 1, business_hours: parsed.data, updated_at: new Date().toISOString() })
  if (error) return { ok: false, error: error.code === '42P01' ? MISSING_SQL : 'No se pudo guardar el horario' }
  return done(undefined)
}

export async function saveShopImage(kind: 'hero' | 'logo', url: string | null): Promise<ActionResult> {
  const s = await staff()
  if (!s?.isAdmin) return NO_PERMISO
  if (url !== null && !z.string().url().safeParse(url).success) return { ok: false, error: 'Foto inválida' }
  const patch = kind === 'hero' ? { hero_url: url } : { logo_url: url }
  const { error } = await s.supabase.from('shop_settings').upsert({ id: 1, ...patch, updated_at: new Date().toISOString() })
  if (error) return { ok: false, error: error.code === '42P01' ? MISSING_SQL : 'No se pudo guardar la foto' }
  return done(undefined)
}

export async function addGalleryPhoto(url: string, path: string): Promise<ActionResult<{ id: string }>> {
  const s = await staff()
  if (!s?.isAdmin) return NO_PERMISO
  if (!z.string().url().safeParse(url).success || !path) return { ok: false, error: 'Foto inválida' }
  const { data, error } = await s.supabase.from('gallery_photos').insert({ url, path }).select('id').single()
  if (error || !data) return { ok: false, error: 'No se pudo guardar la foto' }
  return done({ id: data.id })
}

export async function deleteGalleryPhoto(id: string): Promise<ActionResult> {
  const s = await staff()
  if (!s?.isAdmin) return NO_PERMISO
  const { data } = await s.supabase.from('gallery_photos').delete().eq('id', id).select('path').maybeSingle()
  if (data?.path) await s.supabase.storage.from('fotos').remove([data.path])
  return done(undefined)
}

// ─── Días libres y descansos ──────────────────────────────────────────────
const timeOffSchema = z
  .object({
    barberId: z.string().uuid().nullable(),
    desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige el día'),
    hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige el día'),
    todoElDia: z.boolean(),
    horaInicio: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    horaFin: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    motivo: z.string().trim().max(100).optional(),
  })
  .refine((v) => v.hasta >= v.desde, 'El último día va después del primero')
  .refine((v) => v.todoElDia || (v.horaInicio && v.horaFin && v.horaInicio < v.horaFin), 'La hora de fin va después de la de inicio')

const local = (date: string, hhmm = '00:00') => {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = hhmm.split(':').map(Number)
  return new TZDate(y, m - 1, d, hh, mm, siteConfig.timezone)
}

export async function addTimeOff(input: z.input<typeof timeOffSchema>): Promise<ActionResult> {
  const s = await staff()
  if (!s) return { ok: false, error: 'Inicia sesión otra vez' }
  const parsed = timeOffSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }
  const v = parsed.data
  // Varios días con horas = ese tramo cada día (p. ej. cerrar por las tardes toda una semana).
  const rows = []
  for (let d = local(v.desde); d <= local(v.hasta); d = addDays(d, 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (v.todoElDia) {
      rows.push({ start: local(key), end: addDays(local(key), 1) })
    } else {
      rows.push({ start: local(key, v.horaInicio), end: local(key, v.horaFin) })
    }
    if (rows.length > 366) return { ok: false, error: 'Como mucho un año seguido' }
  }
  // Días completos seguidos se guardan como un solo bloque.
  const toInsert = v.todoElDia ? [{ start: rows[0].start, end: rows[rows.length - 1].end }] : rows
  const { error } = await s.supabase.from('time_off').insert(
    toInsert.map((r) => ({ barber_id: v.barberId, start_time: r.start.toISOString(), end_time: r.end.toISOString(), motivo: v.motivo || null })),
  )
  if (error) return { ok: false, error: error.code === '42P01' ? MISSING_SQL : 'No se pudo guardar el bloqueo' }
  return done(undefined)
}

export async function deleteTimeOff(id: string): Promise<ActionResult> {
  const s = await staff()
  if (!s) return { ok: false, error: 'Inicia sesión otra vez' }
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: 'Datos inválidos' }
  const { error } = await s.supabase.from('time_off').delete().eq('id', id)
  if (error) return { ok: false, error: 'No se pudo quitar el bloqueo' }
  return done(undefined)
}
