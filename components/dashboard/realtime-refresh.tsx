'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/client'

// Escucha cambios en citas (RLS: solo llegan al personal) y vuelve a pedir la página al servidor.
export function RealtimeRefresh() {
  const router = useRouter()
  useEffect(() => {
    const supabase = createBrowserSupabase()
    const channel = supabase
      .channel('appointments-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => router.refresh())
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [router])
  return null
}
