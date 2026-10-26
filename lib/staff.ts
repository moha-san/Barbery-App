import 'server-only'
import { redirect } from 'next/navigation'
import { createSessionClient } from '@/lib/supabase/server'

// Para las páginas del panel: solo personal (admin o barbero). Si no, a la agenda o al login.
export async function requireStaff(adminOnly = false) {
  const supabase = createSessionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('nombre, rol').eq('id', user.id).single()
  if (!profile || profile.rol === 'cliente' || (adminOnly && profile.rol !== 'admin')) redirect('/dashboard')
  return { supabase, isAdmin: profile.rol === 'admin' }
}
