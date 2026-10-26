'use client'

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { siteConfig } from '@/config/site'
import { isInstalled, isIos } from '@/lib/push-client'
import { DownloadIcon, ShareIcon } from '@/components/icons'

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

// Botón "Instalar app". En Android/Chrome abre el aviso del navegador; en iPhone explica los pasos.
export function InstallApp() {
  const [mode, setMode] = useState<'none' | 'prompt' | 'ios' | 'android'>('none')
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null)

  useEffect(() => {
    if (isInstalled()) return
    if (isIos()) return setMode('ios')
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as InstallPromptEvent)
      setMode('prompt')
    }
    const onInstalled = () => setMode('none')
    // Si el navegador no ofrece su aviso (Samsung Internet, Firefox o ya se descartó), enseñamos los pasos a mano.
    const fallback = window.setTimeout(() => setMode((m) => (m === 'none' && /android/i.test(navigator.userAgent) ? 'android' : m)), 3000)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.clearTimeout(fallback)
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (mode === 'none') return null

  const button = (onClick?: () => void) => (
    <button type="button" onClick={onClick} className="btn-ghost h-11 rounded-full px-4">
      <DownloadIcon /> Instalar<span className="hidden sm:inline">&nbsp;app</span>
    </button>
  )

  if (mode === 'prompt') {
    return button(async () => {
      if (!deferred) return
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      setDeferred(null)
      if (outcome === 'accepted') setMode('none')
    })
  }

  const steps =
    mode === 'ios'
      ? [
          <>Abre esta página en <strong>Safari</strong> y toca <strong>Compartir</strong> <ShareIcon className="inline text-primary" /></>,
          <>Elige <strong>Añadir a pantalla de inicio</strong></>,
          <>Toca <strong>Añadir</strong> y ábrela desde el icono</>,
        ]
      : [
          <>Toca el menú <strong>⋮</strong> del navegador (arriba o abajo a la derecha)</>,
          <>Elige <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong></>,
          <>Confirma y ábrela desde el icono</>,
        ]

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{button()}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-background/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 animate-sheet-up rounded-t-[calc(var(--radius)+8px)] border border-border bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-soft sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:animate-fade-in sm:rounded-card">
          <span aria-hidden className="mx-auto mb-4 block h-1 w-10 rounded-full bg-text/15 sm:hidden" />
          <Dialog.Title className="text-2xl">Instala la app de {siteConfig.name}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted">Tendrás la reserva a un toque, como una app más.</Dialog.Description>
          <ol className="mt-5 grid gap-3 text-sm">
            {steps.map((step, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary/60 font-semibold text-primary">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <Dialog.Close className="btn-primary mt-6 h-12 w-full">Entendido</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
