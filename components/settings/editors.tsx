'use client'
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { addDays, format } from 'date-fns'
import {
  addGalleryPhoto,
  addTimeOff,
  deleteGalleryPhoto,
  deleteTimeOff,
  saveBarber,
  saveHours,
  saveReviewUrl,
  saveService,
  saveShopImage,
} from '@/actions/settings'
import type { ActionResult } from '@/actions/appointments'
import { formatDateLong, formatTime, toLocal } from '@/lib/format'
import type { WeekHours } from '@/lib/hours'
import { uploadPhoto } from '@/lib/upload-photo'
import { CheckIcon, CopyIcon, ImageIcon, PlusIcon, TrashIcon, XIcon } from '@/components/icons'
import { barberPath } from '@/lib/barber-page'
import type { Barber, GalleryPhoto, Service } from '@/types/database'

// Guarda con un botón y enseña "Guardado" o el error debajo.
function useSave() {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const run = (fn: () => Promise<ActionResult<unknown>>, okText = 'Guardado', after?: (r: ActionResult<unknown>) => void) => {
    setMsg(null)
    start(async () => {
      try {
        const r = await fn()
        setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error })
        after?.(r)
      } catch (e) {
        setMsg({ ok: false, text: e instanceof Error ? e.message : 'Algo ha fallado' })
      }
    })
  }
  const note = msg && (
    <p role={msg.ok ? 'status' : 'alert'} className={`flex items-center gap-1.5 text-sm ${msg.ok ? 'text-success' : 'text-danger'}`}>
      {msg.ok && <CheckIcon />} {msg.text}
    </p>
  )
  return { pending, run, note, setMsg }
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className="relative h-6 w-11 rounded-full bg-text/15 transition peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-primary after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-surface after:shadow after:transition peer-checked:after:translate-x-5" />
      {label}
    </label>
  )
}

export function Section({ id, title, hint, children }: { id: string; title: string; hint: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="grid scroll-mt-28 gap-4">
      <div>
        <h2 id={`${id}-t`} className="text-2xl">{title}</h2>
        <p className="mt-1 text-sm text-muted">{hint}</p>
      </div>
      {children}
    </section>
  )
}

// ─── Servicios ────────────────────────────────────────────────────────────
type ServiceDraft = { id?: string; nombre: string; duracion_min: number | string; precio: number | string; activo: boolean }

function ServiceRow({ initial, onSaved }: { initial: ServiceDraft; onSaved: () => void }) {
  const [s, setS] = useState(initial)
  const { pending, run, note } = useSave()
  const set = (patch: Partial<ServiceDraft>) => setS((v) => ({ ...v, ...patch }))
  const uid = s.id ?? 'nuevo'
  return (
    <form
      className="card grid gap-3 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        run(
          () => saveService({ ...s, duracion_min: Number(s.duracion_min), precio: Number(String(s.precio).replace(',', '.')) }),
          'Guardado',
          (r) => {
            if (r.ok) {
              set({ id: (r.data as { id: string }).id })
              onSaved()
            }
          },
        )
      }}
    >
      <label className="grid gap-1 text-sm font-medium" htmlFor={`sn-${uid}`}>
        Nombre
        <input id={`sn-${uid}`} className="field" value={s.nombre} onChange={(e) => set({ nombre: e.target.value })} placeholder="Corte clásico" required />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm font-medium" htmlFor={`sd-${uid}`}>
          Minutos
          <input id={`sd-${uid}`} className="field" type="number" inputMode="numeric" min={5} max={480} step={5} value={s.duracion_min} onChange={(e) => set({ duracion_min: e.target.value })} required />
        </label>
        <label className="grid gap-1 text-sm font-medium" htmlFor={`sp-${uid}`}>
          Precio (€)
          <input id={`sp-${uid}`} className="field" inputMode="decimal" value={s.precio} onChange={(e) => set({ precio: e.target.value })} placeholder="15" required />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Toggle checked={s.activo} onChange={(v) => set({ activo: v })} label={s.activo ? 'Se puede reservar' : 'Oculto'} />
        <button className="btn-primary h-11 px-5" disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      {note}
    </form>
  )
}

export function ServicesEditor({ services }: { services: Service[] }) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<ServiceDraft[]>(services)
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        {drafts.map((s, i) => (
          <ServiceRow key={s.id ?? `nuevo-${i}`} initial={s} onSaved={() => router.refresh()} />
        ))}
      </div>
      <button type="button" className="btn-ghost h-12" onClick={() => setDrafts((d) => [...d, { nombre: '', duracion_min: 30, precio: '', activo: true }])}>
        <PlusIcon /> Añadir servicio
      </button>
    </div>
  )
}

// ─── Barberos ─────────────────────────────────────────────────────────────
type BarberDraft = { id?: string; nombre: string; especialidad: string | null; avatar_url: string | null; activo: boolean; slug?: string | null; instagram?: string | null }

function PhotoButton({ folder, onUploaded, children, className }: { folder: 'barberos' | 'galeria' | 'local'; onUploaded: (r: { url: string; path: string }) => void; children: ReactNode; className?: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <span className="grid gap-1">
      <label className={`${className ?? 'btn-ghost h-10'} cursor-pointer ${busy ? 'pointer-events-none opacity-60' : ''}`}>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            setBusy(true)
            setError(null)
            try {
              onUploaded(await uploadPhoto(file, folder))
            } catch (err) {
              setError(err instanceof Error ? err.message : 'No se pudo subir')
            } finally {
              setBusy(false)
            }
          }}
        />
        {busy ? 'Subiendo…' : children}
      </label>
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </span>
  )
}

function BarberRow({ initial, photos, onSaved }: { initial: BarberDraft; photos: GalleryPhoto[]; onSaved: () => void }) {
  const [b, setB] = useState(initial)
  const { pending, run, note } = useSave()
  const set = (patch: Partial<BarberDraft>) => setB((v) => ({ ...v, ...patch }))
  const uid = b.id ?? 'nuevo'
  return (
    <form
      className="card grid gap-3 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        const { slug: _slug, ...fields } = b
        run(() => saveBarber({ ...fields, especialidad: b.especialidad?.trim() || null, instagram: b.instagram?.trim() || null }), 'Guardado', (r) => {
          if (r.ok) {
            const saved = r.data as { id: string; slug: string | null }
            set({ id: saved.id, slug: saved.slug ?? b.slug })
            onSaved()
          }
        })
      }}
    >
      <div className="flex items-center gap-4">
        {b.avatar_url ? (
          <img src={b.avatar_url} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-border" />
        ) : (
          <span className="font-display grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary/10 text-2xl text-primary">{b.nombre.charAt(0) || '?'}</span>
        )}
        <div className="flex flex-wrap gap-2">
          <PhotoButton folder="barberos" onUploaded={({ url }) => set({ avatar_url: url })}>
            <ImageIcon /> {b.avatar_url ? 'Cambiar foto' : 'Subir foto'}
          </PhotoButton>
          {b.avatar_url && (
            <button type="button" className="btn-ghost h-10" onClick={() => set({ avatar_url: null })}>
              Quitar
            </button>
          )}
        </div>
      </div>
      <label className="grid gap-1 text-sm font-medium" htmlFor={`bn-${uid}`}>
        Nombre
        <input id={`bn-${uid}`} className="field" value={b.nombre} onChange={(e) => set({ nombre: e.target.value })} required />
      </label>
      <label className="grid gap-1 text-sm font-medium" htmlFor={`be-${uid}`}>
        Especialidad <span className="font-normal text-muted">(opcional)</span>
        <input id={`be-${uid}`} className="field" value={b.especialidad ?? ''} onChange={(e) => set({ especialidad: e.target.value })} placeholder="Degradados y barba" />
      </label>
      <label className="grid gap-1 text-sm font-medium" htmlFor={`bi-${uid}`}>
        Instagram <span className="font-normal text-muted">(opcional)</span>
        <input id={`bi-${uid}`} className="field" value={b.instagram ?? ''} onChange={(e) => set({ instagram: e.target.value })} placeholder="@carlos.barber" autoCapitalize="none" autoCorrect="off" />
      </label>
      {b.id && <BarberPageTools id={b.id} slug={b.slug ?? null} photos={photos} onChange={onSaved} />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Toggle checked={b.activo} onChange={(v) => set({ activo: v })} label={b.activo ? 'Trabajando' : 'No aparece'} />
        <button className="btn-primary h-11 px-5" disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      {note}
    </form>
  )
}

// Enlace para la bio de Instagram y fotos de los cortes de este barbero.
function BarberPageTools({ id, slug, photos: initial, onChange }: { id: string; slug: string | null; photos: GalleryPhoto[]; onChange: () => void }) {
  const [photos, setPhotos] = useState(initial)
  const [copied, setCopied] = useState(false)
  const { run, note } = useSave()
  const path = barberPath({ id, slug })
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])
  const link = `${origin}${path}`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copia este enlace:', link)
    }
  }
  return (
    <div className="grid gap-3 rounded-btn border border-border p-3">
      <p className="text-sm font-semibold">Su página para Instagram</p>
      <div className="flex flex-wrap items-center gap-2">
        <a href={path} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm text-primary underline-offset-4 hover:underline">
          {link.replace(/^https?:\/\//, '')}
        </a>
        <button type="button" className="btn-ghost h-10" onClick={copy}>
          {copied ? <CheckIcon /> : <CopyIcon />} {copied ? 'Copiado' : 'Copiar enlace'}
        </button>
      </div>
      <p className="text-xs text-muted">Pégalo en la bio de Instagram del barbero. Sus clientes reservan directamente con él.</p>
      <div className="grid grid-cols-4 gap-2">
        {photos.map((g) => (
          <div key={g.id} className="relative">
            <img src={g.url} alt="" className="aspect-[4/5] w-full rounded-btn object-cover" />
            <button
              type="button"
              aria-label="Borrar foto"
              className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-background/90 text-danger shadow"
              onClick={() =>
                run(() => deleteGalleryPhoto(g.id), 'Foto borrada', (r) => {
                  if (r.ok) {
                    setPhotos((list) => list.filter((x) => x.id !== g.id))
                    onChange()
                  }
                })
              }
            >
              <TrashIcon />
            </button>
          </div>
        ))}
        <PhotoButton
          folder="galeria"
          className="grid aspect-[4/5] w-full place-items-center content-center gap-1 rounded-btn border border-dashed border-border text-xs text-muted hover:border-primary"
          onUploaded={({ url, path: p }) =>
            run(() => addGalleryPhoto(url, p, id), 'Foto añadida', (r) => {
              if (r.ok) {
                setPhotos((list) => [{ id: (r.data as { id: string }).id, url, path: p, barber_id: id, created_at: new Date().toISOString() }, ...list])
                onChange()
              }
            })
          }
        >
          <PlusIcon className="text-lg" /> Corte
        </PhotoButton>
      </div>
      {note}
    </div>
  )
}

export function BarbersEditor({ barbers, gallery = [] }: { barbers: Barber[]; gallery?: GalleryPhoto[] }) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<BarberDraft[]>(barbers)
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        {drafts.map((b, i) => (
          <BarberRow key={b.id ?? `nuevo-${i}`} initial={b} photos={gallery.filter((g) => g.barber_id === b.id)} onSaved={() => router.refresh()} />
        ))}
      </div>
      <button type="button" className="btn-ghost h-12" onClick={() => setDrafts((d) => [...d, { nombre: '', especialidad: null, avatar_url: null, activo: true }])}>
        <PlusIcon /> Añadir barbero
      </button>
    </div>
  )
}

// ─── Horario ──────────────────────────────────────────────────────────────
const WEEK = [1, 2, 3, 4, 5, 6, 0]
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function HoursEditor({ hours: initial }: { hours: WeekHours }) {
  const [hours, setHours] = useState<WeekHours>(initial)
  const { pending, run, note } = useSave()
  const setDay = (d: number, windows: WeekHours[number]) => setHours((h) => ({ ...h, [d]: windows }))

  return (
    <div className="card grid gap-1 p-4">
      {WEEK.map((d) => {
        const windows = hours[d] ?? []
        const open = windows.length > 0
        return (
          <div key={d} className="grid gap-2 border-b border-border py-3 last:border-0 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-start">
            <div className="flex items-center justify-between sm:block">
              <p className="font-semibold">{DAY_NAMES[d]}</p>
              <Toggle checked={open} onChange={(v) => setDay(d, v ? [{ open: '10:00', close: '20:00' }] : [])} label={open ? 'Abierto' : 'Cerrado'} />
            </div>
            {open && (
              <div className="grid gap-2">
                {windows.map((w, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input aria-label={`${DAY_NAMES[d]}, abre`} type="time" step={900} className="field h-11 w-32" value={w.open} onChange={(e) => setDay(d, windows.map((x, j) => (j === i ? { ...x, open: e.target.value } : x)))} />
                    <span className="text-muted">a</span>
                    <input aria-label={`${DAY_NAMES[d]}, cierra`} type="time" step={900} className="field h-11 w-32" value={w.close} onChange={(e) => setDay(d, windows.map((x, j) => (j === i ? { ...x, close: e.target.value } : x)))} />
                    {windows.length > 1 && (
                      <button type="button" className="grid h-11 w-11 place-items-center rounded-btn text-muted hover:text-danger" aria-label="Quitar este tramo" onClick={() => setDay(d, windows.filter((_, j) => j !== i))}>
                        <XIcon />
                      </button>
                    )}
                  </div>
                ))}
                {windows.length < 3 && (
                  <button type="button" className="w-max text-sm font-semibold text-primary underline-offset-4 hover:underline" onClick={() => setDay(d, [...windows, { open: '16:00', close: '20:00' }])}>
                    + Añadir tramo (p. ej. la tarde)
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
      <div className="flex flex-wrap items-center gap-3 pt-3">
        <button
          type="button"
          className="btn-primary h-12 px-6"
          disabled={pending}
          onClick={() => run(() => saveHours(Object.fromEntries(Object.entries(hours).map(([k, v]) => [k, v]))), 'Horario guardado')}
        >
          {pending ? 'Guardando…' : 'Guardar horario'}
        </button>
        {note}
      </div>
    </div>
  )
}

// ─── Fotos ────────────────────────────────────────────────────────────────
function ShopImage({ kind, label, url, fallback }: { kind: 'hero' | 'logo'; label: string; url: string | null; fallback: string | null }) {
  const router = useRouter()
  const [current, setCurrent] = useState(url)
  const { run, note } = useSave()
  const save = (next: string | null) =>
    run(() => saveShopImage(kind, next), next ? 'Foto guardada' : 'Foto quitada', (r) => {
      if (r.ok) {
        setCurrent(next)
        router.refresh()
      }
    })
  const shown = current ?? fallback
  return (
    <div className="card grid gap-3 p-4">
      <p className="font-semibold">{label}</p>
      {shown ? (
        <img src={shown} alt="" className={kind === 'logo' ? 'h-24 w-24 rounded-full object-cover ring-1 ring-border' : 'aspect-[16/9] w-full rounded-btn object-cover'} />
      ) : (
        <span className="grid h-24 w-24 place-items-center rounded-full bg-primary/10 text-sm text-muted">Iniciales</span>
      )}
      <div className="flex flex-wrap gap-2">
        <PhotoButton folder="local" onUploaded={({ url: u }) => save(u)}>
          <ImageIcon /> {current ? 'Cambiar' : 'Subir foto'}
        </PhotoButton>
        {current && (
          <button type="button" className="btn-ghost h-10" onClick={() => save(null)}>
            Quitar
          </button>
        )}
      </div>
      {note}
    </div>
  )
}

export function PhotosEditor({ heroUrl, logoUrl, defaultHero, gallery: initial }: { heroUrl: string | null; logoUrl: string | null; defaultHero: string; gallery: GalleryPhoto[] }) {
  const router = useRouter()
  const [gallery, setGallery] = useState(initial)
  const { run, note } = useSave()
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <ShopImage kind="hero" label="Foto de portada (el local, la fachada…)" url={heroUrl} fallback={defaultHero} />
        <ShopImage kind="logo" label="Logo" url={logoUrl} fallback={null} />
      </div>
      <div className="card grid gap-3 p-4">
        <p className="font-semibold">Galería de cortes</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {gallery.map((g) => (
            <div key={g.id} className="relative">
              <img src={g.url} alt="" className="aspect-[4/5] w-full rounded-btn object-cover" />
              <button
                type="button"
                aria-label="Borrar foto"
                className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-full bg-background/90 text-danger shadow"
                onClick={() =>
                  run(() => deleteGalleryPhoto(g.id), 'Foto borrada', (r) => {
                    if (r.ok) {
                      setGallery((list) => list.filter((x) => x.id !== g.id))
                      router.refresh()
                    }
                  })
                }
              >
                <TrashIcon />
              </button>
            </div>
          ))}
          <PhotoButton
            folder="galeria"
            className="grid aspect-[4/5] w-full place-items-center content-center gap-1 rounded-btn border border-dashed border-border text-sm text-muted hover:border-primary"
            onUploaded={({ url, path }) =>
              run(() => addGalleryPhoto(url, path), 'Foto añadida', (r) => {
                if (r.ok) {
                  setGallery((list) => [{ id: (r.data as { id: string }).id, url, path, barber_id: null, created_at: new Date().toISOString() }, ...list])
                  router.refresh()
                }
              })
            }
          >
            <PlusIcon className="text-xl" /> Añadir
          </PhotoButton>
        </div>
        {note}
      </div>
    </div>
  )
}

// ─── Días libres y descansos ──────────────────────────────────────────────
export type TimeOffRow = { id: string; barber_id: string | null; start_time: string; end_time: string; motivo: string | null; barber: { nombre: string } | null }

function describe(t: TimeOffRow): string {
  const start = toLocal(t.start_time)
  const end = toLocal(t.end_time)
  const midnight = (d: Date) => d.getHours() === 0 && d.getMinutes() === 0
  if (midnight(start) && midnight(end)) {
    const last = addDays(end, -1)
    return format(start, 'yyyy-MM-dd') === format(last, 'yyyy-MM-dd') ? `${formatDateLong(t.start_time)}, todo el día` : `Del ${formatDateLong(t.start_time)} al ${formatDateLong(last)}`
  }
  return `${formatDateLong(t.start_time)}, de ${formatTime(t.start_time)} a ${formatTime(t.end_time)}`
}

export function TimeOffEditor({ barbers, blocks, today }: { barbers: Pick<Barber, 'id' | 'nombre'>[]; blocks: TimeOffRow[]; today: string }) {
  const router = useRouter()
  const [form, setForm] = useState({ barberId: '', desde: today, hasta: today, todoElDia: true, horaInicio: '14:00', horaFin: '16:00', motivo: '' })
  const { pending, run, note } = useSave()
  const del = useSave()
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  return (
    <div className="grid gap-4">
      <form
        className="card grid gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault()
          run(() => addTimeOff({ ...form, barberId: form.barberId || null }), 'Bloqueado. Nadie podrá reservar ese hueco.', (r) => {
            if (r.ok) {
              set({ motivo: '' })
              router.refresh()
            }
          })
        }}
      >
        <label className="grid gap-1 text-sm font-medium" htmlFor="to-quien">
          ¿Quién no trabaja?
          <select id="to-quien" className="field" value={form.barberId} onChange={(e) => set({ barberId: e.target.value })}>
            <option value="">Toda la barbería (cerrado)</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-medium" htmlFor="to-desde">
            Desde
            <input id="to-desde" type="date" className="field" min={today} value={form.desde} onChange={(e) => set({ desde: e.target.value, hasta: e.target.value > form.hasta ? e.target.value : form.hasta })} required />
          </label>
          <label className="grid gap-1 text-sm font-medium" htmlFor="to-hasta">
            Hasta
            <input id="to-hasta" type="date" className="field" min={form.desde} value={form.hasta} onChange={(e) => set({ hasta: e.target.value })} required />
          </label>
        </div>
        <Toggle checked={form.todoElDia} onChange={(v) => set({ todoElDia: v })} label="Todo el día" />
        {!form.todoElDia && (
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm font-medium" htmlFor="to-hi">
              De
              <input id="to-hi" type="time" step={900} className="field" value={form.horaInicio} onChange={(e) => set({ horaInicio: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm font-medium" htmlFor="to-hf">
              A
              <input id="to-hf" type="time" step={900} className="field" value={form.horaFin} onChange={(e) => set({ horaFin: e.target.value })} />
            </label>
          </div>
        )}
        <label className="grid gap-1 text-sm font-medium" htmlFor="to-motivo">
          Motivo <span className="font-normal text-muted">(solo lo ves tú)</span>
          <input id="to-motivo" className="field" maxLength={100} value={form.motivo} onChange={(e) => set({ motivo: e.target.value })} placeholder="Vacaciones, médico, festivo…" />
        </label>
        <button className="btn-primary h-12" disabled={pending}>
          {pending ? 'Guardando…' : 'Bloquear'}
        </button>
        {note}
      </form>

      <div className="grid gap-2">
        <p className="text-sm font-semibold">Próximos bloqueos</p>
        {!blocks.length && <p className="rounded-card border border-dashed border-border p-4 text-sm text-muted">No hay ninguno. La agenda está abierta según el horario.</p>}
        {blocks.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-card border border-border bg-surface p-3 text-sm">
            <p className="min-w-0 flex-1">
              <span className="block font-semibold first-letter:uppercase">{describe(t)}</span>
              <span className="block text-muted">
                {t.barber?.nombre ?? 'Toda la barbería'}
                {t.motivo ? ` · ${t.motivo}` : ''}
              </span>
            </p>
            <button type="button" className="btn-ghost h-10 px-3" disabled={del.pending} onClick={() => del.run(() => deleteTimeOff(t.id), 'Bloqueo quitado', () => router.refresh())}>
              <TrashIcon /> Quitar
            </button>
          </div>
        ))}
        {del.note}
      </div>
    </div>
  )
}

// ─── Reseñas de Google ────────────────────────────────────────────────────
export function ReviewEditor({ url: initial }: { url: string }) {
  const [url, setUrl] = useState(initial)
  const { pending, run, note } = useSave()
  return (
    <form
      className="card grid gap-3 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        run(() => saveReviewUrl(url))
      }}
    >
      <label className="grid gap-1.5 text-sm font-medium">
        Enlace de reseñas de Google
        <input type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://g.page/r/..." className="field" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary h-11">
          {pending ? 'Guardando…' : 'Guardar'}
        </button>
        {initial && (
          <a href={initial} target="_blank" rel="noopener noreferrer" className="btn-ghost h-11">
            Probar enlace
          </a>
        )}
        {note}
      </div>
    </form>
  )
}
