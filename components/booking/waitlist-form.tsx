'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { joinWaitlist } from '@/actions/clients'
import { formatDateLong } from '@/lib/format'
import { BellIcon, CheckIcon } from '@/components/icons'

type Props = { dateKey: string; barberId: string | null; serviceId: string | null; barberName?: string }

// Aparece cuando el día elegido está completo: el cliente se apunta y el barbero le escribe si se libera hueco.
export function WaitlistForm({ dateKey, barberId, serviceId, barberName }: Props) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const day = formatDateLong(`${dateKey}T12:00:00Z`)

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const r = await joinWaitlist({ fecha: dateKey, barberId, serviceId, nombre: String(f.get('nombre')), telefono: String(f.get('telefono')) })
      if (r.ok) setDone(true)
      else setError(r.error)
    })
  }

  if (done)
    return (
      <p role="status" className="flex items-start gap-3 rounded-card border border-success/40 bg-success/10 p-4 text-sm">
        <CheckIcon className="mt-0.5 shrink-0 text-success" />
        <span>Te hemos apuntado para el {day}. Si alguien cancela, te escribimos por WhatsApp.</span>
      </p>
    )

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost h-12 w-full">
        <BellIcon /> Avísame si se libera un hueco
      </button>
    )

  return (
    <form onSubmit={submit} className="card grid gap-3 p-4">
      <p className="text-sm">
        <span className="font-semibold">Lista de espera · {day}</span>
        {barberName && <span className="text-muted"> con {barberName}</span>}
      </p>
      <input name="nombre" required minLength={2} maxLength={100} autoComplete="name" placeholder="Tu nombre" aria-label="Nombre" className="field" />
      <input name="telefono" type="tel" required inputMode="tel" autoComplete="tel" placeholder="Tu teléfono" aria-label="Teléfono" className="field" />
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button disabled={pending} className="btn-primary h-12">
        {pending ? 'Apuntando…' : 'Apuntarme'}
      </button>
    </form>
  )
}
