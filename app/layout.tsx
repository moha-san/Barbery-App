import type { Metadata, Viewport } from 'next'
import type { CSSProperties, ReactNode } from 'react'
import { siteConfig } from '@/config/site'
import { hexToRgbChannels } from '@/lib/brand'
import { ServiceWorkerRegister } from '@/components/sw-register'
import './globals.css'

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
  applicationName: siteConfig.name,
  appleWebApp: { capable: true, title: siteConfig.name, statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
}

export const viewport: Viewport = {
  themeColor: siteConfig.theme_color,
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" style={{ '--brand': hexToRgbChannels(siteConfig.theme_color) } as CSSProperties}>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
