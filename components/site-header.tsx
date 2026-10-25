/* eslint-disable @next/next/no-img-element */
import { siteConfig } from '@/config/site'
import { shopWhatsAppLink } from '@/lib/whatsapp'
import { ChatIcon, PhoneIcon } from '@/components/icons'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-neutral-950/80 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <img src={siteConfig.logo_url} alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10" />
        <p className="min-w-0 flex-1 truncate font-semibold tracking-tight">{siteConfig.name}</p>
        <a
          href={`tel:${siteConfig.phone}`}
          aria-label="Llamar"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-lg hover:bg-white/5"
        >
          <PhoneIcon />
        </a>
        <a
          href={shopWhatsAppLink('Hola, quería información sobre una cita.')}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          className="grid h-10 w-10 place-items-center rounded-full bg-[#25D366] text-lg text-black hover:brightness-95"
        >
          <ChatIcon />
        </a>
      </div>
    </header>
  )
}
