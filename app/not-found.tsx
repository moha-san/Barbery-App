import Link from 'next/link'
import { siteConfig } from '@/config/site'
import { BrandMark } from '@/components/brand-mark'

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center justify-items-center gap-4 px-4 text-center">
      <BrandMark size={56} />
      <p className="eyebrow mt-2">Página no encontrada</p>
      <h1 className="text-3xl">Aquí no hay nada que cortar</h1>
      <p className="text-muted">Puede que el enlace esté mal escrito. Vuelve al inicio y reserva tu cita en {siteConfig.name}.</p>
      <Link href="/" className="btn-primary mt-2 h-12 px-6 text-base">
        Reservar cita
      </Link>
    </main>
  )
}
