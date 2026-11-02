import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Base de datos del bot (Supabase). Solo desde el servidor: usa la clave service_role.
// Sin tipos generados: las tablas son pocas y se tipan a mano abajo.
let cliente: SupabaseClient<any> | null = null
const db = () =>
  (cliente ??= createClient<any>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }))

export type Peticion = {
  id: number
  cliente_telefono: string
  cliente_nombre: string
  servicio: string
  barbero: string
  inicio: string
  estado: 'pendiente' | 'confirmada' | 'otra_hora' | 'rechazada' | 'cancelada'
}

function ok<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message)
  return r.data
}

// true si es la primera vez que vemos este mensaje de WhatsApp.
export async function marcarRecibido(waId: string): Promise<boolean> {
  const { error } = await db().from('recibidos').insert({ wa_id: waId })
  if (!error) return true
  if (error.code === '23505') return false // ya estaba: WhatsApp lo reenvió
  throw new Error(error.message)
}

export async function guardarMensaje(telefono: string, rol: 'cliente' | 'bot', texto: string) {
  ok(await db().from('mensajes').insert({ telefono, rol, texto }))
}

// Últimos mensajes con este cliente, del más antiguo al más nuevo.
export async function historial(telefono: string, limite = 20): Promise<{ rol: 'cliente' | 'bot'; texto: string }[]> {
  const data = ok(
    await db().from('mensajes').select('rol, texto').eq('telefono', telefono).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limite),
  ) as { rol: 'cliente' | 'bot'; texto: string }[]
  return data.reverse()
}

export async function crearPeticion(p: Omit<Peticion, 'id' | 'estado'>): Promise<Peticion> {
  return ok(await db().from('peticiones').insert(p).select('*').single()) as Peticion
}

export async function verPeticion(id: number): Promise<Peticion | null> {
  return ok(await db().from('peticiones').select('*').eq('id', id).maybeSingle()) as Peticion | null
}

export async function cambiarEstado(id: number, estado: Peticion['estado']) {
  ok(await db().from('peticiones').update({ estado }).eq('id', id))
}

// Citas del cliente que aún no han pasado (pendientes o confirmadas).
export async function citasFuturas(telefono: string): Promise<Peticion[]> {
  return ok(
    await db()
      .from('peticiones')
      .select('*')
      .eq('cliente_telefono', telefono)
      .in('estado', ['pendiente', 'confirmada'])
      .gt('inicio', new Date().toISOString())
      .order('inicio'),
  ) as Peticion[]
}

// El bot espera que este barbero escriba la otra hora que propone.
export async function ponerEspera(telefono: string, peticionId: number) {
  ok(await db().from('esperas').upsert({ telefono, peticion_id: peticionId, created_at: new Date().toISOString() }))
}

export async function sacarEspera(telefono: string): Promise<number | null> {
  const data = ok(await db().from('esperas').delete().eq('telefono', telefono).select('peticion_id')) as { peticion_id: number }[]
  return data[0]?.peticion_id ?? null
}
