import { SiteHeader } from '@/components/site-header'
import { BookingFlow } from '@/components/booking/booking-flow'
import { ClockIcon, MapPinIcon } from '@/components/icons'
import { siteConfig, type Weekday } from '@/config/site'
import { toLocal } from '@/lib/format'
import { createSessionClient } from '@/lib/supabase/server'

export const revalidate = 60

function todayHours(): string {
  const windows = siteConfig.businessHours[toLocal(new Date()).getDay() as Weekday]
  return windows.length ? `Hoy ${windows.map((w) => `${w.open}–${w.close}`).join(' · ')}` : 'Hoy cerrado'
}

export default async function HomePage() {
  const supabase = createSessionClient()
  const [barbers, services] = await Promise.all([
    supabase.from('barbers').select('*').eq('activo', true).order('nombre'),
    supabase.from('services').select('*').eq('activo', true).order('precio'),
  ])

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 pb-32">
        <section className="relative -mx-4 overflow-hidden px-4 pb-8 pt-10">
          <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-brand/25 blur-3xl" />
          <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-brand">Reserva online</p>
          <h1 className="relative mt-2 text-4xl font-bold tracking-tight">{siteConfig.name}</h1>
          <p className="relative mt-2 text-neutral-300">{siteConfig.description}</p>
          <div className="relative mt-5 flex flex-wrap gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <ClockIcon className="text-brand" /> {todayHours()}
            </span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteConfig.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10"
            >
              <MapPinIcon className="text-brand" /> {siteConfig.address}
            </a>
          </div>
        </section>

        {barbers.error || services.error ? (
          <p className="rounded-xl bg-red-500/10 p-4 text-sm text-red-300">
            No se pudo cargar la información. Llámanos o escríbenos por WhatsApp.
          </p>
        ) : (
          <BookingFlow barbers={barbers.data} services={services.data} />
        )}
      </main>
    </>
  )
}
