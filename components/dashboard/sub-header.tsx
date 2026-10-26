import Link from 'next/link'
import type { ReactNode } from 'react'
import { siteConfig } from '@/config/site'
import { ArrowLeftIcon } from '@/components/icons'

export function SubHeader({ title, back = '/dashboard', backLabel = 'Agenda', children }: { title: string; back?: string; backLabel?: string; children?: ReactNode }) {
  return (
    <header className="flex items-center gap-3 border-b border-border pb-4">
      <Link href={back} className="btn-ghost h-11 px-3" aria-label={`Volver a ${backLabel}`}>
        <ArrowLeftIcon /> <span className="hidden sm:inline">{backLabel}</span>
      </Link>
      <div className="min-w-0 flex-1">
        <p className="eyebrow truncate">{siteConfig.name}</p>
        <h1 className="truncate text-2xl">{title}</h1>
      </div>
      {children}
    </header>
  )
}
