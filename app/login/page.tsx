/* eslint-disable @next/next/no-img-element */
'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { login } from '@/actions/auth'
import { siteConfig } from '@/config/site'
import { BrandMark } from '@/components/brand-mark'
import { ForgetPrivatePages } from '@/components/offline'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn-primary mt-2 h-12 text-base">
      {pending ? 'Entrando…' : 'Entrar'}
    </button>
  )
}

export default function LoginPage() {
  const [error, formAction] = useFormState(login, null)
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <ForgetPrivatePages />
      <section className="relative isolate hidden overflow-hidden lg:flex lg:flex-col lg:justify-end lg:p-12">
        <img src={siteConfig.theme.heroImage} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <p className="eyebrow">Panel del equipo</p>
        <p className="font-display mt-3 max-w-md text-5xl leading-tight">{siteConfig.name}</p>
        <p className="mt-3 max-w-md text-muted">{siteConfig.theme.tagline}</p>
      </section>

      <div className="grid content-center px-4 py-12 sm:px-8">
        <div className="mx-auto w-full max-w-sm animate-fade-up">
          <BrandMark size={56} />
          <h1 className="mt-6 text-3xl">Hola de nuevo</h1>
          <p className="mt-1 text-sm text-muted">Entra para ver la agenda de {siteConfig.name}.</p>

          <form action={formAction} className="card mt-8 grid gap-4 p-6">
            <label className="grid gap-1.5 text-sm font-medium">
              Email
              <input name="email" type="email" required autoComplete="email" className="field" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Contraseña
              <input name="password" type="password" required autoComplete="current-password" className="field" />
            </label>
            {error && (
              <p role="alert" className="rounded-btn border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                {error}
              </p>
            )}
            <SubmitButton />
          </form>
        </div>
      </div>
    </main>
  )
}
