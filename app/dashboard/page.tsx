import Link from 'next/link'
import { redirect } from 'next/navigation'
import { addDays } from 'date-fns'
import { TZDate } from '@date-fns/tz'
import { siteConfig } from '@/config/site'
import { createSessionClient } from '@/lib/supabase/server'
import { formatDateLong, formatPrice, formatTime, localDateKey } from '@/lib/format'
import { logout } from '@/actions/auth'
import { AppointmentCard } from '@/components/dashboard/appointment-card'
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'
import { BrandMark } from '@/components/brand-mark'
import { PushButton } from '@/components/push-button'
import { ArrowLeftIcon, ArrowRightIcon, BanIcon, CalendarIcon, LogOutIcon, SettingsIcon } from '@/components/icons'
import type { AppointmentWithRelations } from '@/types/database'
import { getShopSettings } from '@/lib/shop'

export const dynamic = 'force-dynamic'

type Props = { searchParams: { fecha?: string; barbero?: string } }

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

  const { data: barbersData } = await supabase.from('barbers').select('id, nombre').eq('activo', true).order('nombre')
  const barbers = barbersData ?? []
  const barbero = barbers.find((b) => b.id === searchParams.barbero)?.id
  // Enlace que conserva el día y el barbero elegidos.
  const href = (f: string | undefined, b: string | undefined) => {
    const q = new URLSearchParams()
    if (f) q.set('fecha', f)
    if (b) q.set('barbero', b)
    const qs = q.toString()
    return qs ? `/dashboard?${qs}` : '/dashboard'
  }

  let query = supabase
    .from('appointments')
    .select('*, barber:barbers(id, nombre), client:users(id, nombre, telefono), service:services(id, nombre, duracion_min, precio)')
    .gte('start_time', dayStart.toISOString())
    .lt('start_time', dayEnd.toISOString())
    .neq('status', 'cancelada')
    .order('start_time')
  if (barbero) query = query.eq('barber_id', barbero)
  const [{ data, error }, blocksRes, settings] = await Promise.all([
    query,
    supabase
      .from('time_off')
      .select('id, barber_id, start_time, end_time, motivo, barber:barbers(nombre)')
      .lt('start_time', dayEnd.toISOString())
      .gt('end_time', dayStart.toISOString())
      .order('start_time'),
    getShopSettings(),
  ])
  // Bloqueos del día (vacaciones, descansos). Si la tabla aún no existe, no se enseña nada.
  const blocks = ((blocksRes.data ?? []) as unknown as { id: string; barber_id: string | null; start_time: string; end_time: string; motivo: string | null; barber: { nombre: string } | null }[])
    .filter((b) => !barbero || !b.barber_id || b.barber_id === barbero)
  const appointments = (data ?? []) as AppointmentWithRelations[]
  const pendientes = appointments.filter((a) => a.status === 'confirmada').length
  const hechas = appointments.filter((a) => a.status === 'completada').length
  // Caja: lo cobrado (citas completadas) y lo que falta por cobrar (confirmadas).
  const precio = (a: AppointmentWithRelations) => a.service?.precio ?? 0
  const cobrado = appointments.filter((a) => a.status === 'completada').reduce((sum, a) => sum + precio(a), 0)
  const porCobrar = appointments.filter((a) => a.status === 'confirmada').reduce((sum, a) => sum + precio(a), 0)

  // Destaca la cita en curso o, si no hay, la siguiente (solo viendo hoy).
  const now = Date.now()
  const isToday = fecha === localDateKey(new Date())
  const confirmed = appointments.filter((a) => a.status === 'confirmada')
  const nowAppt = isToday ? confirmed.find((a) => new Date(a.start_time).getTime() <= now && now < new Date(a.end_time).getTime()) : undefined
  const nextAppt = isToday && !nowAppt ? confirmed.find((a) => new Date(a.start_time).getTime() > now) : undefined
  const highlighted = nowAppt ?? nextAppt
  const navBtn = 'btn-ghost h-11 px-3'
  const minsToNext = nextAppt ? Math.max(1, Math.round((new Date(nextAppt.start_time).getTime() - now) / 60000)) : 0
  const chip = (active: boolean) =>
    `btn h-10 shrink-0 rounded-full border px-4 ${active ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface text-text hover:border-text/30'}`

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
      <RealtimeRefresh />
      <header className="flex items-center gap-3 border-b border-border pb-4">
        <BrandMark size={40} logo={settings.logoUrl} />
        <p className="font-display min-w-0 flex-1 truncate text-lg">{siteConfig.name}</p>
        <PushButton kind="staff" label="Activar avisos" doneLabel="Avisos activados" className="btn-ghost h-11 px-3" />
        <Link href="/dashboard/ajustes" className="btn-ghost h-11 px-3" aria-label="Ajustes">
          <SettingsIcon /> <span className="hidden sm:inline">Ajustes</span>
        </Link>
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
          <Link href={href(localDateKey(addDays(dayStart, -1)), barbero)} className={navBtn} aria-label="Día anterior">
            <ArrowLeftIcon />
          </Link>
          <Link href={href(undefined, barbero)} className={`${navBtn} px-5 ${isToday ? 'border-primary text-primary' : ''}`}>
            Hoy
          </Link>
          <Link href={href(localDateKey(addDays(dayStart, 1)), barbero)} className={navBtn} aria-label="Día siguiente">
            <ArrowRightIcon />
          </Link>
        </nav>
      </section>

      {barbers.length > 1 && (
        <nav aria-label="Filtrar por barbero" className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Link href={href(isToday ? undefined : fecha, undefined)} className={chip(!barbero)} aria-current={!barbero ? 'true' : undefined}>
            Todos
          </Link>
          {barbers.map((b) => (
            <Link key={b.id} href={href(isToday ? undefined : fecha, b.id)} className={chip(b.id === barbero)} aria-current={b.id === barbero ? 'true' : undefined}>
              {b.nombre}
            </Link>
          ))}
        </nav>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="card p-4">
          <dt className="text-xs font-medium uppercase tracking-wider text-muted">{isToday ? 'Caja de hoy' : 'Caja del día'}</dt>
          <dd className="font-display mt-1 text-3xl tabular-nums text-success">{formatPrice(cobrado)}</dd>
          {porCobrar > 0 && <dd className="mt-1 text-xs text-muted">+ {formatPrice(porCobrar)} por cobrar</dd>}
        </div>
        <div className="card p-4">
          <dt className="text-xs font-medium uppercase tracking-wider text-muted">Citas</dt>
          <dd className="font-display mt-1 text-3xl tabular-nums">{appointments.length}</dd>
          <dd className="mt-1 text-xs text-muted">
            {pendientes} por venir · {hechas} {hechas === 1 ? 'hecha' : 'hechas'}
          </dd>
        </div>
      </dl>

      {highlighted && (
        <p className="mt-6 flex flex-wrap items-baseline gap-x-2 rounded-card border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
          <span className="eyebrow text-primary">{nowAppt ? 'Ahora' : `Próxima en ${minsToNext < 60 ? `${minsToNext} min` : `${Math.floor(minsToNext / 60)} h ${minsToNext % 60} min`}`}</span>
          <span className="font-semibold">
            {formatTime(highlighted.start_time)} · {highlighted.client?.nombre ?? 'Cliente'}
          </span>
          <span className="text-muted">
            {highlighted.service?.nombre} con {highlighted.barber?.nombre}
          </span>
        </p>
      )}

      <section className="mt-8 grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl">Agenda</h2>
          <Link href="/dashboard/ajustes#descansos" className="btn-ghost h-10 px-3 text-xs">
            <BanIcon /> Bloquear hueco
          </Link>
        </div>
        {error && (
          <p role="alert" className="rounded-card border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
            No se pudo cargar la agenda. Recarga la página en un momento.
          </p>
        )}
        {!error && !appointments.length && !blocks.length && (
          <div className="grid justify-items-center gap-2 rounded-card border border-dashed border-border p-10 text-center">
            <CalendarIcon className="text-3xl text-muted" />
            <p className="font-display text-xl">Día libre</p>
            <p className="text-sm text-muted">No hay citas este día. Las nuevas reservas aparecerán aquí solas.</p>
          </div>
        )}
        <ol className="grid gap-2">
          {[
            ...appointments.map((a) => ({ start: a.start_time, node: (
              <AppointmentCard key={a.id} appointment={a} highlight={a.id === highlighted?.id ? (nowAppt ? 'Ahora' : 'Siguiente') : undefined} />
            ) })),
            ...blocks.map((b) => ({ start: b.start_time, node: (
              <li key={b.id} className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3 rounded-card border border-dashed border-border px-4 py-3 text-sm text-muted">
                <span className="tabular-nums">{new Date(b.start_time) <= dayStart ? '—' : formatTime(b.start_time)}</span>
                <span className="min-w-0 truncate">
                  <span className="font-semibold text-text">Bloqueado</span>
                  {new Date(b.end_time) < dayEnd ? ` hasta las ${formatTime(b.end_time)}` : ' todo el día'}
                  {b.motivo ? ` · ${b.motivo}` : ''} · {b.barber?.nombre ?? 'Toda la barbería'}
                </span>
              </li>
            ) })),
          ]
            .sort((x, y) => Date.parse(x.start) - Date.parse(y.start))
            .map((x) => x.node)}
        </ol>
      </section>
    </main>
  )
}
