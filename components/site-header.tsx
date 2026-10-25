/* eslint-disable @next/next/no-img-element */
import { siteConfig } from '@/config/site'
import { shopWhatsAppLink } from '@/lib/whatsapp'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-neutral-950/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <img src={siteConfig.logo_url} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{siteConfig.name}</h1>
          <p className="truncate text-xs text-neutral-400">{siteConfig.address}</p>
        </div>
      </div>
      <div className="mx-auto mt-3 grid max-w-xl grid-cols-2 gap-2">
        <a
          href={`tel:${siteConfig.phone}`}
          className="rounded-lg border border-white/15 py-2.5 text-center text-sm font-medium hover:bg-white/5"
        >
          📞 Llamar ahora
        </a>
        <a
          href={shopWhatsAppLink('Hola, quería información sobre una cita.')}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-[#25D366] py-2.5 text-center text-sm font-semibold text-black hover:brightness-95"
        >
          WhatsApp
        </a>
      </div>
    </header>
  )
}
