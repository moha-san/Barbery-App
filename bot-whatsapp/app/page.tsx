import { barberia } from '../config/barberia.ts'

export default function Inicio() {
  return (
    <main>
      <h1>Bot de WhatsApp de {barberia.nombre}</h1>
      <p>Funcionando. Los mensajes llegan a /api/whatsapp.</p>
      <p>
        <a href="/panel">Entrar al panel del dueño</a>
      </p>
    </main>
  )
}
