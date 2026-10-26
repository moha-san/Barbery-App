'use client'

import { useEffect, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { TZDate } from '@date-fns/tz'
import { siteConfig } from '@/config/site'
import { quickBook, staffSlots } from '@/actions/clients'
import { formatTime, toLocal, servicePrice } from '@/lib/format'

type Props = {
  barbers: { id: string; nombre: string }[]
  services: { id: string; nombre: string; duracion_min: number; precio: number }[]
  initial: { fecha: string; barberId: string | null; nombre: string; telefono: string }
  today: string
}

const chip = (active: boolean) =>
  `btn h-11 rounded-full border px-4 ${active ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface text-text hover:border-primary/50'}`

// Hora local "HH:mm" redondeada al siguiente cuarto de hora (para "Ahora").
function nowRounded(): string {
  const d = toLocal(new Date())
  const mins = Math.ceil((d.getHours() * 60 + d.getMinutes()) / 15) * 15
  return `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

export function QuickBookForm({ barbers, services, initial, today }: Props) {
  const router = useRouter()
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '')
  const [barberId, setBarberId] = useState(barbers.find((b) => b.id === initial.barberId)?.id ?? barbers[0]?.id ?? '')
  const [fecha, setFecha] = useState(initial.fecha)
  const [hora, setHora] = useState('')
  const [slots, setSlots] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let alive = true
    setSlots(null)
    staffSlots(fecha, barberId, serviceId).then((r) => alive && setSlots(r.ok ? r.data : []))
    return () => {
      alive = false
    }
  }, [fecha, barberId, serviceId])

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    if (!hora) return setError('Elige la hora')
    const [y, m, d] = fecha.split('-').map(Number)
    const [hh, mm] = hora.split(':').map(Number)
    const start = new TZDate(y, m - 1, d, hh, mm, siteConfig.timezone)
    setError(null)
    startTransition(async () => {
      const r = await quickBook({ barberId, serviceId, startTime: start.toISOString(), nombre: String(f.get('nombre')), telefono: String(f.get('telefono')) })
      if (r.ok) router.push(`/dashboard?fecha=${r.data.fecha}`)
      else setError(r.error)
    })
  }

  if (!services.length || !barbers.length) return <p className="mt-6 text-sm text-muted">Primero añade servicios y barberos en Ajustes.</p>

  return (
    <form onSubmit={submit} className="mt-6 grid gap-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">
          Nombre
          <input name="nombre" defaultValue={initial.nombre} required minLength={2} maxLength={100} className="field" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Teléfono
          <input name="telefono" defaultValue={initial.telefono} type="tel" required inputMode="tel" placeholder="+34 600 000 000" className="field" />
        </label>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Servicio</legend>
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <button key={s.id} type="button" onClick={() => setServiceId(s.id)} className={chip(s.id === serviceId)} aria-pressed={s.id === serviceId}>
              {s.nombre} · {servicePrice(s.precio)}
            </button>
          ))}
        </div>
      </fieldset>

      {barbers.length > 1 && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Barbero</legend>
          <div className="flex flex-wrap gap-2">
            {barbers.map((b) => (
              <button key={b.id} type="button" onClick={() => setBarberId(b.id)} className={chip(b.id === barberId)} aria-pressed={b.id === barberId}>
                {b.nombre}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5 text-sm font-medium">
          Día
          <input type="date" value={fecha} min={today} onChange={(e) => e.target.value && setFecha(e.target.value)} required className="field" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Hora
          <input type="time" value={hora} step={300} onChange={(e) => setHora(e.target.value)} required className="field" />
        </label>
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-medium">Huecos libres</p>
        <div className="flex flex-wrap gap-2">
          {fecha === today && (
            <button type="button" onClick={() => setHora(nowRounded())} className={chip(false)}>
              Ahora
            </button>
          )}
          {slots === null && <span className="skeleton h-11 w-40" />}
          {slots?.map((iso) => (
            <button key={iso} type="button" onClick={() => setHora(formatTime(iso))} className={`${chip(formatTime(iso) === hora)} tabular-nums`}>
              {formatTime(iso)}
            </button>
          ))}
          {slots && !slots.length && <span className="self-center text-sm text-muted">No quedan huecos en horario. Puedes poner la hora a mano.</span>}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-btn border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      <button disabled={pending} className="btn-primary h-14 text-base">
        {pending ? 'Guardando…' : 'Guardar cita'}
      </button>
    </form>
  )
}
