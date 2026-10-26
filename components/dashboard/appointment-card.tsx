'use client'

import { useState, useTransition } from 'react'
import { remindClient, updateAppointmentStatus } from '@/actions/appointments'
import { formatPrice, formatTime } from '@/lib/format'
import { generateWhatsAppReminderLink } from '@/lib/whatsapp'
import { BellIcon, ChatIcon, CheckIcon, PhoneIcon, XIcon } from '@/components/icons'
import type { AppointmentStatus, AppointmentWithRelations } from '@/types/database'

// Color por estado: barra lateral + etiqueta.
const statusStyle: Record<AppointmentStatus, { text: string; badge: string; bar: string }> = {
  confirmada: { text: 'Confirmada', badge: 'bg-primary/15 text-primary', bar: 'bg-primary' },
  completada: { text: 'Completada', badge: 'bg-success/15 text-success', bar: 'bg-success' },
  no_presentado: { text: 'No presentado', badge: 'bg-danger/15 text-danger', bar: 'bg-danger' },
  cancelada: { text: 'Cancelada', badge: 'bg-text/10 text-muted', bar: 'bg-muted' },
}

type Props = { appointment: AppointmentWithRelations; highlight?: 'Ahora' | 'Siguiente' }

export function AppointmentCard({ appointment: a, highlight }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [reminded, setReminded] = useState(false)
  const status = statusStyle[a.status]
  const phone = a.client?.telefono
  const done = a.status !== 'confirmada'

  function setStatus(next: AppointmentStatus) {
    setError(null)
    startTransition(async () => {
      const result = await updateAppointmentStatus(a.id, next)
      if (!result.ok) setError(result.error)
    })
  }

  function remind() {
    setError(null)
    startTransition(async () => {
      const result = await remindClient(a.id)
      if (result.ok) setReminded(true)
      else setError(result.error)
    })
  }

  return (
    <article
      className={`card relative overflow-hidden p-5 pl-6 transition duration-200 ${
        highlight ? 'border-primary shadow-glow md:col-span-2' : ''
      } ${done ? 'opacity-80' : ''}`}
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${status.bar}`} />
      {highlight && <p className="eyebrow mb-3 text-primary">{highlight}</p>}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-3xl tabular-nums leading-none">
            {formatTime(a.start_time)}
            <span className="font-body ml-2 text-sm font-normal text-muted">hasta {formatTime(a.end_time)}</span>
          </p>
          <p className="mt-3 text-lg font-semibold">{a.client?.nombre ?? 'Cliente'}</p>
          <p className="text-sm text-muted">
            {a.service?.nombre}
            {a.service ? ` · ${formatPrice(a.service.precio)}` : ''} · {a.barber?.nombre}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${status.badge}`}>{status.text}</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {phone && (
          <a href={`tel:${phone}`} className="btn-ghost">
            <PhoneIcon /> Llamar
          </a>
        )}
        {phone && a.client && (
          <a href={generateWhatsAppReminderLink(phone, a.client.nombre, a.start_time)} target="_blank" rel="noopener noreferrer" className="btn-ghost">
            <ChatIcon className="text-whatsapp" /> WhatsApp
          </a>
        )}
        {a.status === 'confirmada' && new Date(a.start_time).getTime() > Date.now() && (
          <button type="button" disabled={pending || reminded} onClick={remind} className="btn-ghost col-span-2">
            {reminded ? <><CheckIcon className="text-success" /> Aviso enviado</> : <><BellIcon /> Enviar recordatorio al móvil</>}
          </button>
        )}
        {a.status === 'confirmada' ? (
          <>
            <button type="button" disabled={pending} onClick={() => setStatus('completada')} className="btn whitespace-nowrap px-2 border border-success/40 bg-success/15 text-success hover:bg-success/25">
              <CheckIcon /> Completado
            </button>
            <button type="button" disabled={pending} onClick={() => setStatus('no_presentado')} className="btn whitespace-nowrap px-2 border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20">
              <XIcon /> No presentado
            </button>
          </>
        ) : (
          <button type="button" disabled={pending} onClick={() => setStatus('confirmada')} className="btn-ghost col-span-2">
            Deshacer
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </article>
  )
}
