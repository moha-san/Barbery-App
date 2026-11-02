import { revisarPendientes } from '../../../lib/barbero.ts'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Supabase (pg_cron) llama aquí cada 5 min con "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET
  if (!secreto || request.headers.get('authorization') !== `Bearer ${secreto}`) {
    return new Response('No autorizado', { status: 401 })
  }
  try {
    return Response.json(await revisarPendientes())
  } catch (e) {
    console.error('[recordatorios]', e)
    return Response.json({ error: 'Fallo al revisar las citas' }, { status: 500 })
  }
}
