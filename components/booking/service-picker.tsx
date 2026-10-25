import type { Service } from '@/types/database'
import { formatPrice } from '@/lib/format'

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
            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
              selected ? 'border-brand bg-brand/15' : 'border-white/10 hover:border-white/25'
            }`}
          >
            <span>
              <span className="block font-medium">{s.nombre}</span>
              <span className="text-xs text-neutral-400">{s.duracion_min} min</span>
            </span>
            <span className="font-semibold">{formatPrice(s.precio)}</span>
          </button>
        )
      })}
    </div>
  )
}
