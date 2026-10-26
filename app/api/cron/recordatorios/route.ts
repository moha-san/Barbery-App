import { NextResponse, type NextRequest } from 'next/server'
import { sendDueReminders, sendReviewRequests } from '@/actions/notifications'

export const dynamic = 'force-dynamic'

// Supabase (pg_cron) llama aquí cada 10 min (recordatorios y petición de reseña) con "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  try {
    const reminders = await sendDueReminders()
    const resenas = await sendReviewRequests().catch((e) => {
      console.error('[cron reseñas]', e) // p. ej. falta pegar resenas.sql: los recordatorios siguen igual
      return { resenas: 0 }
    })
    return NextResponse.json({ ...reminders, ...resenas })
  } catch (e) {
    console.error('[cron recordatorios]', e)
    return NextResponse.json({ error: 'Fallo al enviar recordatorios' }, { status: 500 })
  }
}
