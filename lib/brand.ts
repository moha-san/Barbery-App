import type { CSSProperties } from 'react'
import type { Theme } from '@/config/site'
import { fonts } from '@/lib/fonts'

// "#b45309" -> "180 83 9", para usarlo como rgb(var(--c-primary) / alpha) en Tailwind.
export function hexToRgbChannels(hex: string): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

// "onPrimary" -> "on-primary"
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

// Variables CSS del tema, que se ponen en <html> (ver app/layout.tsx y tailwind.config.ts).
export function themeVars(theme: Theme): CSSProperties {
  const vars: Record<string, string> = {
    '--radius': `${theme.radius}px`,
    '--font-display': fonts[theme.fonts.display].family,
    '--font-display-weight': String(fonts[theme.fonts.display].weight),
    '--font-body': fonts[theme.fonts.body].family,
    colorScheme: theme.mode,
  }
  for (const [name, hex] of Object.entries(theme.colors)) vars[`--c-${kebab(name)}`] = hexToRgbChannels(hex)
  return vars as CSSProperties
}
