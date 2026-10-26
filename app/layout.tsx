import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { siteConfig } from '@/config/site'
import { themeVars } from '@/lib/brand'
import { ServiceWorkerRegister } from '@/components/sw-register'
import './globals.css'

const { theme } = siteConfig

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
  applicationName: siteConfig.name,
  appleWebApp: { capable: true, title: siteConfig.name, statusBarStyle: theme.mode === 'dark' ? 'black-translucent' : 'default' },
  icons: { icon: '/brand-icon/192', apple: '/brand-icon/180' },
}

export const viewport: Viewport = {
  themeColor: theme.colors.background,
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" data-mode={theme.mode} style={themeVars(theme)}>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
