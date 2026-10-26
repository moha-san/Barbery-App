import Link from 'next/link'
import { requireStaff } from '@/lib/staff'
import { SubHeader } from '@/components/dashboard/sub-header'
import { SearchIcon, UsersIcon } from '@/components/icons'

export const dynamic = 'force-dynamic'

export default async function ClientsPage({ searchParams }: { searchParams: { q?: string } }) {
  const { supabase } = await requireStaff()
  const q = (searchParams.q ?? '').trim().slice(0, 50)
  let query = supabase.from('users').select('id, nombre, telefono, created_at').eq('rol', 'cliente').order('created_at', { ascending: false }).limit(60)
  if (q) {
    // Quita lo que rompería el filtro; busca por nombre o por teléfono.
    const safe = q.replace(/[%,()*\\]/g, '')
    const digits = safe.replace(/\D/g, '')
    query = query.or(digits.length >= 3 ? `nombre.ilike.%${safe}%,telefono.ilike.%${digits}%` : `nombre.ilike.%${safe}%`)
  }
  const { data } = await query
  const clients = data ?? []

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
      <SubHeader title="Clientes" />
      <form className="relative mt-6" role="search">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} placeholder="Buscar por nombre o teléfono" aria-label="Buscar cliente" className="field pl-11" />
      </form>
      <p className="mt-4 text-sm text-muted">{q ? `${clients.length} encontrados` : 'Los últimos clientes que han reservado'}</p>
      {!clients.length ? (
        <div className="mt-4 grid justify-items-center gap-2 rounded-card border border-dashed border-border p-10 text-center">
          <UsersIcon className="text-3xl text-muted" />
          <p className="font-display text-xl">{q ? 'Nadie con ese nombre' : 'Aún no hay clientes'}</p>
          <p className="text-sm text-muted">Cada cliente que reserva aparece aquí solo.</p>
        </div>
      ) : (
        <ul className="mt-3 grid gap-2">
          {clients.map((c) => (
            <li key={c.id}>
              <Link href={`/dashboard/clientes/${c.id}`} className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 transition duration-200 hover:border-primary/50">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary" aria-hidden>
                  {c.nombre.trim().charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.nombre}</span>
                  <span className="block truncate text-sm tabular-nums text-muted">{c.telefono}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
