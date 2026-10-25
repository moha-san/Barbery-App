'use client'

import { useEffect, useState, useTransition, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { bookAppointment } from '@/actions/appointments'
import { formatDateLong, formatPrice, formatTime } from '@/lib/format'
import type { Barber, Service } from '@/types/database'

const STORAGE_KEY = 'reserva-cliente'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  barber: Barber
  service: Service
  startTime: string
  onBooked: () => void
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
        return onBooked()
      }
      setError(result.error)
      if (/ocupad|disponible/i.test(result.error)) onSlotTaken()
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
        {/* En móvil sale desde abajo; en escritorio, centrado */}
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-3xl border border-white/10 bg-neutral-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
          <Dialog.Title className="text-lg font-semibold">Confirmar cita</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-neutral-400">
            {service.nombre} con {barber.nombre}
          </Dialog.Description>

          <dl className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-3 text-sm">
            <dt className="text-neutral-400">Día</dt>
            <dd className="text-right first-letter:uppercase">{formatDateLong(startTime)}</dd>
            <dt className="text-neutral-400">Hora</dt>
            <dd className="text-right tabular-nums">{formatTime(startTime)}</dd>
            <dt className="text-neutral-400">Precio</dt>
            <dd className="text-right">{formatPrice(service.precio)}</dd>
          </dl>

          <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm">
              Nombre
              <input
                name="nombre"
                key={`n-${saved.nombre}`}
                defaultValue={saved.nombre}
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
                className="rounded-lg border border-white/15 bg-neutral-950 h-12 px-3 text-base outline-none focus:border-brand"
              />
            </label>
            <label className="grid gap-1 text-sm">
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
                className="rounded-lg border border-white/15 bg-neutral-950 h-12 px-3 text-base outline-none focus:border-brand"
              />
            </label>

            {error && (
              <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </p>
            )}

            <div className="mt-1 grid grid-cols-2 gap-2">
              <Dialog.Close className="h-12 rounded-xl border border-white/15 text-sm">Cancelar</Dialog.Close>
              <button
                type="submit"
                disabled={pending}
                className="h-12 rounded-xl bg-brand text-sm font-semibold text-white disabled:opacity-60"
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
