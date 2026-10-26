'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { getAvailableSlots } from '@/actions/appointments'
import { siteConfig } from '@/config/site'
import { buildIcs, googleCalendarUrl, type CalendarEvent } from '@/lib/calendar'
import { formatDateLong, formatPrice, formatTime } from '@/lib/format'
import { shopWhatsAppLink } from '@/lib/whatsapp'
import { CalendarIcon, ChatIcon, CheckIcon, ScissorsIcon } from '@/components/icons'
import type { Barber, Service } from '@/types/database'
import { ServicePicker } from './service-picker'
import { BarberPicker } from './barber-picker'
import { DatePicker } from './date-picker'
import { SlotGrid } from './slot-grid'
import { ConfirmDialog } from './confirm-dialog'
import { PushButton } from '@/components/push-button'

type Props = { barbers: Barber[]; services: Service[] }

const STEPS = ['Servicio', 'Barbero', 'Día', 'Hora']

function Step({ n, title, done, innerRef, children }: { n: number; title: string; done: boolean; innerRef?: RefObject<HTMLElement>; children: ReactNode }) {
  return (
    <section ref={innerRef} className="grid animate-fade-up scroll-mt-24 gap-4">
      <h2 className="flex items-center gap-3 text-2xl">
        <span
          className={`font-body grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-semibold transition duration-200 ${
            done ? 'border-primary bg-primary text-on-primary' : 'border-primary/60 text-primary'
          }`}
        >
          {done ? <CheckIcon /> : n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

export function BookingFlow({ barbers, services }: Props) {
  const [service, setService] = useState<Service | null>(null)
  // Con un solo barbero no tiene sentido preguntar.
  const [barber, setBarber] = useState<Barber | null>(barbers.length === 1 ? barbers[0] : null)
  const [dateKey, setDateKey] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slot, setSlot] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [booked, setBooked] = useState<{ start: string; id: string } | null>(null)

  const barberRef = useRef<HTMLElement>(null)
  const dayRef = useRef<HTMLElement>(null)
  const hourRef = useRef<HTMLElement>(null)
  const scrollTo = (ref: RefObject<HTMLElement>) =>
    requestAnimationFrame(() =>
      ref.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }),
    )

  const loadSlots = useCallback(async () => {
    if (!dateKey || !barber || !service) return
    setLoading(true)
    setError(null)
    const result = await getAvailableSlots(dateKey, barber.id, service.duracion_min)
    setLoading(false)
    if (result.ok) setSlots(result.data)
    else setError(result.error)
  }, [dateKey, barber, service])

  useEffect(() => {
    setSlot(null)
    setSlots(null)
    void loadSlots()
  }, [loadSlots])

  if (booked && service && barber) {
    return <BookedScreen start={booked.start} appointmentId={booked.id} service={service} barber={barber} onAgain={() => { setBooked(null); setSlot(null); void loadSlots() }} />
  }

  if (!barbers.length || !services.length) {
    return (
      <div className="card grid justify-items-center gap-2 p-8 text-center">
        <ScissorsIcon className="text-3xl text-primary" />
        <p className="font-display text-xl">Estamos preparando la agenda</p>
        <p className="text-sm text-muted">Muy pronto podrás reservar aquí. Mientras, escríbenos y te atendemos.</p>
        <a href={shopWhatsAppLink('Hola, quería reservar una cita.')} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-2">
          <ChatIcon className="text-whatsapp" /> Escribir por WhatsApp
        </a>
      </div>
    )
  }

  const current = !service ? 0 : !barber ? 1 : !dateKey ? 2 : 3

  return (
    <div className="grid gap-12">
      <ol className="grid grid-cols-4 gap-2" aria-label="Progreso">
        {STEPS.map((label, i) => (
          <li key={label} className="grid gap-2" aria-current={i === current ? 'step' : undefined}>
            <span className="h-1 overflow-hidden rounded-full bg-text/10">
              <span className={`block h-full rounded-full bg-primary transition-all duration-200 ${i < current ? 'w-full' : i === current ? 'w-1/2' : 'w-0'}`} />
            </span>
            <span className={`text-xs font-medium ${i === current ? 'text-text' : i < current ? 'text-primary' : 'text-muted'}`}>{label}</span>
          </li>
        ))}
      </ol>

      <Step n={1} title="Elige servicio" done={!!service}>
        <ServicePicker
          services={services}
          selectedId={service?.id ?? null}
          onSelect={(s) => {
            setService(s)
            scrollTo(barbers.length > 1 ? barberRef : dayRef)
          }}
        />
      </Step>

      {service && barbers.length > 1 && (
        <Step n={2} title="Elige barbero" done={!!barber} innerRef={barberRef}>
          <BarberPicker
            barbers={barbers}
            selectedId={barber?.id ?? null}
            onSelect={(b) => {
              setBarber(b)
              scrollTo(dayRef)
            }}
          />
        </Step>
      )}

      {service && barber && (
        <Step n={barbers.length > 1 ? 3 : 2} title="Elige día" done={!!dateKey} innerRef={dayRef}>
          <DatePicker
            selected={dateKey}
            onSelect={(d) => {
              setDateKey(d)
              scrollTo(hourRef)
            }}
          />
        </Step>
      )}

      {service && barber && dateKey && (
        <Step n={barbers.length > 1 ? 4 : 3} title="Elige hora" done={!!slot} innerRef={hourRef}>
          <SlotGrid
            slots={slots}
            loading={loading}
            error={error}
            selected={slot}
            onSelect={(iso) => {
              setSlot(iso)
              setDialogOpen(true)
            }}
          />
        </Step>
      )}

      {service && (
        <div className="fixed inset-x-0 bottom-0 z-30 animate-sheet-up border-t border-border bg-background/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-soft backdrop-blur-xl lg:sticky lg:bottom-6 lg:rounded-card lg:border lg:bg-surface/90 lg:p-4 lg:pl-5">
          <div className="mx-auto flex max-w-6xl items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {service.nombre}
                {barber ? ` · ${barber.nombre}` : ''}
              </p>
              <p className="truncate text-xs text-muted first-letter:uppercase">
                {slot ? `${formatDateLong(slot)} · ${formatTime(slot)}` : dateKey ? `${formatDateLong(`${dateKey}T12:00:00Z`)} · elige hora` : `${service.duracion_min} min`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Total</p>
              <p className="font-display text-2xl leading-none tabular-nums">{formatPrice(service.precio)}</p>
            </div>
            <button type="button" disabled={!slot} onClick={() => setDialogOpen(true)} className="btn-primary h-12 px-6 text-base">
              Reservar
            </button>
          </div>
        </div>
      )}

      {service && barber && slot && (
        <ConfirmDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          barber={barber}
          service={service}
          startTime={slot}
          onBooked={(id) => {
            setDialogOpen(false)
            setBooked({ start: slot, id })
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onSlotTaken={() => void loadSlots()}
        />
      )}
    </div>
  )
}

function BookedScreen({ start, appointmentId, service, barber, onAgain }: { start: string; appointmentId: string; service: Service; barber: Barber; onAgain: () => void }) {
  const event: CalendarEvent = {
    title: `${service.nombre} en ${siteConfig.name}`,
    start,
    end: new Date(new Date(start).getTime() + service.duracion_min * 60_000).toISOString(),
    location: siteConfig.address,
    details: `Con ${barber.nombre}. Si no puedes venir, avísanos: ${siteConfig.phone}`,
  }
  const icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(buildIcs(event))}`

  return (
    <div className="card relative grid animate-fade-up gap-6 overflow-hidden p-6 text-center sm:p-10">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/15 to-transparent" />
      <span className="relative mx-auto grid h-20 w-20 animate-scale-in place-items-center rounded-full bg-primary text-on-primary shadow-glow">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 6 9 17l-5-5" strokeDasharray="24" className="animate-draw" />
        </svg>
      </span>
      <div className="relative">
        <p className="eyebrow">Te esperamos</p>
        <h2 className="mt-2 text-3xl sm:text-4xl">¡Cita reservada!</h2>
        <p className="mt-3 text-muted">
          {service.nombre} con {barber.nombre}
        </p>
        <p className="font-display mt-1 text-xl first-letter:uppercase">
          {formatDateLong(start)} · {formatTime(start)}
        </p>
      </div>
      <div className="relative grid gap-2 sm:grid-cols-2">
        <a href={icsHref} download="cita.ics" className="btn-primary h-12">
          <CalendarIcon /> Añadir al calendario
        </a>
        <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="btn-ghost h-12">
          Google Calendar
        </a>
      </div>
      <div className="relative">
        <PushButton kind="client" appointmentId={appointmentId} label="Avisarme antes de la cita" doneLabel="Te avisaremos antes de tu cita" className="btn-ghost h-12 w-full" />
      </div>
      <p className="relative text-sm text-muted">
        ¿Necesitas cambiarla?{' '}
        <a href={shopWhatsAppLink(`Hola, tengo cita el ${formatDateLong(start)} a las ${formatTime(start)} y necesito cambiarla.`)} target="_blank" rel="noopener noreferrer" className="font-semibold text-text underline underline-offset-4">
          Escríbenos por WhatsApp
        </a>
      </p>
      <button type="button" onClick={onAgain} className="relative mx-auto min-h-11 text-sm text-muted underline underline-offset-4 hover:text-text">
        Hacer otra reserva
      </button>
    </div>
  )
}
