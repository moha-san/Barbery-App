import Link from 'next/link'
import { TZDate } from '@date-fns/tz'
import { addMonths, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { siteConfig } from '@/config/site'
import { requireStaff } from '@/lib/staff'
import { formatPrice, toLocal } from '@/lib/format'
import { SubHeader } from '@/components/dashboard/sub-header'
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/icons'
import type { AppointmentStatus } from '@/types/database'

export const dynamic = 'force-dynamic'

type Row = { client_id: string; status: AppointmentStatus; barber: { nombre: string } | null; service: { nombre: string; precio: number } | null }

const monthStart = (key: string) => {
  const [y, m] = key.split('-').map(Number)
  return new TZDate(y, m - 1, 1, 0, 0, siteConfig.timezone)
}
const monthKey = (d: Date) => format(toLocal(d), 'yyyy-MM')

// Resumen del mes para el dueño: caja, citas, clientes nuevos y qué funciona mejor.
export default async function SummaryPage({ searchParams }: { searchParams: { mes?: string } }) {
  const { supabase } = await requireStaff(true)
  const current = monthKey(new Date())
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? '') && searchParams.mes! <= current ? searchParams.mes! : current
  const start = monthStart(mes)
  const end = addMonths(start, 1)
  const prevStart = addMonths(start, -1)

  const select = 'client_id, status, barber:barbers(nombre), service:services(nombre, precio)'
  const [{ data }, { data: prevData }] = await Promise.all([
    supabase.from('appointments').select(select).gte('start_time', start.toISOString()).lt('start_time', end.toISOString()).limit(5000),
    supabase.from('appointments').select(select).eq('status', 'completada').gte('start_time', prevStart.toISOString()).lt('start_time', start.toISOString()).limit(5000),
  ])
  const rows = (data ?? []) as unknown as Row[]
  const price = (a: Row) => a.service?.precio ?? 0
  const done = rows.filter((a) => a.status === 'completada')
  const caja = done.reduce((s, a) => s + price(a), 0)
  const cajaPrev = ((prevData ?? []) as unknown as Row[]).reduce((s, a) => s + price(a), 0)
  const noShows = rows.filter((a) => a.status === 'no_presentado').length
  const cancels = rows.filter((a) => a.status === 'cancelada').length
  const pending = rows.filter((a) => a.status === 'confirmada').length
  const ticket = done.length ? caja / done.length : 0
  const clients = Array.from(new Set(done.map((a) => a.client_id)))

  // Clientes nuevos: su primera visita hecha cae en este mes.
  let nuevos = 0
  if (clients.length) {
    const { data: before } = await supabase.from('appointments').select('client_id').in('client_id', clients).eq('status', 'completada').lt('start_time', start.toISOString())
    const old = new Set((before ?? []).map((r) => r.client_id))
    nuevos = clients.filter((c) => !old.has(c)).length
  }

  const group = (key: (a: Row) => string | undefined) => {
    const map = new Map<string, { n: number; total: number }>()
    for (const a of done) {
      const k = key(a)
      if (!k) continue
      const g = map.get(k) ?? { n: 0, total: 0 }
      g.n++
      g.total += price(a)
      map.set(k, g)
    }
    return Array.from(map, ([name, g]) => ({ name, ...g })).sort((x, y) => y.total - x.total)
  }
  const byService = group((a) => a.service?.nombre)
  const byBarber = group((a) => a.barber?.nombre)
  const diff = cajaPrev ? Math.round(((caja - cajaPrev) / cajaPrev) * 100) : null
  const title = format(start, 'MMMM yyyy', { locale: es })
  const navBtn = 'btn-ghost h-11 px-3'

  const stats = [
    { label: 'Cortes hechos', value: String(done.length), hint: pending ? `${pending} reservadas aún` : undefined },
    { label: 'Ticket medio', value: formatPrice(ticket) },
    { label: 'Clientes', value: String(clients.length), hint: `${nuevos} ${nuevos === 1 ? 'nuevo' : 'nuevos'}` },
    { label: 'No vinieron', value: String(noShows), hint: cancels ? `${cancels} cancelaron` : undefined, danger: noShows > 0 },
  ]

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
      <SubHeader title="Resumen del mes" />

      <section className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-3xl first-letter:uppercase sm:text-4xl">{title}</h2>
        <nav aria-label="Cambiar de mes" className="flex gap-2">
          <Link href={`/dashboard/resumen?mes=${monthKey(prevStart)}`} className={navBtn} aria-label="Mes anterior">
            <ArrowLeftIcon />
          </Link>
          {mes < current && (
            <Link href={`/dashboard/resumen?mes=${monthKey(end)}`} className={navBtn} aria-label="Mes siguiente">
              <ArrowRightIcon />
            </Link>
          )}
        </nav>
      </section>

      <div className="card mt-6 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">Caja del mes</p>
        <p className="font-display mt-1 text-5xl tabular-nums text-success">{formatPrice(caja)}</p>
        {diff !== null && (
          <p className={`mt-2 text-sm font-semibold ${diff >= 0 ? 'text-success' : 'text-danger'}`}>
            {diff >= 0 ? '▲' : '▼'} {Math.abs(diff)} % que el mes anterior ({formatPrice(cajaPrev)})
          </p>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-muted">{s.label}</dt>
            <dd className={`font-display mt-1 text-2xl tabular-nums ${s.danger ? 'text-danger' : ''}`}>{s.value}</dd>
            {s.hint && <dd className="mt-1 text-xs text-muted">{s.hint}</dd>}
          </div>
        ))}
      </dl>

      {!done.length && <p className="mt-8 rounded-card border border-dashed border-border p-8 text-center text-sm text-muted">Aún no hay cortes marcados como hechos este mes.</p>}

      <Ranking title="Servicios que más dejan" rows={byService} />
      <Ranking title="Por barbero" rows={byBarber} />
    </main>
  )
}

function Ranking({ title, rows }: { title: string; rows: { name: string; n: number; total: number }[] }) {
  if (!rows.length) return null
  const max = rows[0].total || 1
  return (
    <section className="mt-10 grid gap-3">
      <h2 className="text-xl">{title}</h2>
      <ul className="grid gap-3">
        {rows.map((r) => (
          <li key={r.name} className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-semibold">{r.name}</span>
              <span className="shrink-0 tabular-nums text-muted">
                {r.n} · <span className="font-semibold text-text">{formatPrice(r.total)}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-text/[0.06]">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (r.total / max) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
