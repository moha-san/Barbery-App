/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { BookingFlow } from '@/components/booking/booking-flow'
import { ArrowLeftIcon, ChatIcon, InstagramIcon, MapPinIcon } from '@/components/icons'
import { siteConfig } from '@/config/site'
import { whenLabel } from '@/lib/format'
import { shopWhatsAppLink } from '@/lib/whatsapp'
import { instagramHandle } from '@/lib/barber-page'
import { createSessionClient } from '@/lib/supabase/server'
import { getBarberByLink, getGallery, getShopSettings, nextFreeSlot } from '@/lib/shop'

// Página propia de cada barbero: el enlace que pone en la bio de su Instagram.
export const revalidate = 60

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const barber = await getBarberByLink(params.slug)
  if (!barber) return { title: siteConfig.name }
  const title = `${barber.nombre} · ${siteConfig.name}`
  const description = `Reserva tu cita con ${barber.nombre}${barber.especialidad ? ` (${barber.especialidad})` : ''} en ${siteConfig.name}.`
  return {
    title,
    description,
    openGraph: { title, description, images: barber.avatar_url ? [barber.avatar_url] : undefined },
  }
}

export default async function BarberPage({ params }: Props) {
  const barber = await getBarberByLink(params.slug)
  if (!barber) notFound()

  const supabase = createSessionClient()
  const [services, settings, gallery] = await Promise.all([
    supabase.from('services').select('*').eq('activo', true).order('precio'),
    getShopSettings(),
    getGallery(),
  ])
  const photos = gallery.filter((g) => g.barber_id === barber.id)
  const shortest = Math.min(...(services.data ?? []).map((s) => s.duracion_min))
  const nextFree = Number.isFinite(shortest) ? await nextFreeSlot([barber.id], shortest) : null
  const ig = instagramHandle(barber.instagram)

  return (
    <>
      <SiteHeader logo={settings.logoUrl} />
      <main className="mx-auto max-w-3xl px-4 pb-40 pt-6 lg:pb-16">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-text">
          <ArrowLeftIcon /> Toda la barbería
        </Link>

        <section className="mt-4 flex flex-col items-center text-center">
          {barber.avatar_url ? (
            <img src={barber.avatar_url} alt={barber.nombre} className="h-28 w-28 rounded-full object-cover ring-2 ring-primary/40" />
          ) : (
            <span className="font-display grid h-28 w-28 place-items-center rounded-full bg-primary/10 text-5xl text-primary">{barber.nombre.charAt(0)}</span>
          )}
          <h1 className="mt-4 text-4xl leading-tight">{barber.nombre}</h1>
          {barber.especialidad && <p className="mt-1 text-muted">{barber.especialidad}</p>}
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted">
            <MapPinIcon /> {siteConfig.name} · {siteConfig.address}
          </p>

          <a href="#reservar" className="btn-primary mt-6 h-14 w-full text-base sm:w-auto sm:px-8">
            Reservar con {barber.nombre.split(' ')[0]}
            {nextFree && <span className="font-normal opacity-90">· {whenLabel(nextFree)}</span>}
          </a>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {ig && (
              <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer" className="btn-ghost h-11 rounded-full px-4">
                <InstagramIcon /> @{ig}
              </a>
            )}
            <a href={shopWhatsAppLink(`Hola, quería cita con ${barber.nombre}.`)} target="_blank" rel="noopener noreferrer" className="btn-ghost h-11 rounded-full px-4">
              <ChatIcon className="text-whatsapp" /> WhatsApp
            </a>
          </div>
        </section>

        {photos.length > 0 && (
          <section aria-labelledby="cortes" className="mt-10">
            <h2 id="cortes" className="text-2xl">Sus cortes</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {photos.map((g) => (
                <img key={g.id} src={g.url} alt={`Corte de ${barber.nombre}`} loading="lazy" className="aspect-[4/5] w-full rounded-card border border-border object-cover" />
              ))}
            </div>
          </section>
        )}

        <div className="mt-12">
          {services.error ? (
            <div role="alert" className="card p-6 text-center">
              <p className="font-display text-xl">Ahora mismo no podemos cargar la agenda</p>
              <p className="mt-2 text-sm text-muted">Llámanos o escríbenos por WhatsApp y te buscamos hueco.</p>
            </div>
          ) : (
            <BookingFlow barbers={[barber]} services={services.data} hours={settings.hours} nextFree={nextFree} />
          )}
        </div>
      </main>
    </>
  )
}
