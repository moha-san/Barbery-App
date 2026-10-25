'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSessionClient } from '@/lib/supabase/server'

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) })

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const parsed = loginSchema.safeParse({ email: formData.get('email'), password: formData.get('password') })
  if (!parsed.success) return 'Email o contraseña inválidos'

  const { error } = await createSessionClient().auth.signInWithPassword(parsed.data)
  if (error) return 'Email o contraseña incorrectos'
  redirect('/dashboard')
}

export async function logout() {
  await createSessionClient().auth.signOut()
  redirect('/login')
}
