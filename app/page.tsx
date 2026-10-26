/* eslint-disable @next/next/no-img-element */
import { sortServices } from '@/lib/format'
import { SiteHeader } from '@/components/site-header'
import { BookingFlow } from '@/components/booking/booking-flow'
import Link from 'next/link'
import { ArrowRightIcon, ChatIcon, ClockIcon, MapPinIcon, NavigationIcon, PhoneIcon, StarIcon } from '@/components/icons'
import { siteConfig } from '@/config/site'
import { toLocal, whenLabel } from '@/lib/format'
import { shopWhatsAppLink } from '@/lib/whatsapp'
import { createSessionClient } from '@/lib/supabase/server'
import { openStatus } from '@/lib/hours'
import { barberPath } from '@/lib/barber-page'
import { getGallery, getShopSettings, nextFreeSlot } from '@/lib/shop'

export const revalidate = 60

const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteConfig.address)}`

export default async function HomePage() {
  const supabase = createSessionClient()
  const [barbers, services] = await Promise.all([
    supabase.from('barbers').select('*').eq('activo', true).order('nombre'),
    supabase.from('services').select('*').eq('activo', true).order('precio').then((r) => ({ ...r, data: r.data && sortServices(r.data) })),
  ])
  const [settings, gallery] = await Promise.all([getShopSettings(), getGallery()])
  const now = toLocal(new Date())
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const status = openStatus(settings.hours, now.getDay(), hhmm)
  const shortest = Math.min(...(services.data ?? []).map((s) => s.duracion_min))
  const nextFree = Number.isFinite(shortest) ? await nextFreeSlot((barbers.data ?? []).map((b) => b.id), shortest) : null

  const quick = [
    { href: shopWhatsAppLink('Hola, quería información sobre una cita.'), label: 'WhatsApp', icon: <ChatIcon className="text-whatsapp" />, external: true },
    { href: `tel:${siteConfig.phone}`, label: 'Llamar', icon: <PhoneIcon className="text-primary" />, external: false },
    { href: mapsUrl, label: 'Cómo llegar', icon: <NavigationIcon className="text-primary" />, external: true },
  ]

  return (
    <>
      <SiteHeader logo={settings.logoUrl} />
      <main className="mx-auto max-w-6xl pb-40 lg:grid lg:pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)] lg:gap-16 lg:px-8 lg:pt-8">
        <section className="relative isolate overflow-hidden lg:sticky lg:top-24 lg:flex lg:h-[calc(100dvh-8rem)] lg:min-h-[34rem] lg:flex-col lg:justify-end lg:rounded-card lg:border lg:border-border">
          <img src={settings.heroUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/75 to-background/10" />
          <div className="px-4 pb-8 pt-16 lg:p-10">
            <p className="eyebrow animate-fade-up">Reserva online</p>
            <h1 className="mt-3 animate-fade-up text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">{siteConfig.name}</h1>
            <p className="mt-4 max-w-md animate-fade-up text-base leading-relaxed text-muted">{siteConfig.theme.tagline}</p>

            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-surface/80 px-3 backdrop-blur">
                <span className={`h-2 w-2 rounded-full ${status.open ? 'bg-success' : 'bg-muted'}`} aria-hidden />
                <ClockIcon className="text-muted" /> {status.text}
              </span>
              <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-surface/80 px-3 text-muted backdrop-blur">
                <MapPinIcon /> {siteConfig.address}
              </span>
            </div>

            <a href="#reservar" className="btn-primary mt-6 h-14 w-full text-base sm:w-auto sm:px-8">
              Reservar cita
              {nextFree && <span className="font-normal opacity-90">· {whenLabel(nextFree)}</span>}
            </a>

            <nav aria-label="Contacto" className="mt-6 grid grid-cols-3 gap-2">
              {quick.map((q) => (
                <a
                  key={q.label}
                  href={q.href}
                  {...(q.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-card border border-border bg-surface/80 text-xs font-medium backdrop-blur transition duration-200 hover:border-primary/50 [&_svg]:text-xl"
                >
                  {q.icon}
                  {q.label}
                </a>
              ))}
            </nav>
          </div>
        </section>

        <div className="px-4 pt-6 lg:px-0 lg:pt-2">
          {barbers.error || services.error ? (
            <div role="alert" className="card p-6 text-center">
              <p className="font-display text-xl">Ahora mismo no podemos cargar la agenda</p>
              <p className="mt-2 text-sm text-muted">Llámanos o escríbenos por WhatsApp y te buscamos hueco.</p>
            </div>
          ) : (
            <BookingFlow barbers={barbers.data} services={services.data ?? []} hours={settings.hours} nextFree={nextFree} />
          )}

          {(barbers.data?.length ?? 0) > 1 && (
            <section aria-labelledby="equipo" className="mt-14">
              <h2 id="equipo" className="text-2xl">El equipo</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {barbers.data!.map((b) => (
                  <Link key={b.id} href={barberPath(b)} className="card flex items-center gap-4 p-4 transition duration-200 hover:border-primary/50">
                    {b.avatar_url ? (
                      <img src={b.avatar_url} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="font-display grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary/10 text-2xl text-primary">{b.nombre.charAt(0)}</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{b.nombre}</span>
                      <span className="block truncate text-sm text-muted">{b.especialidad ?? 'Ver sus cortes'}</span>
                    </span>
                    <ArrowRightIcon className="shrink-0 text-muted" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {gallery.length > 0 && (
            <section aria-labelledby="galeria" className="mt-14">
              <h2 id="galeria" className="text-2xl">Nuestro trabajo</h2>
              <div className="-mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-3 lg:px-0">
                {gallery.slice(0, 24).map((g) => (
                  <img key={g.id} src={g.url} alt="Corte hecho en la barbería" loading="lazy" className="aspect-[4/5] w-48 shrink-0 snap-start rounded-card border border-border object-cover lg:w-full" />
                ))}
              </div>
            </section>
          )}

          {settings.reviewUrl && (
            <a href={settings.reviewUrl} target="_blank" rel="noopener noreferrer" className="card mt-10 flex items-center gap-4 p-5 transition duration-200 hover:border-primary/50">
              <StarIcon className="shrink-0 text-2xl text-accent" />
              <span className="min-w-0">
                <span className="block font-semibold">¿Ya nos conoces?</span>
                <span className="block text-sm text-muted">Déjanos tu opinión en Google. Nos ayuda muchísimo.</span>
              </span>
            </a>
          )}
        </div>
      </main>
    </>
  )
}
