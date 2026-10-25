'use client'

import { useState, useTransition } from 'react'
import { updateAppointmentStatus } from '@/actions/appointments'
import { formatPrice, formatTime } from '@/lib/format'
import { generateWhatsAppReminderLink } from '@/lib/whatsapp'
import type { AppointmentStatus, AppointmentWithRelations } from '@/types/database'

const statusLabel: Record<AppointmentStatus, { text: string; className: string }> = {
  confirmada: { text: 'Confirmada', className: 'bg-brand/20 text-white' },
  completada: { text: 'Completada', className: 'bg-emerald-500/20 text-emerald-300' },
  no_presentado: { text: 'No presentado', className: 'bg-red-500/20 text-red-300' },
  cancelada: { text: 'Cancelada', className: 'bg-neutral-500/20 text-neutral-300' },
}

export function AppointmentCard({ appointment: a }: { appointment: AppointmentWithRelations }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const status = statusLabel[a.status]
  const phone = a.client?.telefono

  function setStatus(next: AppointmentStatus) {
    setError(null)
    startTransition(async () => {
      const result = await updateAppointmentStatus(a.id, next)
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tabular-nums">
            {formatTime(a.start_time)}
            <span className="ml-1 text-sm font-normal text-neutral-400">– {formatTime(a.end_time)}</span>
          </p>
          <p className="mt-1 font-medium">{a.client?.nombre ?? 'Cliente'}</p>
          <p className="text-sm text-neutral-400">
            {a.service?.nombre}
            {a.service ? ` · ${formatPrice(a.service.precio)}` : ''} · {a.barber?.nombre}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${status.className}`}>{status.text}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {phone && (
          <a href={`tel:${phone}`} className="rounded-lg border border-white/15 py-2.5 text-center">
            📞 Llamar
          </a>
        )}
        {phone && a.client && (
          <a
            href={generateWhatsAppReminderLink(phone, a.client.nombre, a.start_time)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-[#25D366] py-2.5 text-center font-semibold text-black"
          >
            Recordatorio
          </a>
        )}
        {a.status === 'confirmada' ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => setStatus('completada')}
              className="rounded-lg bg-emerald-600 py-2.5 font-semibold text-white disabled:opacity-60"
            >
              ✓ Completado
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setStatus('no_presentado')}
              className="rounded-lg bg-red-600/80 py-2.5 font-semibold text-white disabled:opacity-60"
            >
              ✗ No presentado
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => setStatus('confirmada')}
            className="col-span-2 rounded-lg border border-white/15 py-2.5 disabled:opacity-60"
          >
            Deshacer
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </article>
  )
}
