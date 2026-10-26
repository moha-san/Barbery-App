'use client'

import { useEffect, useState } from 'react'
import { formatDateLong, formatTime } from '@/lib/format'
import { shopWhatsAppLink } from '@/lib/whatsapp'
import { CalendarIcon, XIcon } from '@/components/icons'

export const MY_APPOINTMENT_KEY = 'mi-cita'

export type MyAppointment = { start: string; servicio: string; barbero: string }

// Guarda en este móvil la última cita reservada, para recordarla al volver a entrar.
export function rememberAppointment(cita: MyAppointment) {
  try {
    localStorage.setItem(MY_APPOINTMENT_KEY, JSON.stringify(cita))
  } catch {}
}

// Franja "Tu próxima cita" bajo la cabecera, solo si la cita aún no ha pasado.
export function NextAppointment() {
  const [cita, setCita] = useState<MyAppointment | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MY_APPOINTMENT_KEY)
      const saved = raw ? (JSON.parse(raw) as MyAppointment) : null
      if (saved && new Date(saved.start).getTime() > Date.now()) setCita(saved)
      else if (saved) localStorage.removeItem(MY_APPOINTMENT_KEY)
    } catch {}
  }, [])

  if (!cita) return null

  const cuando = `${formatDateLong(cita.start)} a las ${formatTime(cita.start)}`
  const hide = () => {
    setCita(null)
    try {
      localStorage.removeItem(MY_APPOINTMENT_KEY)
    } catch {}
  }

  return (
    <div className="mx-auto mt-3 flex max-w-6xl animate-fade-up items-center gap-3 rounded-card border border-primary/40 bg-primary/10 p-3 text-sm">
      <CalendarIcon className="shrink-0 text-lg text-primary" />
      <p className="min-w-0 flex-1">
        <span className="font-semibold">Tu próxima cita: </span>
        <span className="first-letter:uppercase">{cuando}</span>
        <span className="text-muted">
          {' '}
          · {cita.servicio} con {cita.barbero}
        </span>
        {' · '}
        <a
          href={shopWhatsAppLink(`Hola, tengo cita el ${cuando} y necesito cambiarla.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline underline-offset-4"
        >
          Cambiarla
        </a>
      </p>
      <button type="button" onClick={hide} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:text-text" aria-label="Ocultar aviso de la cita">
        <XIcon />
      </button>
    </div>
  )
}
