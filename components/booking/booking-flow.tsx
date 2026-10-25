'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { getAvailableSlots } from '@/actions/appointments'
import { siteConfig } from '@/config/site'
import { buildIcs, googleCalendarUrl, type CalendarEvent } from '@/lib/calendar'
import { formatDateLong, formatPrice, formatTime } from '@/lib/format'
import { shopWhatsAppLink } from '@/lib/whatsapp'
import { CalendarIcon, CheckIcon } from '@/components/icons'
import type { Barber, Service } from '@/types/database'
import { ServicePicker } from './service-picker'
import { BarberPicker } from './barber-picker'
import { DatePicker } from './date-picker'
import { SlotGrid } from './slot-grid'
import { ConfirmDialog } from './confirm-dialog'

type Props = { barbers: Barber[]; services: Service[] }

const STEPS = ['Servicio', 'Barbero', 'Día', 'Hora']

function Step({ n, title, done, innerRef, children }: { n: number; title: string; done: boolean; innerRef?: RefObject<HTMLElement>; children: ReactNode }) {
  return (
    <section ref={innerRef} className="grid scroll-mt-24 gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-300">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs text-white ${done ? 'bg-emerald-600' : 'bg-brand'}`}>
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
  const [booked, setBooked] = useState<string | null>(null)

  const barberRef = useRef<HTMLElement>(null)
  const dayRef = useRef<HTMLElement>(null)
  const hourRef = useRef<HTMLElement>(null)
  const scrollTo = (ref: RefObject<HTMLElement>) =>
    requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))

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
    return <BookedScreen start={booked} service={service} barber={barber} onAgain={() => { setBooked(null); setSlot(null); void loadSlots() }} />
  }

  if (!barbers.length || !services.length) {
    return <p className="text-neutral-400">Aún no hay servicios o barberos disponibles.</p>
  }

  const current = !service ? 0 : !barber ? 1 : !dateKey ? 2 : 3

  return (
    <div className="grid gap-10">
      <ol className="grid grid-cols-4 gap-1.5" aria-label="Progreso">
        {STEPS.map((label, i) => (
          <li key={label} className="grid gap-1.5">
            <span className={`h-1 rounded-full ${i <= current ? 'bg-brand' : 'bg-white/10'}`} />
            <span className={`text-[11px] ${i === current ? 'text-white' : 'text-neutral-500'}`}>{label}</span>
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
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-neutral-950/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {service.nombre}
                {barber ? ` · ${barber.nombre}` : ''}
              </p>
              <p className="truncate text-xs first-letter:uppercase text-neutral-400">
                {slot ? `${formatDateLong(slot)} · ${formatTime(slot)}` : dateKey ? formatDateLong(`${dateKey}T12:00:00Z`) : `${service.duracion_min} min`}
              </p>
            </div>
            <p className="text-lg font-semibold tabular-nums">{formatPrice(service.precio)}</p>
            {slot && (
              <button type="button" onClick={() => setDialogOpen(true)} className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white">
                Confirmar
              </button>
            )}
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
          onBooked={() => {
            setDialogOpen(false)
            setBooked(slot)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onSlotTaken={() => void loadSlots()}
        />
      )}
    </div>
  )
}

function BookedScreen({ start, service, barber, onAgain }: { start: string; service: Service; barber: Barber; onAgain: () => void }) {
  const event: CalendarEvent = {
    title: `${service.nombre} en ${siteConfig.name}`,
    start,
    end: new Date(new Date(start).getTime() + service.duracion_min * 60_000).toISOString(),
    location: siteConfig.address,
    details: `Con ${barber.nombre}. Si no puedes venir, avísanos: ${siteConfig.phone}`,
  }
  const icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(buildIcs(event))}`

  return (
    <div className="grid gap-5 rounded-3xl border border-brand/30 bg-gradient-to-b from-brand/15 to-transparent p-6 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-600 text-3xl text-white shadow-lg shadow-emerald-600/30">
        <CheckIcon />
      </span>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">¡Cita reservada!</h2>
        <p className="mt-2 text-neutral-300">
          {service.nombre} con {barber.nombre}
        </p>
        <p className="text-lg font-semibold first-letter:uppercase">
          {formatDateLong(start)} · {formatTime(start)}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <a href={icsHref} download="cita.ics" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-black">
          <CalendarIcon /> Añadir al calendario
        </a>
        <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-white/15 py-3 text-sm font-medium">
          Google Calendar
        </a>
      </div>
      <p className="text-sm text-neutral-400">
        ¿Necesitas cambiarla?{' '}
        <a href={shopWhatsAppLink(`Hola, tengo cita el ${formatDateLong(start)} a las ${formatTime(start)} y necesito cambiarla.`)} target="_blank" rel="noopener noreferrer" className="font-medium text-white underline underline-offset-4">
          Escríbenos por WhatsApp
        </a>
      </p>
      <button type="button" onClick={onAgain} className="mx-auto text-sm text-neutral-400 underline underline-offset-4">
        Hacer otra reserva
      </button>
    </div>
  )
}
