'use client'

import { useMemo } from 'react'
import { addDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { siteConfig, type Weekday } from '@/config/site'
import { toLocal } from '@/lib/format'

type Props = { selected: string | null; onSelect: (dateKey: string) => void }

// Tira de días en la zona horaria del local (no la del móvil).
export function DatePicker({ selected, onSelect }: Props) {
  const days = useMemo(() => {
    const today = toLocal(new Date())
    return Array.from({ length: siteConfig.bookingWindowDays + 1 }, (_, i) => {
      const d = addDays(today, i)
      return {
        key: format(d, 'yyyy-MM-dd'),
        top: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : format(d, 'EEE', { locale: es }),
        day: format(d, 'd'),
        month: format(d, 'MMM', { locale: es }),
        closed: siteConfig.businessHours[d.getDay() as Weekday].length === 0,
      }
    })
  }, [])

  return (
    <div role="radiogroup" aria-label="Día" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
      {days.map((d) => {
        const isSelected = d.key === selected
        return (
          <button
            key={d.key}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${d.top} ${d.day} ${d.month}${d.closed ? ', cerrado' : ''}`}
            disabled={d.closed}
            onClick={() => onSelect(d.key)}
            className={`flex w-16 shrink-0 flex-col items-center rounded-2xl border py-3 transition disabled:cursor-not-allowed disabled:opacity-30 ${
              isSelected ? 'border-brand bg-brand text-white shadow-lg shadow-brand/30' : 'border-white/10 bg-white/[0.03] hover:border-white/25'
            }`}
          >
            <span className={`text-[11px] font-medium first-letter:uppercase ${isSelected ? 'text-white/90' : 'text-neutral-400'}`}>{d.top}</span>
            <span className="text-xl font-semibold tabular-nums">{d.day}</span>
            <span className={`text-[11px] first-letter:uppercase ${isSelected ? 'text-white/90' : 'text-neutral-500'}`}>{d.closed ? 'Cerrado' : d.month}</span>
          </button>
        )
      })}
    </div>
  )
}
