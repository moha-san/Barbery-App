import { NextResponse, type NextRequest } from 'next/server'
import { sendTomorrowReminders } from '@/actions/notifications'

export const dynamic = 'force-dynamic'

// Vercel Cron llama aquí una vez al día (vercel.json) con "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  try {
    return NextResponse.json(await sendTomorrowReminders())
  } catch (e) {
    console.error('[cron recordatorios]', e)
    return NextResponse.json({ error: 'Fallo al enviar recordatorios' }, { status: 500 })
  }
}
