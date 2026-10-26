'use client'

import { useTransition } from 'react'
import { removeFromWaitlist } from '@/actions/clients'
import { TrashIcon } from '@/components/icons'

export function WaitlistRemove({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <button type="button" disabled={pending} onClick={() => startTransition(async () => void (await removeFromWaitlist(id)))} className="btn-ghost h-10 px-3" aria-label="Quitar de la lista">
      <TrashIcon />
    </button>
  )
}
