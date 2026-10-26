/* eslint-disable @next/next/no-img-element */
import { siteConfig } from '@/config/site'

// Iniciales del nombre sin palabras cortas: "Barbería El Clásico" -> "BC"
export function initials(name: string) {
  const words = name.split(/\s+/).filter((w) => w.length > 2)
  const list = words.length ? words : [name]
  return (list[0][0] + (list.length > 1 ? list[list.length - 1][0] : '')).toUpperCase()
}

// Logo del tema o, si no hay, un monograma con las iniciales en la letra de títulos.
// logo: el que sube el dueño en Ajustes; si no se pasa, el del tema.
export function BrandMark({ size = 40, className = '', logo = siteConfig.theme.logo }: { size?: number; className?: string; logo?: string | null }) {
  if (logo) return <img src={logo} alt="" width={size} height={size} className={`shrink-0 rounded-full object-cover ${className}`} />
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={`font-display grid shrink-0 place-items-center rounded-full border border-primary/60 bg-primary/10 text-primary ${className}`}
    >
      {initials(siteConfig.name)}
    </span>
  )
}
