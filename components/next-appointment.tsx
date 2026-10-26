'use client'

import { useEffect, useState, useTransition } from 'react'
import { cancelMyAppointment } from '@/actions/appointments'
import { formatDateLong, formatTime } from '@/lib/format'
import { shopWhatsAppLink } from '@/lib/whatsapp'
import { CalendarIcon, XIcon } from '@/components/icons'

export const MY_APPOINTMENT_KEY = 'mi-cita'
export const CLIENT_KEY = 'reserva-cliente'
// Evento que avisa al formulario de reserva de que el cliente quiere cambiar su cita.
export const RESCHEDULE_EVENT = 'cambiar-cita'

// id, serviceId y barberId faltan en citas guardadas antes de poder cancelar desde la app.
export type MyAppointment = { start: string; servicio: string; barbero: string; id?: string; serviceId?: string; barberId?: string }

// Guarda en este móvil la última cita reservada, para recordarla al volver a entrar.
export function rememberAppointment(cita: MyAppointment | null) {
  try {
    if (cita) localStorage.setItem(MY_APPOINTMENT_KEY, JSON.stringify(cita))
    else localStorage.removeItem(MY_APPOINTMENT_KEY)
  } catch {}
  window.dispatchEvent(new Event('mi-cita-cambiada'))
}

function readAppointment(): MyAppointment | null {
  try {
    const raw = localStorage.getItem(MY_APPOINTMENT_KEY)
    const saved = raw ? (JSON.parse(raw) as MyAppointment) : null
    if (saved && new Date(saved.start).getTime() > Date.now()) return saved
    if (saved) localStorage.removeItem(MY_APPOINTMENT_KEY)
  } catch {}
  return null
}

export function savedPhone(): string {
  try {
    return (JSON.parse(localStorage.getItem(CLIENT_KEY) ?? '{}') as { telefono?: string }).telefono ?? ''
  } catch {
    return ''
  }
}

// Franja "Tu próxima cita" bajo la cabecera, con botones para cambiarla o cancelarla.
export function NextAppointment() {
  const [cita, setCita] = useState<MyAppointment | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const load = () => setCita(readAppointment())
    load()
    window.addEventListener('mi-cita-cambiada', load)
    return () => window.removeEventListener('mi-cita-cambiada', load)
  }, [])

  if (message) {
    return (
      <div role="status" className="mx-auto mt-3 flex max-w-6xl animate-fade-up items-center gap-3 rounded-card border border-border bg-surface p-3 text-sm">
        <p className="min-w-0 flex-1">{message}</p>
        <button type="button" onClick={() => setMessage(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:text-text" aria-label="Cerrar">
          <XIcon />
        </button>
      </div>
    )
  }
  if (!cita) return null

  const cuando = `${formatDateLong(cita.start)} a las ${formatTime(cita.start)}`
  const canManage = !!cita.id && !!savedPhone()
  const whatsapp = shopWhatsAppLink(`Hola, tengo cita el ${cuando} y necesito cambiarla.`)

  function cancel() {
    if (!cita?.id) return
    setError(null)
    startTransition(async () => {
      const result = await cancelMyAppointment(cita.id!, savedPhone())
      if (!result.ok) return setError(result.error)
      rememberAppointment(null)
      setConfirming(false)
      setMessage('Cita cancelada. El hueco queda libre para otra persona. ¡Gracias por avisar!')
    })
  }

  function change() {
    if (!cita) return
    window.dispatchEvent(new CustomEvent<MyAppointment>(RESCHEDULE_EVENT, { detail: cita }))
    document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="mx-auto mt-3 max-w-6xl animate-fade-up rounded-card border border-primary/40 bg-primary/10 p-3 text-sm">
      <div className="flex items-start gap-3">
        <CalendarIcon className="mt-0.5 shrink-0 text-lg text-primary" />
        <p className="min-w-0 flex-1">
          <span className="font-semibold">Tu próxima cita: </span>
          <span className="first-letter:uppercase">{cuando}</span>
          <span className="text-muted">
            {' '}
            · {cita.servicio} con {cita.barbero}
          </span>
        </p>
      </div>
      {confirming ? (
        <div className="mt-3 grid gap-2 sm:flex sm:items-center">
          <p className="font-semibold sm:flex-1">¿Seguro que quieres cancelarla?</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirming(false)} className="btn-ghost h-10">
              No, mantener
            </button>
            <button type="button" disabled={pending} onClick={cancel} className="btn h-10 border border-danger/40 bg-danger/10 text-danger">
              {pending ? 'Cancelando…' : 'Sí, cancelar'}
            </button>
          </div>
        </div>
      ) : canManage ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button type="button" onClick={change} className="btn-ghost h-10">
            Cambiar hora
          </button>
          <button type="button" onClick={() => setConfirming(true)} className="btn-ghost h-10 text-danger">
            Cancelar cita
          </button>
        </div>
      ) : (
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold underline underline-offset-4">
          Cambiarla por WhatsApp
        </a>
      )}
      {error && (
        <p role="alert" className="mt-2 text-danger">
          {error}{' '}
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">
            WhatsApp
          </a>
        </p>
      )}
    </div>
  )
}
