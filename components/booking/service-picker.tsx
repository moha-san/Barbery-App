import type { Service } from '@/types/database'
import { formatPrice } from '@/lib/format'
import { CheckIcon, ClockIcon } from '@/components/icons'

type Props = { services: Service[]; selectedId: string | null; onSelect: (s: Service) => void }

export function ServicePicker({ services, selectedId, onSelect }: Props) {
  return (
    <div role="radiogroup" aria-label="Servicio" className="grid gap-3">
      {services.map((s) => {
        const selected = s.id === selectedId
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(s)}
            className={`group flex min-h-[5.5rem] items-center gap-4 rounded-card border p-4 text-left transition duration-200 sm:p-5 ${
              selected ? 'border-primary bg-primary/10 shadow-glow' : 'border-border bg-surface shadow-soft hover:-translate-y-0.5 hover:border-primary/40'
            }`}
          >
            <span
              aria-hidden
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-sm transition duration-200 ${
                selected ? 'border-primary bg-primary text-on-primary' : 'border-border text-transparent group-hover:border-primary/50'
              }`}
            >
              <CheckIcon />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold leading-snug">{s.nombre}</span>
              <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-text/5 px-2 py-0.5 text-xs font-medium text-muted">
                <ClockIcon /> {s.duracion_min} min
              </span>
            </span>
            <span className="font-display shrink-0 text-2xl tabular-nums text-primary">{formatPrice(s.precio)}</span>
          </button>
        )
      })}
    </div>
  )
}
