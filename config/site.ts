// Único archivo a tocar para rebrandear la app para un cliente nuevo.

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = domingo
export type TimeWindow = { open: string; close: string } // "HH:mm" en hora local del local

export const siteConfig = {
  name: 'Barbería El Clásico',
  description: 'Reserva tu cita en segundos.',
  logo_url: '/icons/icon-192.png',
  theme_color: '#b45309',
  background_color: '#0a0a0a',
  phone: '+34600000000',
  // Formato internacional sin "+" ni espacios, como lo pide wa.me
  whatsapp: '34600000000',
  address: 'Calle Mayor 1, Madrid',
  timezone: 'Europe/Madrid',
  locale: 'es-ES',
  currency: 'EUR',
  // Cada cuántos minutos empieza un hueco posible en la cuadrícula
  slotStepMin: 15,
  // Días que se pueden reservar por adelantado
  bookingWindowDays: 30,
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
