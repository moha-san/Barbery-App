'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { getAvailableSlots } from '@/actions/appointments'
import { formatDateLong, formatTime } from '@/lib/format'
import type { Barber, Service } from '@/types/database'
import { ServicePicker } from './service-picker'
import { BarberPicker } from './barber-picker'
import { DatePicker } from './date-picker'
import { SlotGrid } from './slot-grid'
import { ConfirmDialog } from './confirm-dialog'

type Props = { barbers: Barber[]; services: Service[] }

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-300">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs text-white">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

export function BookingFlow({ barbers, services }: Props) {
  const [service, setService] = useState<Service | null>(null)
  const [barber, setBarber] = useState<Barber | null>(null)
  const [day, setDay] = useState<Date | undefined>()
  const [slots, setSlots] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slot, setSlot] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [booked, setBooked] = useState<string | null>(null)

  // shortcut: el día se toma en la zona del móvil; vale mientras los clientes estén en la zona del local.
  const dateKey = day ? format(day, 'yyyy-MM-dd') : null

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

  if (booked) {
    return (
      <div className="grid gap-4 rounded-2xl border border-brand/40 bg-brand/10 p-6 text-center">
        <p className="text-4xl">✅</p>
        <h2 className="text-xl font-semibold">¡Cita reservada!</h2>
        <p className="text-neutral-300">
          {service?.nombre} con {barber?.nombre}, <span className="capitalize">{formatDateLong(booked)}</span> a las{' '}
          {formatTime(booked)}.
        </p>
        <button
          type="button"
          onClick={() => {
            setBooked(null)
            setSlot(null)
            void loadSlots()
          }}
          className="mx-auto rounded-lg border border-white/15 px-4 py-2 text-sm"
        >
          Hacer otra reserva
        </button>
      </div>
    )
  }

  if (!barbers.length || !services.length) {
    return <p className="text-neutral-400">Aún no hay servicios o barberos disponibles.</p>
  }

  return (
    <div className="grid gap-8">
      <Step n={1} title="Servicio">
        <ServicePicker services={services} selectedId={service?.id ?? null} onSelect={setService} />
      </Step>

      {service && (
        <Step n={2} title="Barbero">
          <BarberPicker barbers={barbers} selectedId={barber?.id ?? null} onSelect={setBarber} />
        </Step>
      )}

      {service && barber && (
        <Step n={3} title="Día">
          <DatePicker selected={day} onSelect={setDay} />
        </Step>
      )}

      {service && barber && day && (
        <Step n={4} title="Hora">
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
          }}
          onSlotTaken={() => void loadSlots()}
        />
      )}
    </div>
  )
}
