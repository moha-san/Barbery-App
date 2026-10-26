import 'server-only'
import { cache } from 'react'
import { addDays } from 'date-fns'
import { TZDate } from '@date-fns/tz'
import { siteConfig } from '@/config/site'
import { computeSlots, type BusyRange } from '@/lib/slots'
import { parseWeekHours, type WeekHours } from '@/lib/hours'
import { localDateKey } from '@/lib/format'
import { createAdminClient } from '@/lib/supabase/server'
import type { GalleryPhoto } from '@/types/database'

export type ShopSettings = { hours: WeekHours; heroUrl: string; logoUrl: string | null }

// Ajustes que el dueño cambia en el panel. Si la tabla aún no existe, se usan los de config/site.ts.
export const getShopSettings = cache(async (): Promise<ShopSettings> => {
  const fallback: ShopSettings = {
    hours: parseWeekHours(null, siteConfig.businessHours),
    heroUrl: siteConfig.theme.heroImage,
    logoUrl: siteConfig.theme.logo,
  }
  try {
    const { data, error } = await createAdminClient().from('shop_settings').select('*').eq('id', 1).maybeSingle()
    if (error || !data) return fallback
    return {
      hours: parseWeekHours(data.business_hours, siteConfig.businessHours),
      heroUrl: data.hero_url || fallback.heroUrl,
      logoUrl: data.logo_url || fallback.logoUrl,
    }
  } catch {
    return fallback
  }
})

export const getGallery = cache(async (): Promise<GalleryPhoto[]> => {
  try {
    const { data } = await createAdminClient().from('gallery_photos').select('*').order('created_at', { ascending: false }).limit(24)
    return data ?? []
  } catch {
    return []
  }
})

export function dayBounds(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const start = new TZDate(y, m - 1, d, 0, 0, siteConfig.timezone)
  return { start, end: addDays(start, 1) }
}

type Busy = BusyRange & { barberId: string | null }

// Citas y bloqueos (días libres, descansos) entre dos instantes. barberId null = bloquea a todos.
async function busyBetween(from: Date, to: Date, barberId?: string): Promise<Busy[]> {
  const supabase = createAdminClient()
  let appts = supabase
    .from('appointments')
    .select('barber_id, start_time, end_time')
    .neq('status', 'cancelada')
    .lt('start_time', to.toISOString())
    .gt('end_time', from.toISOString())
  if (barberId) appts = appts.eq('barber_id', barberId)
  let blocks = supabase.from('time_off').select('barber_id, start_time, end_time').lt('start_time', to.toISOString()).gt('end_time', from.toISOString())
  if (barberId) blocks = blocks.or(`barber_id.is.null,barber_id.eq.${barberId}`)

  const [a, b] = await Promise.all([appts, blocks])
  if (a.error) throw new Error(a.error.message)
  // Si la tabla de bloqueos aún no existe (SQL sin pegar), se reserva igual sin ellos.
  const busy: Busy[] = a.data.map((r) => ({ barberId: r.barber_id, start: r.start_time, end: r.end_time }))
  for (const r of b.data ?? []) busy.push({ barberId: r.barber_id, start: r.start_time, end: r.end_time })
  return busy
}

const forBarber = (busy: Busy[], barberId: string) => busy.filter((x) => x.barberId === null || x.barberId === barberId)

// Huecos libres de un barbero en un día ("YYYY-MM-DD" en la zona del local).
export async function freeSlots(date: string, barberId: string, durationMin: number): Promise<string[]> {
  const { start, end } = dayBounds(date)
  const [{ hours }, busy] = await Promise.all([getShopSettings(), busyBetween(start, end, barberId)])
  return computeSlots({
    date,
    windowsByWeekday: hours,
    timezone: siteConfig.timezone,
    durationMin,
    stepMin: siteConfig.slotStepMin,
    busy: forBarber(busy, barberId),
    now: new Date(),
  })
}

// Primer hueco libre de cualquier barbero en los próximos días, para enseñarlo en la portada.
export async function nextFreeSlot(barberIds: string[], durationMin: number, days = 14): Promise<string | null> {
  if (!barberIds.length) return null
  try {
    const today = localDateKey(new Date())
    const { start } = dayBounds(today)
    const [{ hours }, busy] = await Promise.all([getShopSettings(), busyBetween(start, addDays(start, days))])
    for (let i = 0; i < days; i++) {
      const date = localDateKey(new Date(addDays(start, i).getTime() + 12 * 3_600_000))
      let best: string | null = null
      for (const id of barberIds) {
        const [first] = computeSlots({
          date,
          windowsByWeekday: hours,
          timezone: siteConfig.timezone,
          durationMin,
          stepMin: siteConfig.slotStepMin,
          busy: forBarber(busy, id),
          now: new Date(),
        })
        if (first && (!best || first < best)) best = first
      }
      if (best) return best
    }
  } catch (e) {
    console.error('[nextFreeSlot]', e)
  }
  return null
}
