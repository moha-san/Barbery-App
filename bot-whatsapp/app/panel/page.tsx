import { cookies } from 'next/headers'
import Link from 'next/link'
import { barberia } from '../../config/barberia.ts'
import { conversaciones, peticionesDesde, type Peticion } from '../../lib/db.ts'
import { cuando } from '../../lib/fechas.ts'
import { COOKIE, cookieValida } from '../../lib/panel.ts'
import { entrar, salir } from './acciones.ts'
import { boton, caja, campo, enlace, morado, pagina, suave } from './estilos.ts'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Panel del asistente' }

const ESTADOS: Record<Peticion['estado'], string> = {
  pendiente: '⏳ Pendiente',
  confirmada: '✅ Confirmada',
  otra_hora: '🔁 Otra hora',
  rechazada: '⛔ Sin hueco',
  cancelada: '❌ Cancelada',
}

const contar = (lista: string[]) =>
  Object.entries(lista.reduce<Record<string, number>>((a, k) => ((a[k] = (a[k] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1])

function Login({ error }: { error: boolean }) {
  return (
    <main style={{ ...pagina, maxWidth: 360, marginTop: 80 }}>
      <h1 style={{ fontSize: 24 }}>Panel de {barberia.nombre}</h1>
      {!process.env.PANEL_CLAVE && <p style={{ color: '#ff8a8a' }}>Falta poner PANEL_CLAVE en Vercel.</p>}
      <form action={entrar} style={{ display: 'grid', gap: 12 }}>
        <input name="clave" type="password" placeholder="Contraseña" style={campo} autoFocus />
        {error && <p style={{ color: '#ff8a8a', margin: 0 }}>Contraseña incorrecta.</p>}
        <button style={boton}>Entrar</button>
      </form>
    </main>
  )
}

export default async function Panel({ searchParams }: { searchParams: { error?: string; local?: string } }) {
  if (!cookieValida(cookies().get(COOKIE)?.value)) return <Login error={!!searchParams.error} />

  const zona = barberia.zonaHoraria
  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)
  const [todas, charlas] = await Promise.all([peticionesDesde(inicioMes), conversaciones()])
  const varios = barberia.locales.length > 1
  const local = barberia.locales.find((l) => l.nombre === searchParams.local)?.nombre
  const peticiones = local ? todas.filter((p) => p.local === local) : todas
  const confirmadas = peticiones.filter((p) => p.estado === 'confirmada')
  const nombres = new Map(todas.map((p) => [p.cliente_telefono, p.cliente_nombre]))

  return (
    <main style={pagina}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 24 }}>Panel de {barberia.nombre}</h1>
        <form action={salir}>
          <button style={{ ...boton, background: 'transparent', color: '#9a95a8' }}>Salir</button>
        </form>
      </div>

      {varios && (
        <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {[undefined, ...barberia.locales.map((l) => l.nombre)].map((n) => (
            <Link
              key={n ?? 'todos'}
              href={n ? `/panel?local=${encodeURIComponent(n)}` : '/panel'}
              style={{ ...enlace, padding: '6px 12px', borderRadius: 999, border: '1px solid #3a3546', background: n === local ? morado : 'transparent', color: n === local ? '#fff' : '#c9b6ff' }}
            >
              {n ?? 'Todos'}
            </Link>
          ))}
        </nav>
      )}

      <section style={caja}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Este mes{local ? ` en ${local}` : ''}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center' }}>
          {[
            ['Citas pedidas', peticiones.length],
            ['Confirmadas', confirmadas.length],
            ['Clientes que escribieron', charlas.filter((c) => Date.parse(c.created_at) >= inicioMes.getTime()).length],
          ].map(([t, n]) => (
            <div key={t}>
              <div style={{ fontSize: 32, fontWeight: 700, color: morado }}>{n}</div>
              <div style={suave}>{t}</div>
            </div>
          ))}
        </div>
        {confirmadas.length > 0 && (
          <p style={{ ...suave, marginBottom: 0 }}>
            {varios && !local && <>Por local: {contar(confirmadas.map((p) => p.local)).map(([k, n]) => `${k} ${n}`).join(' · ')}<br /></>}
            Por barbero: {contar(confirmadas.map((p) => p.barbero)).map(([k, n]) => `${k} ${n}`).join(' · ')}
          </p>
        )}
      </section>

      <section style={caja}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Últimas citas</h2>
        {peticiones.length === 0 && <p style={suave}>Aún no hay citas este mes.</p>}
        {peticiones.slice(0, 15).map((p) => (
          <div key={p.id} style={{ padding: '8px 0', borderTop: '1px solid #2a2635' }}>
            <Link href={`/panel/c/${p.cliente_telefono}`} style={enlace}>{p.cliente_nombre}</Link> · {p.servicio} con {p.barbero}
            {varios && ` en ${p.local}`}
            <div style={suave}>{cuando(p.inicio, zona)} · {ESTADOS[p.estado]}</div>
          </div>
        ))}
      </section>

      <section style={caja}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Conversaciones</h2>
        {charlas.length === 0 && <p style={suave}>Aún no ha escrito nadie.</p>}
        {charlas.map((c) => (
          <Link key={c.telefono} href={`/panel/c/${c.telefono}`} style={{ ...enlace, display: 'block', padding: '8px 0', borderTop: '1px solid #2a2635' }}>
            {nombres.get(c.telefono) ? `${nombres.get(c.telefono)} · ` : ''}+{c.telefono}
            <div style={{ ...suave, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.rol === 'cliente' ? '' : 'Bot: '}
              {c.texto}
            </div>
          </Link>
        ))}
      </section>
    </main>
  )
}
