import { siteConfig } from '@/config/site'
import { BrandMark } from '@/components/brand-mark'
import { InstallApp } from '@/components/install-app'
import { PhoneIcon } from '@/components/icons'
import { NextAppointment } from '@/components/next-appointment'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <BrandMark size={40} />
        <p className="font-display min-w-0 flex-1 truncate text-lg">{siteConfig.name}</p>
        <InstallApp />
        <a href={`tel:${siteConfig.phone}`} className="btn-ghost h-11 rounded-full px-4">
          <PhoneIcon /> <span className="hidden sm:inline">Llamar</span>
          <span className="sr-only sm:hidden">Llamar</span>
        </a>
      </div>
      <NextAppointment />
    </header>
  )
}
