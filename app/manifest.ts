import type { MetadataRoute } from 'next'
import { siteConfig } from '@/config/site'

// Next sirve esto como /manifest.webmanifest y lo enlaza solo. Se genera desde config/site.ts
// para que cada barbería tenga su nombre y color sin tocar un JSON aparte.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'es',
    theme_color: siteConfig.theme.colors.background,
    background_color: siteConfig.theme.colors.background,
    icons: [
      // Generados con las iniciales y colores del tema (app/brand-icon)
      { src: '/brand-icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand-icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/brand-icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
