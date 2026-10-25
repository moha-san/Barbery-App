import type { Config } from 'tailwindcss'

// Los colores, letras y redondez salen de config/site.ts (theme) como variables CSS (ver lib/brand.ts).
const c = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: c('primary'),
        'on-primary': c('on-primary'),
        accent: c('accent'),
        background: c('background'),
        surface: c('surface'),
        text: c('text'),
        muted: c('muted'),
        border: c('border'),
        success: c('success'),
        danger: c('danger'),
        whatsapp: c('whatsapp'),
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: 'var(--radius)',
        btn: 'calc(var(--radius) * 0.75)',
      },
      boxShadow: {
        soft: '0 1px 2px rgb(0 0 0 / 0.12), 0 12px 32px -12px rgb(0 0 0 / 0.35)',
        glow: '0 10px 30px -10px rgb(var(--c-primary) / 0.55)',
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.6)' }, to: { opacity: '1', transform: 'none' } },
        draw: { from: { strokeDashoffset: '24' }, to: { strokeDashoffset: '0' } },
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        'fade-up': 'fade-up 250ms ease-out both',
        'scale-in': 'scale-in 350ms cubic-bezier(.2,.9,.3,1.3) both',
        draw: 'draw 400ms 250ms ease-out both',
        'sheet-up': 'sheet-up 250ms cubic-bezier(.2,.8,.2,1) both',
        'fade-in': 'fade-in 200ms ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config
