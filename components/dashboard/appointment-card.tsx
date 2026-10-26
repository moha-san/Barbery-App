'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { remindClient, updateAppointmentStatus } from '@/actions/appointments'
import { formatTime, servicePrice } from '@/lib/format'
import { generateWhatsAppReminderLink, generateWhatsAppReviewLink } from '@/lib/whatsapp'
import { BellIcon, ChatIcon, CheckIcon, ChevronDownIcon, PhoneIcon, StarIcon, UsersIcon, XIcon } from '@/components/icons'
import type { AppointmentStatus, AppointmentWithRelations } from '@/types/database'

// Color por estado: punto + etiqueta.
const statusStyle: Record<AppointmentStatus, { text: string; badge: string; dot: string }> = {
  confirmada: { text: 'Confirmada', badge: 'bg-primary/15 text-primary', dot: 'bg-primary' },
  completada: { text: 'Hecha', badge: 'bg-success/15 text-success', dot: 'bg-success' },
  no_presentado: { text: 'No vino', badge: 'bg-danger/15 text-danger', dot: 'bg-danger' },
  cancelada: { text: 'Cancelada', badge: 'bg-text/10 text-muted', dot: 'bg-muted' },
}

// visits = cortes que ya tenía antes de este día (0 = cliente nuevo).
type Props = { appointment: AppointmentWithRelations; highlight?: 'Ahora' | 'Siguiente'; visits?: number; reviewUrl?: string }

// Fila compacta de la agenda. Al tocarla se abren las acciones (llamar, WhatsApp, completar…).
export function AppointmentCard({ appointment: a, highlight, visits, reviewUrl = '' }: Props) {
  const [open, setOpen] = useState(!!highlight)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [reminded, setReminded] = useState(false)
  const status = statusStyle[a.status]
  const phone = a.client?.telefono
  const done = a.status !== 'confirmada'
  const panelId = `acciones-${a.id}`
  const review = phone && a.client ? generateWhatsAppReviewLink(phone, a.client.nombre, reviewUrl) : null

  function setStatus(next: AppointmentStatus) {
    setError(null)
    startTransition(async () => {
      const result = await updateAppointmentStatus(a.id, next)
      if (!result.ok) setError(result.error)
      else if (next !== 'confirmada') setOpen(false)
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
    <li className={`rounded-card border bg-surface transition duration-200 ${highlight ? 'border-primary shadow-glow' : 'border-border'} ${done ? 'opacity-75' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="grid w-full grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left"
      >
        <span className="grid">
          <span className="font-display text-xl tabular-nums leading-none">{formatTime(a.start_time)}</span>
          <span className="mt-1 text-xs tabular-nums text-muted">{formatTime(a.end_time)}</span>
        </span>
        <span className="min-w-0">
          {highlight && <span className="eyebrow block text-[10px] text-primary">{highlight}</span>}
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate font-semibold">{a.client?.nombre ?? 'Cliente'}</span>
            {visits === 0 && <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">Nuevo</span>}
          </span>
          <span className="block truncate text-sm text-muted">
            {a.service?.nombre}
            {a.service && <span className="hidden sm:inline"> · {servicePrice(a.service.precio)}</span>} · {a.barber?.nombre}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${status.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden />
            {status.text}
          </span>
          <ChevronDownIcon className={`text-muted transition duration-200 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div id={panelId} className="grid grid-cols-2 gap-2 border-t border-border px-4 py-3 sm:grid-cols-4">
          {phone && (
            <a href={`tel:${phone}`} className="btn-ghost h-10">
              <PhoneIcon /> Llamar
            </a>
          )}
          {phone && a.client && (
            <a href={generateWhatsAppReminderLink(phone, a.client.nombre, a.start_time)} target="_blank" rel="noopener noreferrer" className="btn-ghost h-10">
              <ChatIcon className="text-whatsapp" /> WhatsApp
            </a>
          )}
          {a.status === 'confirmada' ? (
            <>
              <button type="button" disabled={pending} onClick={() => setStatus('completada')} className="btn h-10 whitespace-nowrap border border-success/40 bg-success/15 px-2 text-success hover:bg-success/25">
                <CheckIcon /> Hecha
              </button>
              <button type="button" disabled={pending} onClick={() => setStatus('no_presentado')} className="btn h-10 whitespace-nowrap border border-danger/40 bg-danger/10 px-2 text-danger hover:bg-danger/20">
                <XIcon /> No vino
              </button>
              {new Date(a.start_time).getTime() > Date.now() && (
                <button type="button" disabled={pending || reminded} onClick={remind} className="btn-ghost col-span-2 h-10 sm:col-span-4">
                  {reminded ? <><CheckIcon className="text-success" /> Aviso enviado</> : <><BellIcon /> Enviar recordatorio al móvil</>}
                </button>
              )}
            </>
          ) : (
            <button type="button" disabled={pending} onClick={() => setStatus('confirmada')} className="btn-ghost col-span-2 h-10">
              Deshacer
            </button>
          )}
          {a.status === 'completada' && review && (
            <a href={review} target="_blank" rel="noopener noreferrer" className="btn-ghost h-10">
              <StarIcon className="text-accent" /> Pedir reseña
            </a>
          )}
          {a.client && (
            <Link href={`/dashboard/clientes/${a.client.id}`} className="btn-ghost h-10">
              <UsersIcon /> Ficha{visits ? ` · ${visits} ${visits === 1 ? 'visita' : 'visitas'}` : ''}
            </Link>
          )}
          {error && <p role="alert" className="col-span-2 text-sm text-danger sm:col-span-4">{error}</p>}
        </div>
      )}
    </li>
  )
}
