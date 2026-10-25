/* eslint-disable @next/next/no-img-element */
import { SiteHeader } from '@/components/site-header'
import { BookingFlow } from '@/components/booking/booking-flow'
import { ChatIcon, ClockIcon, MapPinIcon, NavigationIcon, PhoneIcon } from '@/components/icons'
import { siteConfig, type Weekday } from '@/config/site'
import { toLocal } from '@/lib/format'
import { shopWhatsAppLink } from '@/lib/whatsapp'
import { createSessionClient } from '@/lib/supabase/server'

export const revalidate = 60

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

// "Abierto hasta las 20:00" / "Cerrado · abre mañana a las 10:00"
function openStatus(): { open: boolean; text: string } {
  const now = toLocal(new Date())
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const today = siteConfig.businessHours[now.getDay() as Weekday]
  const current = today.find((w) => hhmm >= w.open && hhmm < w.close)
  if (current) return { open: true, text: `Abierto hasta las ${current.close}` }
  const later = today.find((w) => hhmm < w.open)
  if (later) return { open: false, text: `Cerrado · abre hoy a las ${later.open}` }
  for (let i = 1; i <= 7; i++) {
    const day = (now.getDay() + i) % 7
    const next = siteConfig.businessHours[day as Weekday][0]
    if (next) return { open: false, text: `Cerrado · abre ${i === 1 ? 'mañana' : `el ${DAYS[day]}`} a las ${next.open}` }
  }
  return { open: false, text: 'Cerrado' }
}

const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteConfig.address)}`

export default async function HomePage() {
  const supabase = createSessionClient()
  const [barbers, services] = await Promise.all([
    supabase.from('barbers').select('*').eq('activo', true).order('nombre'),
    supabase.from('services').select('*').eq('activo', true).order('precio'),
  ])
  const status = openStatus()

  const quick = [
    { href: shopWhatsAppLink('Hola, quería información sobre una cita.'), label: 'WhatsApp', icon: <ChatIcon className="text-whatsapp" />, external: true },
    { href: `tel:${siteConfig.phone}`, label: 'Llamar', icon: <PhoneIcon className="text-primary" />, external: false },
    { href: mapsUrl, label: 'Cómo llegar', icon: <NavigationIcon className="text-primary" />, external: true },
  ]

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl pb-40 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)] lg:gap-16 lg:px-8 lg:pt-8">
        <section className="relative isolate overflow-hidden lg:sticky lg:top-24 lg:flex lg:h-[calc(100dvh-8rem)] lg:min-h-[34rem] lg:flex-col lg:justify-end lg:rounded-card lg:border lg:border-border">
          <img src={siteConfig.theme.heroImage} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/75 to-background/10" />
          <div className="px-4 pb-8 pt-32 lg:p-10">
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
            <BookingFlow barbers={barbers.data} services={services.data} />
          )}
        </div>
      </main>
    </>
  )
}
