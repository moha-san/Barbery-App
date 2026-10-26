'use client'

import { useEffect, useState, useTransition, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { bookAppointment } from '@/actions/appointments'
import { formatDateLong, formatTime, servicePrice } from '@/lib/format'
import type { Barber, Service } from '@/types/database'
import { CLIENT_KEY as STORAGE_KEY, rememberAppointment } from '@/components/next-appointment'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  barber: Barber
  service: Service
  startTime: string
  onBooked: (appointmentId: string) => void
  onSlotTaken: () => void
}

export function ConfirmDialog({ open, onOpenChange, barber, service, startTime, onBooked, onSlotTaken }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState({ nombre: '', telefono: '' })

  // Recuerda nombre y teléfono en este móvil para la próxima reserva.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setSaved(JSON.parse(raw))
    } catch {}
  }, [])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const nombre = String(form.get('nombre') ?? '')
    const telefono = String(form.get('telefono') ?? '')
    setError(null)
    startTransition(async () => {
      const result = await bookAppointment({ barberId: barber.id, serviceId: service.id, startTime, nombre, telefono })
      if (result.ok) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ nombre, telefono }))
        } catch {}
        rememberAppointment({ start: startTime, servicio: service.nombre, barbero: barber.nombre, id: result.data.id, serviceId: service.id, barberId: barber.id })
        return onBooked(result.data.id)
      }
      setError(result.error)
      if (/ocupad|disponible/i.test(result.error)) onSlotTaken()
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-background/80 backdrop-blur-sm" />
        {/* En móvil sale desde abajo; en escritorio, centrado */}
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] animate-sheet-up overflow-y-auto rounded-t-[calc(var(--radius)+8px)] border border-border bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-soft sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:animate-fade-in sm:rounded-card">
          <span aria-hidden className="mx-auto mb-4 block h-1 w-10 rounded-full bg-text/15 sm:hidden" />
          <Dialog.Title className="text-2xl">Confirma tu cita</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted">
            {service.nombre} con {barber.nombre}
          </Dialog.Description>

          <dl className="mt-5 grid grid-cols-2 gap-x-2 gap-y-3 rounded-btn border border-border bg-background p-4 text-sm">
            <dt className="text-muted">Día</dt>
            <dd className="text-right first-letter:uppercase">{formatDateLong(startTime)}</dd>
            <dt className="text-muted">Hora</dt>
            <dd className="text-right tabular-nums">{formatTime(startTime)}</dd>
            <dt className="text-muted">Precio</dt>
            <dd className="font-display text-right text-lg leading-none text-primary">{servicePrice(service.precio)}</dd>
          </dl>

          <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              Nombre
              <input
                name="nombre"
                key={`n-${saved.nombre}`}
                defaultValue={saved.nombre}
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
                className="field"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Teléfono
              <input
                name="telefono"
                key={`t-${saved.telefono}`}
                defaultValue={saved.telefono}
                type="tel"
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="+34 600 000 000"
                className="field"
              />
            </label>

            {error && (
              <p role="alert" className="rounded-btn border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                {error}
              </p>
            )}

            <div className="mt-1 grid grid-cols-2 gap-2">
              <Dialog.Close className="btn-ghost h-12">Cancelar</Dialog.Close>
              <button
                type="submit"
                disabled={pending}
                className="btn-primary h-12 text-base"
              >
                {pending ? 'Reservando…' : 'Reservar'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
