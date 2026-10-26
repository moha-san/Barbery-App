// Único archivo a tocar para rebrandear la app para un cliente nuevo.

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = domingo
export type TimeWindow = { open: string; close: string } // "HH:mm" en hora local del local

// ─── Aspecto visual ────────────────────────────────────────────────────────────
// Tipografías disponibles (se cargan con next/font en lib/fonts.ts).
export type FontKey = 'playfair' | 'manrope' | 'unbounded' | 'inter' | 'instrumentSerif' | 'dmSans' | 'bricolage' | 'nunitoSans'

export type Theme = {
  mode: 'dark' | 'light'
  colors: {
    primary: string // botones y elementos activos
    onPrimary: string // texto encima de primary
    accent: string // detalles (etiquetas, adornos)
    background: string // fondo de la página
    surface: string // fondo de tarjetas
    text: string
    muted: string // texto secundario
    border: string
    success: string // cita completada
    danger: string // errores y "no presentado"
    whatsapp: string // icono de WhatsApp
  }
  fonts: { display: FontKey; body: FontKey }
  radius: number // redondez de tarjetas en px (botones y chips usan un poco menos)
  logo: string | null // ruta en public/, o null para usar las iniciales del nombre
  heroImage: string // imagen de portada en public/
  tagline: string // frase de bienvenida
}

export const themePresets = {
  // Barbería tradicional de lujo: negro, latón y serif elegante.
  clasico: {
    mode: 'dark',
    colors: {
      primary: '#c9a45c',
      onPrimary: '#14100b',
      accent: '#e3c78f',
      background: '#0e0c0a',
      surface: '#181410',
      text: '#f4eee4',
      muted: '#a69d8f',
      border: '#2e2821',
      success: '#7fcf98',
      danger: '#f08a7e',
      whatsapp: '#25d366',
    },
    fonts: { display: 'playfair', body: 'manrope' },
    radius: 12,
    logo: null,
    heroImage: '/brand/hero-clasico.svg',
    tagline: 'Navaja, toalla caliente y el corte de siempre, hecho con calma.',
  },
  // Streetwear: oscuro con acento lima y sans geométrica en negrita.
  urbano: {
    mode: 'dark',
    colors: {
      primary: '#d4ff3a',
      onPrimary: '#0b0c08',
      accent: '#ff5a36',
      background: '#0a0a0b',
      surface: '#141417',
      text: '#f7f7f8',
      muted: '#9d9da6',
      border: '#2a2a30',
      success: '#5ee38f',
      danger: '#ff7a6b',
      whatsapp: '#25d366',
    },
    fonts: { display: 'unbounded', body: 'inter' },
    radius: 6,
    logo: null,
    heroImage: '/brand/hero-urbano.svg',
    tagline: 'Fades limpios, diseños a navaja y buena música. Entra con estilo.',
  },
  // Estudio moderno: crema y negro, mucho aire.
  minimal: {
    mode: 'light',
    colors: {
      primary: '#171512',
      onPrimary: '#f6f1e9',
      accent: '#9a5a32',
      background: '#f6f1e9',
      surface: '#fffcf7',
      text: '#171512',
      muted: '#686157',
      border: '#e3dbcf',
      success: '#25734a',
      danger: '#b3261e',
      whatsapp: '#178a45',
    },
    fonts: { display: 'instrumentSerif', body: 'dmSans' },
    radius: 20,
    logo: null,
    heroImage: '/brand/hero-minimal.svg',
    tagline: 'Cortes precisos, sin prisas. Un sitio tranquilo para cuidarte.',
  },
  // Barbería de barrio: blanco y verde, redondeado y cercano.
  fresco: {
    mode: 'light',
    colors: {
      primary: '#0f6e56',
      onPrimary: '#ffffff',
      accent: '#b4561a',
      background: '#ffffff',
      surface: '#f3f8f6',
      text: '#10231d',
      muted: '#52645b',
      border: '#d9e6e0',
      success: '#1a7a43',
      danger: '#c2372b',
      whatsapp: '#178a45',
    },
    fonts: { display: 'bricolage', body: 'nunitoSans' },
    radius: 18,
    logo: null,
    heroImage: '/brand/hero-fresco.svg',
    tagline: 'Tu barbería de confianza, a dos calles de casa.',
  },
} satisfies Record<string, Theme>

// 👇 Cambia esta línea para elegir el estilo: 'clasico' | 'urbano' | 'minimal' | 'fresco'
const preset: keyof typeof themePresets = 'fresco'

export const siteConfig = {
  name: 'Barbería El Clásico',
  description: 'Reserva tu cita en segundos.',
  // Para un cliente con estilo propio, copia un preset y cambia sus valores.
  theme: themePresets[preset] as Theme,
  phone: '+34600000000',
  // Formato internacional sin "+" ni espacios, como lo pide wa.me
  whatsapp: '34600000000',
  address: 'Calle Mayor 1, Madrid',
  // Enlace para dejar reseña en Google (Google Maps > tu negocio > "Pedir reseñas"). Vacío = no se enseña.
  googleReviewUrl: '',
  timezone: 'Europe/Madrid',
  locale: 'es-ES',
  currency: 'EUR',
  // Cada cuántos minutos empieza un hueco posible en la cuadrícula
  slotStepMin: 15,
  // Días que se pueden reservar por adelantado
  bookingWindowDays: 30,
  // Avisos al móvil del cliente: cuántas horas antes de la cita (ej. [24, 1] = un día antes y una hora antes)
  reminderHoursBefore: [24, 1],
  // Horario inicial. Luego el dueño lo cambia desde el panel (Ajustes > Horario).
  businessHours: {
    0: [],
    1: [{ open: '10:00', close: '14:00' }, { open: '16:00', close: '20:00' }],
    2: [{ open: '10:00', close: '14:00' }, { open: '16:00', close: '20:00' }],
    3: [{ open: '10:00', close: '14:00' }, { open: '16:00', close: '20:00' }],
    4: [{ open: '10:00', close: '14:00' }, { open: '16:00', close: '20:00' }],
    5: [{ open: '10:00', close: '20:00' }],
    6: [{ open: '10:00', close: '14:00' }],
  } satisfies Record<Weekday, TimeWindow[]>,
} as const

export type SiteConfig = typeof siteConfig
