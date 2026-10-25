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
    theme_color: siteConfig.theme_color,
    background_color: siteConfig.background_color,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
