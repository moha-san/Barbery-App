import Link from 'next/link'
import { redirect } from 'next/navigation'
import { addDays } from 'date-fns'
import { TZDate } from '@date-fns/tz'
import { siteConfig } from '@/config/site'
import { createSessionClient } from '@/lib/supabase/server'
import { formatDateLong, localDateKey } from '@/lib/format'
import { logout } from '@/actions/auth'
import { AppointmentCard } from '@/components/dashboard/appointment-card'
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'
import type { AppointmentWithRelations } from '@/types/database'

export const dynamic = 'force-dynamic'

type Props = { searchParams: { fecha?: string } }

export default async function DashboardPage({ searchParams }: Props) {
  const supabase = createSessionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('nombre, rol').eq('id', user.id).single()
  if (!profile || profile.rol === 'cliente') {
    return (
      <main className="mx-auto max-w-xl p-6">
        <p>Tu cuenta no tiene acceso al panel. Pide al dueño que te dé de alta como barbero.</p>
        <form action={logout} className="mt-4">
          <button className="rounded-lg border border-white/15 px-4 py-2 text-sm">Salir</button>
        </form>
      </main>
    )
  }

  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.fecha ?? '') ? searchParams.fecha! : localDateKey(new Date())
  const [y, m, d] = fecha.split('-').map(Number)
  const dayStart = new TZDate(y, m - 1, d, 0, 0, siteConfig.timezone)
  const dayEnd = addDays(dayStart, 1)

  const { data, error } = await supabase
    .from('appointments')
    .select('*, barber:barbers(id, nombre), client:users(id, nombre, telefono), service:services(id, nombre, duracion_min, precio)')
    .gte('start_time', dayStart.toISOString())
    .lt('start_time', dayEnd.toISOString())
    .neq('status', 'cancelada')
    .order('start_time')
  const appointments = (data ?? []) as AppointmentWithRelations[]
  const pendientes = appointments.filter((a) => a.status === 'confirmada').length

  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-[max(1rem,env(safe-area-inset-top))]">
      <RealtimeRefresh />
      <header className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-neutral-400">Hola, {profile.nombre}</p>
          <h1 className="text-xl font-semibold capitalize">{formatDateLong(dayStart)}</h1>
          <p className="text-sm text-neutral-400">
            {appointments.length} citas · {pendientes} pendientes
          </p>
        </div>
        <form action={logout}>
          <button className="rounded-lg border border-white/15 px-3 py-2 text-sm">Salir</button>
        </form>
      </header>

      <nav className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <Link href={`/dashboard?fecha=${localDateKey(addDays(dayStart, -1))}`} className="rounded-lg border border-white/10 py-2">
          ← Anterior
        </Link>
        <Link href="/dashboard" className="rounded-lg border border-white/10 py-2">
          Hoy
        </Link>
        <Link href={`/dashboard?fecha=${localDateKey(addDays(dayStart, 1))}`} className="rounded-lg border border-white/10 py-2">
          Siguiente →
        </Link>
      </nav>

      <section className="mt-6 grid gap-3">
        {error && <p role="alert" className="text-sm text-red-300">No se pudo cargar la agenda.</p>}
        {!error && !appointments.length && <p className="text-neutral-400">No hay citas este día.</p>}
        {appointments.map((a) => (
          <AppointmentCard key={a.id} appointment={a} />
        ))}
      </section>
    </main>
  )
}
