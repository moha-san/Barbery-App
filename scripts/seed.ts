// Datos de prueba: npm run seed (lee .env.local). Se puede ejecutar varias veces sin duplicar nada.
import { createClient } from '@supabase/supabase-js'
import { addDays } from 'date-fns'
import { TZDate } from '@date-fns/tz'
import { siteConfig } from '../config/site'
import type { Database } from '../types/database'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')

const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL ?? 'carlos@lamordidita.test',
  password: process.env.SEED_ADMIN_PASSWORD ?? 'Mordidita123!',
  nombre: 'Carlos de La Mordidita',
  telefono: '+34600000001',
}

const SERVICES = [
  { nombre: 'Corte Clásico', duracion_min: 30, precio: 15 },
  { nombre: 'Corte + Barba', duracion_min: 45, precio: 22 },
  { nombre: 'Rapado', duracion_min: 15, precio: 10 },
  { nombre: 'Arreglo de Barba', duracion_min: 20, precio: 10 },
]

function check<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`)
  return res.data
}

async function seedAdmin(): Promise<void> {
  const created = await db.auth.admin.createUser({ email: ADMIN.email, password: ADMIN.password, email_confirm: true })
  let id = created.data.user?.id
  if (!id) {
    // Ya existía (segunda ejecución): lo buscamos por email.
    const list = await db.auth.admin.listUsers({ perPage: 1000 })
    if (list.error) throw new Error(`listar usuarios: ${list.error.message}`)
    id = list.data.users.find((u) => u.email === ADMIN.email)?.id
    if (!id) throw new Error(`crear admin: ${created.error?.message}`)
  }
  check(
    await db.from('users').upsert({ id, rol: 'admin', nombre: ADMIN.nombre, telefono: ADMIN.telefono, email: ADMIN.email }),
    'guardar admin',
  )
}

// Sin unique en "nombre": buscamos antes de insertar para no duplicar al repetir el seed.
async function findOrInsert(table: 'barbers' | 'services', row: { nombre: string; [k: string]: unknown }): Promise<string> {
  const found = check(await db.from(table).select('id').eq('nombre', row.nombre).maybeSingle(), table)
  if (found) return found.id
  // @ts-expect-error: supabase-js no tipa bien insert() sobre una unión de tablas
  return check(await db.from(table).insert(row).select('id').single(), table).id
}

// Próximos días abiertos según config/site.ts, empezando mañana.
function nextOpenDays(count: number): TZDate[] {
  const days: TZDate[] = []
  const today = new TZDate(Date.now(), siteConfig.timezone)
  for (let i = 1; days.length < count && i <= 14; i++) {
    const d = addDays(today, i)
    if (siteConfig.businessHours[d.getDay() as keyof typeof siteConfig.businessHours].length) days.push(d)
  }
  return days
}

function at(day: TZDate, hh: number, mm: number): string {
  return new TZDate(day.getFullYear(), day.getMonth(), day.getDate(), hh, mm, siteConfig.timezone).toISOString()
}

async function book(barberId: string, serviceId: string, start: string, nombre: string, telefono: string) {
  const { error } = await db.rpc('book_appointment', {
    p_barber_id: barberId,
    p_service_id: serviceId,
    p_start_time: start,
    p_nombre: nombre,
    p_telefono: telefono,
  })
  return error
}

async function main() {
  await seedAdmin()
  console.log(`✓ Admin: ${ADMIN.email} / ${ADMIN.password}`)

  const barberId = await findOrInsert('barbers', { nombre: ADMIN.nombre, especialidad: 'Degradados y barba' })
  console.log('✓ Barbero:', ADMIN.nombre)

  const svc: Record<string, string> = {}
  for (const s of SERVICES) svc[s.nombre] = await findOrInsert('services', s)
  console.log('✓ Servicios:', SERVICES.map((s) => s.nombre).join(', '))

  const [day1, day2] = nextOpenDays(2)
  const citas = [
    { servicio: 'Corte Clásico', start: at(day1, 10, 0), nombre: 'Juan Pérez', telefono: '+34611111111' },
    { servicio: 'Corte + Barba', start: at(day1, 17, 0), nombre: 'Miguel Ruiz', telefono: '+34622222222' },
    { servicio: 'Rapado', start: at(day2, 11, 30), nombre: 'Andrés López', telefono: '+34633333333' },
  ]
  for (const c of citas) {
    const error = await book(barberId, svc[c.servicio], c.start, c.nombre, c.telefono)
    if (error && error.code !== '23P01') throw new Error(`cita ${c.nombre}: ${error.message}`)
    console.log(`${error ? '= ya existía' : '✓ Cita'}: ${c.servicio} ${new Date(c.start).toLocaleString('es-ES', { timeZone: siteConfig.timezone })}`)
  }

  // Prueba anti-solapes: 10:15 pisa la cita de 10:00-10:30, Postgres debe rechazarla.
  const overlap = await book(barberId, svc['Rapado'], at(day1, 10, 15), 'Prueba Solape', '+34699999999')
  if (overlap?.code !== '23P01') throw new Error(`¡La cita solapada NO se rechazó! (${overlap?.message ?? 'se guardó'})`)
  console.log('✓ Anti-solapes: la cita solapada se rechazó (23P01)')
}

main().catch((e) => {
  console.error('✗', e instanceof Error ? e.message : e)
  process.exit(1)
})
