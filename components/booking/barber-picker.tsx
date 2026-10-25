/* eslint-disable @next/next/no-img-element */
import type { Barber } from '@/types/database'

type Props = { barbers: Barber[]; selectedId: string | null; onSelect: (b: Barber) => void }

export function BarberPicker({ barbers, selectedId, onSelect }: Props) {
  return (
    <div role="radiogroup" aria-label="Barbero" className="grid grid-cols-2 gap-3">
      {barbers.map((b) => {
        const selected = b.id === selectedId
        return (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(b)}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition ${
              selected ? 'border-brand bg-brand/15' : 'border-white/10 hover:border-white/25'
            }`}
          >
            {b.avatar_url ? (
              <img src={b.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/30 text-2xl font-semibold">
                {b.nombre.charAt(0)}
              </span>
            )}
            <span className="font-medium">{b.nombre}</span>
            {b.especialidad && <span className="text-xs text-neutral-400">{b.especialidad}</span>}
          </button>
        )
      })}
    </div>
  )
}
