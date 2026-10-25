import { formatTime } from '@/lib/format'

type Props = {
  slots: string[] | null
  loading: boolean
  error: string | null
  selected: string | null
  onSelect: (iso: string) => void
}

export function SlotGrid({ slots, loading, error, selected, onSelect }: Props) {
  if (loading) return <p className="text-sm text-neutral-400" aria-live="polite">Buscando horas libres…</p>
  if (error) return <p className="text-sm text-red-300" role="alert">{error}</p>
  if (!slots) return null
  if (!slots.length) return <p className="text-sm text-neutral-400">No quedan horas libres este día. Prueba otro.</p>

  return (
    <div role="radiogroup" aria-label="Hora" className="grid grid-cols-4 gap-2">
      {slots.map((iso) => {
        const isSelected = iso === selected
        return (
          <button
            key={iso}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(iso)}
            className={`rounded-lg border py-2.5 text-sm font-medium tabular-nums transition ${
              isSelected ? 'border-brand bg-brand text-white' : 'border-white/10 hover:border-white/30'
            }`}
          >
            {formatTime(iso)}
          </button>
        )
      })}
    </div>
  )
}
