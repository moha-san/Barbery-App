// "#b45309" -> "180 83 9", para usarlo como rgb(var(--brand) / alpha) en Tailwind.
export function hexToRgbChannels(hex: string): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}
