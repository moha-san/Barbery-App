'use client'

import { useEffect, useState } from 'react'

// Aviso fijo cuando el móvil se queda sin conexión: lo que se ve es la última copia guardada.
export function OfflineBanner() {
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  if (!offline) return null
  return (
    <p role="status" className="fixed inset-x-0 bottom-0 z-50 bg-text px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center text-sm text-background">
      Sin conexión. Ves lo último guardado; se actualiza solo al volver la cobertura.
    </p>
  )
}

// En la pantalla de entrar: borra las agendas que el panel guardó en este móvil (por si cerró sesión).
export function ForgetPrivatePages() {
  useEffect(() => {
    navigator.serviceWorker?.controller?.postMessage('logout')
  }, [])
  return null
}
