import { Bricolage_Grotesque, DM_Sans, Instrument_Serif, Inter, Manrope, Nunito_Sans, Playfair_Display, Unbounded } from 'next/font/google'
import type { FontKey } from '@/config/site'

// Todas las tipografías de los presets. Solo se descarga la que de verdad se usa en pantalla.
// Para añadir otra: impórtala aquí, dale una clave y añádela a FontKey en config/site.ts.
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['500', '600', '700'], display: 'swap', preload: false })
const manrope = Manrope({ subsets: ['latin'], display: 'swap', preload: false })
const unbounded = Unbounded({ subsets: ['latin'], weight: ['600', '700'], display: 'swap', preload: false })
const inter = Inter({ subsets: ['latin'], display: 'swap', preload: false })
const instrumentSerif = Instrument_Serif({ subsets: ['latin'], weight: '400', display: 'swap', preload: false })
const dmSans = DM_Sans({ subsets: ['latin'], display: 'swap', preload: false })
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], display: 'swap', preload: false })
const nunitoSans = Nunito_Sans({ subsets: ['latin'], display: 'swap', preload: false })

// weight = grosor de los títulos con esa letra
export const fonts: Record<FontKey, { family: string; weight: number }> = {
  playfair: { family: playfair.style.fontFamily, weight: 600 },
  manrope: { family: manrope.style.fontFamily, weight: 600 },
  unbounded: { family: unbounded.style.fontFamily, weight: 700 },
  inter: { family: inter.style.fontFamily, weight: 600 },
  instrumentSerif: { family: instrumentSerif.style.fontFamily, weight: 400 },
  dmSans: { family: dmSans.style.fontFamily, weight: 600 },
  bricolage: { family: bricolage.style.fontFamily, weight: 700 },
  nunitoSans: { family: nunitoSans.style.fontFamily, weight: 700 },
}
