'use server'

import { revalidatePath } from 'next/cache'
import { addDays } from 'date-fns'
import { TZDate } from '@date-fns/tz'
import { z } from 'zod'
import { siteConfig } from '@/config/site'
import { weekHoursSchema } from '@/lib/hours'
import { instagramHandle, slugify, uniqueSlug } from '@/lib/barber-page'
import { createAdminClient, createSessionClient } from '@/lib/supabase/server'
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
  instagram: z.string().trim().max(120).nullable().optional(),
  activo: z.boolean(),
})

export async function saveBarber(input: z.input<typeof barberSchema>): Promise<ActionResult<{ id: string; slug: string | null }>> {
  const s = await staff()
  if (!s?.isAdmin) return NO_PERMISO
  const parsed = barberSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }
  const { id, instagram, ...base } = parsed.data
  if (instagram && !instagramHandle(instagram)) return { ok: false, error: 'Escribe solo el usuario de Instagram, por ejemplo @carlos.barber' }

  // Enlace propio (/barbero/carlos): se crea una vez con el nombre y ya no cambia, para no romper el de Instagram.
  const { data: all, error: listError } = await s.supabase.from('barbers').select('id, slug')
  const hasPageColumns = !listError
  let slug: string | null = null
  if (hasPageColumns) {
    const current = all?.find((b) => b.id === id)?.slug
    slug = current || uniqueSlug(slugify(base.nombre), (all ?? []).filter((b) => b.id !== id).map((b) => b.slug ?? ''))
  }
  const row = hasPageColumns ? { ...base, slug, instagram: instagramHandle(instagram) } : base

  const q = id ? s.supabase.from('barbers').update(row).eq('id', id) : s.supabase.from('barbers').insert(row)
  const { data, error } = await q.select('id').single()
  if (error || !data) return { ok: false, error: 'No se pudo guardar el barbero' }
  return done({ id: data.id, slug })
}

// ─── Cuenta de cada barbero (para que entre en el panel y vea solo lo suyo) ──
const MISSING_CUENTAS = 'Falta preparar la base de datos (pega el SQL cuentas-barberos.sql en Supabase)'
const accountSchema = z.object({
  barberId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email('Escribe un email válido'),
  password: z.string().min(6, 'La contraseña necesita al menos 6 letras o números').max(72),
})

export async function createBarberAccount(input: z.input<typeof accountSchema>): Promise<ActionResult<{ email: string }>> {
  const s = await staff()
  if (!s?.isAdmin) return NO_PERMISO
  const parsed = accountSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }
  const { barberId, email, password } = parsed.data
  const admin = createAdminClient()
  const { data: barber, error: bErr } = await admin.from('barbers').select('id, nombre, user_id').eq('id', barberId).maybeSingle()
  if (bErr) return { ok: false, error: bErr.code === '42703' ? MISSING_CUENTAS : 'No se pudo crear la cuenta' }
  if (!barber) return { ok: false, error: 'Barbero no encontrado' }
  if (barber.user_id) return { ok: false, error: 'Este barbero ya tiene cuenta' }

  const { data: created, error: aErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (aErr || !created.user) {
    const taken = /already|registered|exists/i.test(aErr?.message ?? '')
    return { ok: false, error: taken ? 'Ese email ya tiene cuenta. Usa otro.' : 'No se pudo crear la cuenta' }
  }
  const userId = created.user.id
  // El teléfono es obligatorio en la tabla; para el personal no se usa.
  const { error: uErr } = await admin.from('users').insert({ id: userId, rol: 'barbero', nombre: barber.nombre, telefono: '000000000', email })
  const { error: lErr } = uErr ? { error: uErr } : await admin.from('barbers').update({ user_id: userId }).eq('id', barberId)
  if (uErr || lErr) {
    await admin.from('users').delete().eq('id', userId)
    await admin.auth.admin.deleteUser(userId)
    return { ok: false, error: 'No se pudo crear la cuenta' }
  }
  return done({ email })
}

export async function setBarberPassword(barberId: string, password: string): Promise<ActionResult> {
  const s = await staff()
  if (!s?.isAdmin) return NO_PERMISO
  const parsed = accountSchema.pick({ barberId: true, password: true }).safeParse({ barberId, password })
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }
  const admin = createAdminClient()
  const { data: barber } = await admin.from('barbers').select('user_id').eq('id', barberId).maybeSingle()
  if (!barber?.user_id) return { ok: false, error: 'Este barbero no tiene cuenta' }
  const { error } = await admin.auth.admin.updateUserById(barber.user_id, { password })
  if (error) return { ok: false, error: 'No se pudo cambiar la contraseña' }
  return { ok: true, data: undefined }
}

// Quita el acceso (p. ej. si deja de trabajar aquí). Sus citas y su ficha se quedan.
export async function removeBarberAccount(barberId: string): Promise<ActionResult> {
  const s = await staff()
  if (!s?.isAdmin) return NO_PERMISO
  if (!z.string().uuid().safeParse(barberId).success) return { ok: false, error: 'Datos inválidos' }
  const admin = createAdminClient()
  const { data: barber } = await admin.from('barbers').select('user_id').eq('id', barberId).maybeSingle()
  const userId = barber?.user_id
  if (!userId) return done(undefined)
  const { data: u } = await admin.from('users').select('rol').eq('id', userId).maybeSingle()
  if (u?.rol === 'admin') return { ok: false, error: 'No se puede quitar la cuenta del dueño' }
  await admin.from('barbers').update({ user_id: null }).eq('id', barberId)
  await admin.from('users').delete().eq('id', userId)
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { ok: false, error: 'No se pudo quitar el acceso' }
  return done(undefined)
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

export async function saveReviewUrl(url: string): Promise<ActionResult> {
  const s = await staff()
  if (!s?.isAdmin) return NO_PERMISO
  const clean = url.trim()
  if (clean && !z.string().url().startsWith('https://').safeParse(clean).success) return { ok: false, error: 'Pega el enlace entero, empieza por https://' }
  const { error } = await s.supabase.from('shop_settings').upsert({ id: 1, google_review_url: clean || null, updated_at: new Date().toISOString() })
  if (error) return { ok: false, error: error.code === '42P01' || error.code === '42703' ? 'Falta preparar la base de datos (pega resenas.sql en Supabase)' : 'No se pudo guardar el enlace' }
  return done(undefined)
}

export async function addGalleryPhoto(url: string, path: string, barberId: string | null = null): Promise<ActionResult<{ id: string }>> {
  const s = await staff()
  if (!s?.isAdmin) return NO_PERMISO
  if (!z.string().url().safeParse(url).success || !path) return { ok: false, error: 'Foto inválida' }
  if (barberId && !z.string().uuid().safeParse(barberId).success) return { ok: false, error: 'Barbero inválido' }
  const { data, error } = await s.supabase.from('gallery_photos').insert(barberId ? { url, path, barber_id: barberId } : { url, path }).select('id').single()
  if (error || !data) return { ok: false, error: error?.code === '42703' ? 'Falta preparar la base de datos (pega el SQL de barberos en Supabase)' : 'No se pudo guardar la foto' }
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
