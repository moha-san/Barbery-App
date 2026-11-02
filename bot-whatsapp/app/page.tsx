import { barberia } from '../config/barberia.ts'

export default function Inicio() {
  return (
    <main>
      <h1>Bot de WhatsApp de {barberia.nombre}</h1>
      <p>Funcionando. Los mensajes llegan a /api/whatsapp.</p>
    </main>
  )
}
