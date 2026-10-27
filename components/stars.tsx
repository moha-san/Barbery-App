import { StarIcon } from '@/components/icons'
import { filledStars, formatRating } from '@/lib/reviews'

// Cinco estrellas: llenas con el color de acento, vacías en gris.
export function Stars({ value, className = '' }: { value: number; className?: string }) {
  const full = filledStars(value)
  return (
    <span role="img" aria-label={`${formatRating(value)} de 5 estrellas`} className={`inline-flex gap-0.5 ${className}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <StarIcon key={i} className={i < full ? 'fill-current text-accent' : 'text-muted/40'} />
      ))}
    </span>
  )
}
