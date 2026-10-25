import { formatTime, toLocal } from '@/lib/format'
import { CalendarIcon } from '@/components/icons'

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
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="skeleton h-12" />
        ))}
      </div>
    )
  if (error)
    return (
      <p className="rounded-card border border-danger/30 bg-danger/10 p-4 text-sm text-danger" role="alert">
        {error}
      </p>
    )
  if (!slots) return null
  if (!slots.length)
    return (
      <div className="grid justify-items-center gap-2 rounded-card border border-dashed border-border p-6 text-center">
        <CalendarIcon className="text-2xl text-muted" />
        <p className="font-semibold">Este día ya está completo</p>
        <p className="text-sm text-muted">Prueba con otro día; seguro que te encontramos hueco.</p>
      </div>
    )

  return (
    <div role="radiogroup" aria-label="Hora" className="grid gap-5">
      {groups.map((g) => {
        const list = slots.filter((iso) => g.test(toLocal(iso).getHours()))
        if (!list.length) return null
        return (
          <div key={g.label} className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{g.label}</p>
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
                    className={`h-12 rounded-btn border text-base font-semibold tabular-nums transition duration-150 ${
                      isSelected ? 'border-primary bg-primary text-on-primary shadow-glow' : 'border-border bg-surface hover:border-primary/50'
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
