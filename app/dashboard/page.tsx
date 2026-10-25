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
import { BrandMark } from '@/components/brand-mark'
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon, LogOutIcon } from '@/components/icons'
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
      <main className="mx-auto grid min-h-dvh max-w-md content-center px-4">
        <div className="card grid justify-items-center gap-3 p-8 text-center">
          <BrandMark size={48} />
          <p className="font-display text-xl">Aún no tienes acceso al panel</p>
          <p className="text-sm text-muted">Pide al dueño que te dé de alta como barbero.</p>
          <form action={logout} className="mt-2">
            <button className="btn-ghost">
              <LogOutIcon /> Salir
            </button>
          </form>
        </div>
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
  const hechas = appointments.filter((a) => a.status === 'completada').length

  // Destaca la cita en curso o, si no hay, la siguiente (solo viendo hoy).
  const now = Date.now()
  const isToday = fecha === localDateKey(new Date())
  const confirmed = appointments.filter((a) => a.status === 'confirmada')
  const nowAppt = isToday ? confirmed.find((a) => new Date(a.start_time).getTime() <= now && now < new Date(a.end_time).getTime()) : undefined
  const nextAppt = isToday && !nowAppt ? confirmed.find((a) => new Date(a.start_time).getTime() > now) : undefined
  const highlighted = nowAppt ?? nextAppt
  const navBtn = 'btn-ghost h-11 px-3'

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
      <RealtimeRefresh />
      <header className="flex items-center gap-3 border-b border-border pb-4">
        <BrandMark size={40} />
        <p className="font-display min-w-0 flex-1 truncate text-lg">{siteConfig.name}</p>
        <form action={logout}>
          <button className="btn-ghost h-11 px-3" aria-label="Salir">
            <LogOutIcon /> <span className="hidden sm:inline">Salir</span>
          </button>
        </form>
      </header>

      <section className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Hola, {profile.nombre}</p>
          <h1 className="mt-2 text-3xl first-letter:uppercase sm:text-4xl">{formatDateLong(dayStart)}</h1>
        </div>
        <nav aria-label="Cambiar de día" className="flex gap-2">
          <Link href={`/dashboard?fecha=${localDateKey(addDays(dayStart, -1))}`} className={navBtn} aria-label="Día anterior">
            <ArrowLeftIcon />
          </Link>
          <Link href="/dashboard" className={`${navBtn} px-5 ${isToday ? 'border-primary text-primary' : ''}`}>
            Hoy
          </Link>
          <Link href={`/dashboard?fecha=${localDateKey(addDays(dayStart, 1))}`} className={navBtn} aria-label="Día siguiente">
            <ArrowRightIcon />
          </Link>
        </nav>
      </section>

      <dl className="mt-6 grid grid-cols-3 gap-3">
        {[
          ['Citas', appointments.length],
          ['Pendientes', pendientes],
          ['Hechas', hechas],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-muted">{label}</dt>
            <dd className="font-display mt-1 text-3xl tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {error && (
          <p role="alert" className="rounded-card border border-danger/30 bg-danger/10 p-4 text-sm text-danger md:col-span-2">
            No se pudo cargar la agenda. Recarga la página en un momento.
          </p>
        )}
        {!error && !appointments.length && (
          <div className="grid justify-items-center gap-2 rounded-card border border-dashed border-border p-10 text-center md:col-span-2">
            <CalendarIcon className="text-3xl text-muted" />
            <p className="font-display text-xl">Día libre</p>
            <p className="text-sm text-muted">No hay citas este día. Las nuevas reservas aparecerán aquí solas.</p>
          </div>
        )}
        {appointments.map((a) => (
          <AppointmentCard
            key={a.id}
            appointment={a}
            highlight={a.id === highlighted?.id ? (nowAppt ? 'Ahora' : 'Siguiente') : undefined}
          />
        ))}
      </section>
    </main>
  )
}
