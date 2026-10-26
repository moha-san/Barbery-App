import { ImageResponse } from 'next/og'
import { siteConfig } from '@/config/site'
import { initials } from '@/components/brand-mark'

// Icono de la app (pestaña, móvil e instalación) generado con las iniciales y los colores del tema.
// El círculo ocupa el centro para que sirva también como icono "maskable" de Android.
const SIZES = [180, 192, 512]

export const dynamic = 'force-static'
export function generateStaticParams() {
  return SIZES.map((size) => ({ size: String(size) }))
}

export function GET(_req: Request, { params }: { params: { size: string } }) {
  const size = SIZES.includes(Number(params.size)) ? Number(params.size) : 192
  const { colors } = siteConfig.theme
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.background }}>
        <div
          style={{
            width: size * 0.66,
            height: size * 0.66,
            borderRadius: '50%',
            border: `${Math.max(2, size * 0.02)}px solid ${colors.primary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.primary,
            fontSize: size * 0.26,
            fontWeight: 700,
            letterSpacing: size * 0.005,
          }}
        >
          {initials(siteConfig.name)}
        </div>
      </div>
    ),
    { width: size, height: size },
  )
}
