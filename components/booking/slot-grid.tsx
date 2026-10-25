import { formatTime, toLocal } from '@/lib/format'

type Props = {
  slots: string[] | null
  loading: boolean
  error: string | null
  selected: string | null
  onSelect: (iso: string) => void
}

const groups = [
  { label: 'Mañana', test: (h: number) => h < 14 },
  { label: 'Tarde', test: (h: number) => h >= 14 },
]

export function SlotGrid({ slots, loading, error, selected, onSelect }: Props) {
  if (loading)
    return (
      <div className="grid grid-cols-4 gap-2" aria-live="polite" aria-label="Buscando horas libres">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    )
  if (error) return <p className="text-sm text-red-300" role="alert">{error}</p>
  if (!slots) return null
  if (!slots.length)
    return <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-neutral-400">No quedan horas libres este día. Prueba otro.</p>

  return (
    <div role="radiogroup" aria-label="Hora" className="grid gap-4">
      {groups.map((g) => {
        const list = slots.filter((iso) => g.test(toLocal(iso).getHours()))
        if (!list.length) return null
        return (
          <div key={g.label} className="grid gap-2">
            <p className="text-xs font-medium text-neutral-400">{g.label}</p>
            <div className="grid grid-cols-4 gap-2">
              {list.map((iso) => {
                const isSelected = iso === selected
                return (
                  <button
                    key={iso}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => onSelect(iso)}
                    className={`h-11 rounded-xl border text-sm font-semibold tabular-nums transition ${
                      isSelected ? 'border-brand bg-brand text-white' : 'border-white/10 bg-white/[0.03] hover:border-brand/60'
                    }`}
                  >
                    {formatTime(iso)}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
