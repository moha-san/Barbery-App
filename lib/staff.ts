import 'server-only'
import { redirect } from 'next/navigation'
import { createSessionClient } from '@/lib/supabase/server'

export type StaffSession = {
  supabase: ReturnType<typeof createSessionClient>
  userId: string
  nombre: string
  isAdmin: boolean
  // Ficha de barbero de esta cuenta. Si la tiene, solo ve sus citas y su caja. El dueño: null (lo ve todo).
  barberId: string | null
}

// Personal que ha entrado (admin o barbero), o null si no hay sesión o es un cliente.
export async function getStaff(): Promise<StaffSession | null> {
  const supabase = createSessionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const [{ data: profile }, { data: own }] = await Promise.all([
    supabase.from('users').select('nombre, rol').eq('id', user.id).single(),
    // Si aún no se pegó el SQL de cuentas, la columna no existe y esto falla sin más: se ve todo, como antes.
    supabase.from('barbers').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!profile || profile.rol === 'cliente') return null
  const isAdmin = profile.rol === 'admin'
  return { supabase, userId: user.id, nombre: profile.nombre, isAdmin, barberId: isAdmin ? null : own?.id ?? null }
}

// Para las páginas del panel: solo personal (admin o barbero). Si no, a la agenda o al login.
export async function requireStaff(adminOnly = false): Promise<StaffSession> {
  const s = await getStaff()
  if (!s) {
    const {
      data: { user },
    } = await createSessionClient().auth.getUser()
    redirect(user ? '/dashboard' : '/login')
  }
  if (adminOnly && !s.isAdmin) redirect('/dashboard')
  return s
}
