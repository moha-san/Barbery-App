/* eslint-disable @next/next/no-img-element */
import type { Barber } from '@/types/database'

type Props = { barbers: Barber[]; selectedId: string | null; onSelect: (b: Barber) => void }

export function BarberPicker({ barbers, selectedId, onSelect }: Props) {
  return (
    <div role="radiogroup" aria-label="Barbero" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {barbers.map((b) => {
        const selected = b.id === selectedId
        return (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(b)}
            className={`flex flex-col items-center gap-3 rounded-card border p-5 text-center transition duration-200 ${
              selected ? 'border-primary bg-primary/10 shadow-glow' : 'border-border bg-surface shadow-soft hover:-translate-y-0.5 hover:border-primary/40'
            }`}
          >
            <span className={`rounded-full p-1 transition duration-200 ${selected ? 'ring-2 ring-primary' : 'ring-1 ring-border'}`}>
              {b.avatar_url ? (
                <img src={b.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <span className="font-display grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-primary/30 to-accent/10 text-2xl text-text">
                  {b.nombre.charAt(0)}
                </span>
              )}
            </span>
            <span>
              <span className="block font-semibold">{b.nombre}</span>
              {b.especialidad && <span className="mt-0.5 block text-xs text-muted">{b.especialidad}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
