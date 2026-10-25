import type { Service } from '@/types/database'
import { formatPrice } from '@/lib/format'
import { ClockIcon } from '@/components/icons'

type Props = { services: Service[]; selectedId: string | null; onSelect: (s: Service) => void }

export function ServicePicker({ services, selectedId, onSelect }: Props) {
  return (
    <div role="radiogroup" aria-label="Servicio" className="grid gap-2">
      {services.map((s) => {
        const selected = s.id === selectedId
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(s)}
            className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
              selected ? 'border-brand bg-brand/15 ring-1 ring-brand' : 'border-white/10 bg-white/[0.03] hover:border-white/25'
            }`}
          >
            <span>
              <span className="block font-medium">{s.nombre}</span>
              <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-neutral-400">
                <ClockIcon /> {s.duracion_min} min
              </span>
            </span>
            <span className="text-lg font-semibold tabular-nums">{formatPrice(s.precio)}</span>
          </button>
        )
      })}
    </div>
  )
}
