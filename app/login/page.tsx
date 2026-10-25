'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { login } from '@/actions/auth'
import { siteConfig } from '@/config/site'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="rounded-lg bg-brand py-3 font-semibold text-white disabled:opacity-60">
      {pending ? 'Entrando…' : 'Entrar'}
    </button>
  )
}

export default function LoginPage() {
  const [error, formAction] = useFormState(login, null)
  return (
    <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">{siteConfig.name}</h1>
        <p className="text-sm text-neutral-400">Acceso del equipo</p>
      </div>
      <form action={formAction} className="grid gap-3">
        <label className="grid gap-1 text-sm">
          Email
          <input name="email" type="email" required autoComplete="email" className="rounded-lg border border-white/15 bg-neutral-900 px-3 py-2.5 outline-none focus:border-brand" />
        </label>
        <label className="grid gap-1 text-sm">
          Contraseña
          <input name="password" type="password" required autoComplete="current-password" className="rounded-lg border border-white/15 bg-neutral-900 px-3 py-2.5 outline-none focus:border-brand" />
        </label>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <SubmitButton />
      </form>
    </main>
  )
}
