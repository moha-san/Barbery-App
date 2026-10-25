'use client'

import { DayPicker } from 'react-day-picker'
import { es } from 'react-day-picker/locale'
import { addDays, startOfDay } from 'date-fns'
import 'react-day-picker/style.css'
import { siteConfig, type Weekday } from '@/config/site'

type Props = { selected: Date | undefined; onSelect: (d: Date | undefined) => void }

const closedWeekdays = (Object.keys(siteConfig.businessHours) as unknown as Weekday[])
  .map(Number)
  .filter((d) => siteConfig.businessHours[d as Weekday].length === 0)

export function DatePicker({ selected, onSelect }: Props) {
  const today = startOfDay(new Date())
  const last = addDays(today, siteConfig.bookingWindowDays)
  return (
    <div className="flex justify-center rounded-xl border border-white/10 p-2">
      <DayPicker
        mode="single"
        locale={es}
        weekStartsOn={1}
        selected={selected}
        onSelect={onSelect}
        startMonth={today}
        endMonth={last}
        disabled={[{ before: today }, { after: last }, { dayOfWeek: closedWeekdays }]}
      />
    </div>
  )
}
