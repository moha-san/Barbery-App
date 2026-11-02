import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { barberia } from '../../../../config/barberia.ts'
import { mensajesDe, pausadoHasta } from '../../../../lib/db.ts'
import { soloNumeros } from '../../../../lib/entrada.ts'
import { cuando } from '../../../../lib/fechas.ts'
import { COOKIE, cookieValida } from '../../../../lib/panel.ts'
import { contestar, devolverAlBot } from '../../acciones.ts'
import { boton, caja, campo, enlace, pagina, suave } from '../../estilos.ts'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Conversación' }

export default async function Conversacion({ params }: { params: { tel: string } }) {
  if (!cookieValida(cookies().get(COOKIE)?.value)) redirect('/panel')
  const telefono = soloNumeros(params.tel)
  const [mensajes, pausa] = await Promise.all([mensajesDe(telefono), pausadoHasta(telefono)])
  const zona = barberia.zonaHoraria

  return (
    <main style={pagina}>
      <Link href="/panel" style={enlace}>← Volver</Link>
      <h1 style={{ fontSize: 22 }}>
        +{telefono}{' '}
        <a href={`https://wa.me/${telefono}`} style={{ ...enlace, fontSize: 16 }}>abrir en WhatsApp</a>
      </h1>

      <section style={{ ...caja, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {mensajes.length === 0 && <p style={suave}>Sin mensajes.</p>}
        {mensajes.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.rol === 'cliente' ? 'flex-start' : 'flex-end',
              maxWidth: '85%',
              background: m.rol === 'cliente' ? '#262331' : '#2f1f57',
              borderRadius: 12,
              padding: '8px 12px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {m.texto}
            <div style={{ ...suave, fontSize: 12, textAlign: 'right' }}>{cuando(m.created_at, zona)}</div>
          </div>
        ))}
      </section>

      <section style={caja}>
        {pausa ? (
          <form action={devolverAlBot} style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <input type="hidden" name="telefono" value={telefono} />
            <span style={suave}>Estás hablando tú: el bot no contesta a este cliente hasta las {cuando(pausa, zona).split(' a las ')[1]}.</span>
            <button style={{ ...boton, background: '#2a2635' }}>Devolver al bot</button>
          </form>
        ) : (
          <p style={{ ...suave, marginTop: 0 }}>Si escribes tú, el bot se calla con este cliente durante 2 horas.</p>
        )}
        <form action={contestar} style={{ display: 'grid', gap: 12 }}>
          <input type="hidden" name="telefono" value={telefono} />
          <textarea name="texto" rows={3} placeholder="Escribe al cliente…" style={campo} required />
          <button style={boton}>Enviar por WhatsApp</button>
        </form>
      </section>
    </main>
  )
}
