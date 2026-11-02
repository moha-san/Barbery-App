import type { MetadataRoute } from 'next'
import { barberia } from '../config/barberia.ts'

// Para instalar el panel como app en el móvil del dueño ("Añadir a pantalla de inicio").
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `Panel ${barberia.nombre}`,
    short_name: 'Panel',
    start_url: '/panel',
    display: 'standalone',
    background_color: '#0b0a10',
    theme_color: '#0b0a10',
    icons: [
      { src: '/icono-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icono-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
