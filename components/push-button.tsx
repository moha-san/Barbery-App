'use client'

import { useEffect, useState } from 'react'
import { saveClientSubscription, saveStaffSubscription, type PushSubscriptionInput } from '@/actions/push'
import { currentSubscription, pushSupport, subscribeToPush, type PushSupport } from '@/lib/push-client'
import { BellIcon, CheckIcon } from '@/components/icons'

type Props =
  | { kind: 'staff'; label: string; doneLabel: string; className?: string }
  | { kind: 'client'; appointmentId: string; label: string; doneLabel: string; className?: string }

// Botón "Activar avisos". En iPhone sin instalar explica cómo instalar la app primero.
export function PushButton(props: Props) {
  const [support, setSupport] = useState<PushSupport | null>(null)
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSupport(pushSupport())
    // En el panel, si este móvil ya los tiene activados, se dice directamente.
    if (props.kind === 'staff') void currentSubscription().then((s) => s && setState('done'))
  }, [props.kind])

  if (support === null || support === 'unsupported') return null

  if (support === 'ios-install') {
    return (
      <p className="flex items-start gap-2 rounded-card border border-border bg-surface p-3 text-left text-sm text-muted">
        <BellIcon className="mt-0.5 shrink-0 text-primary" />
        <span>
          Para recibir avisos en iPhone, instala la app: toca <strong className="text-text">Compartir</strong> y luego{' '}
          <strong className="text-text">Añadir a pantalla de inicio</strong>. Ábrela desde allí.
        </span>
      </p>
    )
  }

  if (state === 'done') {
    return (
      <p className={`flex items-center justify-center gap-2 text-sm text-success ${props.className ?? ''}`}>
        <CheckIcon /> {props.doneLabel}
      </p>
    )
  }

  async function activate() {
    setState('busy')
    setError(null)
    try {
      const res = await subscribeToPush()
      if (!res.ok) throw new Error(res.error)
      const sub = res.sub as PushSubscriptionInput
      const saved = props.kind === 'staff' ? await saveStaffSubscription(sub) : await saveClientSubscription(props.appointmentId, sub)
      if (!saved.ok) throw new Error(saved.error)
      setState('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron activar los avisos')
      setState('idle')
    }
  }

  return (
    <div className="grid gap-1">
      <button type="button" onClick={activate} disabled={state === 'busy'} className={props.className ?? 'btn-ghost h-11'}>
        <BellIcon /> {state === 'busy' ? 'Activando…' : props.label}
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
