import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // La marca se inyecta como variable CSS desde config/site.ts (ver app/layout.tsx).
      colors: { brand: 'rgb(var(--brand) / <alpha-value>)' },
    },
  },
  plugins: [],
} satisfies Config
