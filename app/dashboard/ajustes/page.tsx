import Link from 'next/link'
import { redirect } from 'next/navigation'
import { siteConfig } from '@/config/site'
import { createSessionClient } from '@/lib/supabase/server'
import { localDateKey } from '@/lib/format'
import { getGallery, getShopSettings } from '@/lib/shop'
import { ArrowLeftIcon } from '@/components/icons'
import { BarbersEditor, HoursEditor, PhotosEditor, Section, ServicesEditor, TimeOffEditor, type TimeOffRow } from '@/components/settings/editors'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = createSessionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('rol').eq('id', user.id).single()
  if (!profile || profile.rol === 'cliente') redirect('/dashboard')
  const isAdmin = profile.rol === 'admin'

  const [services, barbers, blocks, raw, settings, gallery] = await Promise.all([
    supabase.from('services').select('*').order('precio'),
    supabase.from('barbers').select('*').order('nombre'),
    supabase
      .from('time_off')
      .select('id, barber_id, start_time, end_time, motivo, barber:barbers(nombre)')
      .gt('end_time', new Date().toISOString())
      .order('start_time')
      .limit(50),
    supabase.from('shop_settings').select('hero_url, logo_url').eq('id', 1).maybeSingle(),
    getShopSettings(),
    getGallery(),
  ])
  // Si falla la tabla de ajustes es que falta pegar el SQL en Supabase.
  const needsSql = !!raw.error || !!blocks.error

  const sections = isAdmin
    ? [
        ['servicios', 'Servicios'],
        ['barberos', 'Barberos'],
        ['horario', 'Horario'],
        ['descansos', 'Días libres'],
        ['fotos', 'Fotos'],
      ]
    : [['descansos', 'Días libres']]

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
      <header className="flex items-center gap-3 border-b border-border pb-4">
        <Link href="/dashboard" className="btn-ghost h-11 px-3" aria-label="Volver a la agenda">
          <ArrowLeftIcon /> <span className="hidden sm:inline">Agenda</span>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{siteConfig.name}</p>
          <h1 className="text-2xl">Ajustes</h1>
        </div>
      </header>

      <nav aria-label="Secciones" className="sticky top-0 z-20 -mx-4 flex gap-2 overflow-x-auto bg-background/90 px-4 py-3 backdrop-blur [scrollbar-width:none] sm:mx-0 sm:px-0">
        {sections.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="btn h-10 shrink-0 rounded-full border border-border bg-surface px-4 hover:border-primary/50">
            {label}
          </a>
        ))}
      </nav>

      {needsSql && (
        <p role="alert" className="mt-4 rounded-card border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          Falta un paso en la base de datos: pega el archivo <strong>ajustes.sql</strong> en Supabase (SQL Editor) y pulsa Run. Hasta entonces, el horario, los días libres y las fotos no se guardan.
        </p>
      )}

      <div className="mt-6 grid gap-14">
        {isAdmin && (
          <>
            <Section id="servicios" title="Servicios y precios" hint="Lo que el cliente ve al reservar. Para dejar de ofrecer uno, ocúltalo (las citas antiguas se guardan).">
              <ServicesEditor services={services.data ?? []} />
            </Section>
            <Section id="barberos" title="Barberos" hint="Con foto se reserva más. Si alguien deja de trabajar aquí, desactívalo.">
              <BarbersEditor barbers={barbers.data ?? []} />
            </Section>
            <Section id="horario" title="Horario" hint="Para cerrar a mediodía, pon dos tramos: mañana y tarde. Los cambios se ven al momento en la web.">
              <HoursEditor hours={settings.hours} />
            </Section>
          </>
        )}
        <Section id="descansos" title="Días libres, vacaciones y descansos" hint="Bloquea un día, unas horas o unas vacaciones. Las citas ya reservadas no se borran: avisa a esos clientes.">
          <TimeOffEditor
            barbers={(barbers.data ?? []).filter((b) => b.activo)}
            blocks={(blocks.data ?? []) as unknown as TimeOffRow[]}
            today={localDateKey(new Date())}
          />
        </Section>
        {isAdmin && (
          <Section id="fotos" title="Fotos" hint="Sube fotos desde el móvil. Se hacen más pequeñas solas para que la web cargue rápido.">
            <PhotosEditor heroUrl={raw.data?.hero_url ?? null} logoUrl={raw.data?.logo_url ?? null} defaultHero={siteConfig.theme.heroImage} gallery={gallery} />
          </Section>
        )}
      </div>
    </main>
  )
}
