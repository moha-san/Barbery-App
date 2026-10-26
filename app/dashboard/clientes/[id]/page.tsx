import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireStaff } from '@/lib/staff'
import { formatDateLong, formatPrice, formatTime, toLocal, servicePrice } from '@/lib/format'
import { shopWhatsAppLink } from '@/lib/whatsapp'
import { SubHeader } from '@/components/dashboard/sub-header'
import { ClientNotes } from '@/components/dashboard/client-notes'
import { ChatIcon, PhoneIcon, PlusIcon } from '@/components/icons'
import type { AppointmentStatus } from '@/types/database'

export const dynamic = 'force-dynamic'

const statusText: Record<AppointmentStatus, { text: string; cls: string }> = {
  confirmada: { text: 'Reservada', cls: 'text-primary' },
  completada: { text: 'Hecha', cls: 'text-success' },
  no_presentado: { text: 'No vino', cls: 'text-danger' },
  cancelada: { text: 'Cancelada', cls: 'text-muted' },
}

type Row = { id: string; start_time: string; status: AppointmentStatus; barber: { nombre: string } | null; service: { nombre: string; precio: number } | null }

export default async function ClientPage({ params }: { params: { id: string } }) {
  const { supabase } = await requireStaff()
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound()
  const [{ data: client }, { data: rows }] = await Promise.all([
    supabase.from('users').select('*').eq('id', params.id).eq('rol', 'cliente').maybeSingle(),
    supabase
      .from('appointments')
      .select('id, start_time, status, barber:barbers(nombre), service:services(nombre, precio)')
      .eq('client_id', params.id)
      .order('start_time', { ascending: false })
      .limit(100),
  ])
  if (!client) notFound()
  const history = (rows ?? []) as unknown as Row[]

  const done = history.filter((a) => a.status === 'completada')
  const spent = done.reduce((s, a) => s + (a.service?.precio ?? 0), 0)
  const noShows = history.filter((a) => a.status === 'no_presentado').length
  const next = [...history].reverse().find((a) => a.status === 'confirmada' && new Date(a.start_time).getTime() > Date.now())
  const last = done[0]
  // Servicio y barbero que más repite.
  const top = (key: (a: Row) => string | undefined) => {
    const count = new Map<string, number>()
    for (const a of done) {
      const k = key(a)
      if (k) count.set(k, (count.get(k) ?? 0) + 1)
    }
    return Array.from(count).sort((x, y) => y[1] - x[1])[0]?.[0]
  }
  const favService = top((a) => a.service?.nombre)
  const favBarber = top((a) => a.barber?.nombre)
  const daysSince = last ? Math.floor((Date.now() - new Date(last.start_time).getTime()) / 86_400_000) : null
  const wa = `https://wa.me/${client.telefono.replace(/\D/g, '')}`

  const stats = [
    { label: 'Visitas', value: String(done.length) },
    { label: 'Gastado', value: formatPrice(spent) },
    { label: 'No vino', value: String(noShows), danger: noShows > 0 },
  ]

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
      <SubHeader title={client.nombre} back="/dashboard/clientes" backLabel="Clientes" />

      <section className="mt-6 flex flex-wrap items-center gap-2">
        <span className="mr-auto text-sm tabular-nums text-muted">
          {client.telefono} · cliente desde {format(client.created_at)}
        </span>
        <a href={`tel:${client.telefono}`} className="btn-ghost h-10 px-3">
          <PhoneIcon /> Llamar
        </a>
        <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-ghost h-10 px-3">
          <ChatIcon className="text-whatsapp" /> WhatsApp
        </a>
        <Link href={`/dashboard/nueva?${new URLSearchParams({ nombre: client.nombre, tel: client.telefono })}`} className="btn-primary h-10 px-3">
          <PlusIcon /> Darle cita
        </Link>
      </section>

      <dl className="mt-6 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-muted">{s.label}</dt>
            <dd className={`font-display mt-1 text-2xl tabular-nums sm:text-3xl ${s.danger ? 'text-danger' : ''}`}>{s.value}</dd>
          </div>
        ))}
      </dl>

      <ul className="mt-4 grid gap-1 text-sm text-muted">
        {next && (
          <li>
            <span className="font-semibold text-primary">Próxima cita:</span> {formatDateLong(next.start_time)} a las {formatTime(next.start_time)}
          </li>
        )}
        {daysSince !== null && (
          <li>
            Último corte hace {daysSince === 0 ? 'hoy' : daysSince === 1 ? '1 día' : `${daysSince} días`}
            {daysSince > 45 && (
              <>
                {' · '}
                <a href={`${wa}?text=${encodeURIComponent(`Hola ${client.nombre}, hace tiempo que no te vemos. ¿Te buscamos hueco esta semana?`)}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-4">
                  Escribirle para que vuelva
                </a>
              </>
            )}
          </li>
        )}
        {favService && <li>Suele pedir: <span className="text-text">{favService}</span>{favBarber ? ` con ${favBarber}` : ''}</li>}
      </ul>

      <section aria-labelledby="notas" className="mt-8 grid gap-3">
        <h2 id="notas" className="text-xl">Notas</h2>
        <ClientNotes id={client.id} initial={client.notas ?? ''} />
      </section>

      <section aria-labelledby="historial" className="mt-10 grid gap-3">
        <h2 id="historial" className="text-xl">Historial</h2>
        {!history.length && <p className="text-sm text-muted">Sin citas todavía.</p>}
        <ol className="grid gap-2">
          {history.map((a) => (
            <li key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-semibold first-letter:uppercase">
                  {formatDateLong(a.start_time)} · {formatTime(a.start_time)}
                </span>
                <span className="block truncate text-muted">
                  {a.service?.nombre ?? '-'} · {a.barber?.nombre ?? '-'}
                  {a.service ? ` · ${servicePrice(a.service.precio)}` : ''}
                </span>
              </span>
              <span className={`text-xs font-semibold ${statusText[a.status].cls}`}>{statusText[a.status].text}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}

function format(iso: string) {
  const d = toLocal(iso)
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}
