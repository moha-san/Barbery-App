import { SiteHeader } from '@/components/site-header'
import { BookingFlow } from '@/components/booking/booking-flow'
import { createSessionClient } from '@/lib/supabase/server'

export const revalidate = 60

export default async function HomePage() {
  const supabase = createSessionClient()
  const [barbers, services] = await Promise.all([
    supabase.from('barbers').select('*').eq('activo', true).order('nombre'),
    supabase.from('services').select('*').eq('activo', true).order('precio'),
  ])

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-6">
        {barbers.error || services.error ? (
          <p className="rounded-lg bg-red-500/10 p-4 text-sm text-red-300">
            No se pudo cargar la información. Llámanos o escríbenos por WhatsApp.
          </p>
        ) : (
          <BookingFlow barbers={barbers.data} services={services.data} />
        )}
      </main>
    </>
  )
}
