'use client'

import { useState, useTransition } from 'react'
import { saveClientNotes } from '@/actions/clients'
import { CheckIcon } from '@/components/icons'

export function ClientNotes({ id, initial }: { id: string; initial: string }) {
  const [value, setValue] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const dirty = value.trim() !== saved.trim()

  function save() {
    setError(null)
    startTransition(async () => {
      const r = await saveClientNotes(id, value)
      if (r.ok) setSaved(value)
      else setError(r.error)
    })
  }

  return (
    <div className="grid gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={1000}
        rows={4}
        placeholder="Ej.: degradado bajo, del 1 al 3. Le gusta hablar de fútbol."
        aria-label="Notas del cliente"
        className="field h-auto py-3"
      />
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending || !dirty} className="btn-primary h-10">
          {pending ? 'Guardando…' : 'Guardar notas'}
        </button>
        {!dirty && saved && !pending && (
          <span className="flex items-center gap-1 text-sm text-success">
            <CheckIcon /> Guardado
          </span>
        )}
        {error && <span role="alert" className="text-sm text-danger">{error}</span>}
      </div>
    </div>
  )
}
