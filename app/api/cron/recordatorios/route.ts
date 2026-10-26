import { NextResponse, type NextRequest } from 'next/server'
import { sendDueReminders } from '@/actions/notifications'

export const dynamic = 'force-dynamic'

// Supabase (pg_cron) llama aquí cada 10 min con "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  try {
    return NextResponse.json(await sendDueReminders())
  } catch (e) {
    console.error('[cron recordatorios]', e)
    return NextResponse.json({ error: 'Fallo al enviar recordatorios' }, { status: 500 })
  }
}
