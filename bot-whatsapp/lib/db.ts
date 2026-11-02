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
  local: string
  servicio: string
  barbero: string
  inicio: string
  estado: 'pendiente' | 'confirmada' | 'otra_hora' | 'rechazada' | 'cancelada'
  recordada?: boolean
  cliente_avisado?: boolean
  resena_pedida?: boolean
  created_at?: string
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

// Citas sin contestar desde hace más de `minutos` y que aún no tienen ese aviso.
export async function pendientesSin(campo: 'recordada' | 'cliente_avisado', minutos: number): Promise<Peticion[]> {
  return ok(
    await db()
      .from('peticiones')
      .select('*')
      .eq('estado', 'pendiente')
      .eq(campo, false)
      .lt('created_at', new Date(Date.now() - minutos * 60_000).toISOString())
      .gt('inicio', new Date().toISOString()),
  ) as Peticion[]
}

// Citas confirmadas que ya pasaron hace más de X horas (y menos de un día) y a las que no se ha pedido reseña.
export async function citasParaResena(horas: number): Promise<Peticion[]> {
  const hasta = Date.now() - horas * 3_600_000
  return ok(
    await db()
      .from('peticiones')
      .select('*')
      .eq('estado', 'confirmada')
      .eq('resena_pedida', false)
      .lt('inicio', new Date(hasta).toISOString())
      .gt('inicio', new Date(hasta - 24 * 3_600_000).toISOString()),
  ) as Peticion[]
}

export async function marcar(id: number, campo: 'recordada' | 'cliente_avisado' | 'resena_pedida') {
  ok(await db().from('peticiones').update({ [campo]: true }).eq('id', id))
}
