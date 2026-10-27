// Nota de Google y opiniones de la portada. Funciones puras para poder probarlas.

// "4.9" o "4,9" → 4.9. Fuera de 1–5 o vacío → null.
export function parseRating(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === '') return null
  const n = typeof input === 'number' ? input : Number(String(input).trim().replace(',', '.'))
  if (!Number.isFinite(n) || n < 1 || n > 5) return null
  return Math.round(n * 10) / 10
}

// 4.9 → "4,9" (coma, como se escribe en España).
export const formatRating = (n: number) => n.toFixed(1).replace('.', ',')

// 127 → "127 opiniones en Google"; 1 → "1 opinión en Google".
export const ratingCountLabel = (count: number) => `${count.toLocaleString('es-ES')} ${count === 1 ? 'opinión' : 'opiniones'} en Google`

// Cuántas estrellas pintar llenas (4,7 → 5; 4,2 → 4).
export const filledStars = (n: number) => Math.min(5, Math.max(0, Math.round(n)))
