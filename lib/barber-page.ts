// Enlace propio de cada barbero (/barbero/carlos) y su usuario de Instagram.

// "José Luis" → "jose-luis"
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

// Si el enlace ya lo usa otro barbero, añade -2, -3…
export function uniqueSlug(base: string, taken: string[]): string {
  const root = base || 'barbero'
  if (!taken.includes(root)) return root
  let n = 2
  while (taken.includes(`${root}-${n}`)) n++
  return `${root}-${n}`
}

// Acepta "@carlos", "carlos" o "https://instagram.com/carlos/" y devuelve "carlos".
export function instagramHandle(input: string | null | undefined): string | null {
  if (!input) return null
  const handle = input
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .split(/[/?#]/)[0]
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle : null
}

export const barberPath = (b: { id: string; slug?: string | null }) => `/barbero/${b.slug || b.id}`
