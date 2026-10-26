import { sortServices } from '@/lib/format'
import { requireStaff } from '@/lib/staff'
import { localDateKey } from '@/lib/format'
import { SubHeader } from '@/components/dashboard/sub-header'
import { QuickBookForm } from '@/components/dashboard/quick-book-form'

export const dynamic = 'force-dynamic'

type Props = { searchParams: { fecha?: string; barbero?: string; nombre?: string; tel?: string } }

// Cita rápida: el barbero apunta a quien llama por teléfono o entra sin cita.
export default async function QuickBookPage({ searchParams }: Props) {
  const { supabase } = await requireStaff()
  const [barbers, services] = await Promise.all([
    supabase.from('barbers').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('services').select('*').eq('activo', true).order('precio').then((r) => ({ ...r, data: r.data && sortServices(r.data) })),
  ])
  const today = localDateKey(new Date())
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.fecha ?? '') && searchParams.fecha! >= today ? searchParams.fecha! : today

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
      <SubHeader title="Cita rápida" />
      <QuickBookForm
        barbers={barbers.data ?? []}
        services={services.data ?? []}
        initial={{ fecha, barberId: searchParams.barbero ?? null, nombre: searchParams.nombre ?? '', telefono: searchParams.tel ?? '' }}
        today={today}
      />
    </main>
  )
}
