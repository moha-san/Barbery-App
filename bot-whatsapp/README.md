# Bot de WhatsApp para barberías (con Booksy)

Proyecto aparte de la app de reservas. No usa nada de ella.

## Qué hace

1. El cliente escribe al WhatsApp de la barbería: "¿cuánto cuesta el corte?" o "quiero cita el jueves a las 8 con Adrián".
2. La IA contesta las dudas con los datos de `config/barberia.ts` y, para una cita, pregunta solo lo que falte (servicio, barbero, día, hora y nombre).
3. Al barbero le llega por WhatsApp: "📅 Nueva cita para pasar a Booksy: Juan, corte con Adrián, jueves a las 20:00", con tres botones:
   - **Hecho**: ya la ha apuntado en Booksy. El bot se lo confirma al cliente.
   - **Otra hora**: el bot le pregunta qué hora propone y se la ofrece al cliente.
   - **No hay hueco**: el bot le pide al cliente otra hora u otro día.
4. El cliente también puede preguntar por sus citas o cancelar una. Si cancela, el barbero recibe un aviso para borrarla de Booksy.

El bot no ve la agenda de Booksy, porque Booksy no deja conectarse sin ser socio (ver `/mnt/project-files/bot-whatsapp/mensaje-booksy.md`). Si Booksy nos acepta, el botón "Hecho" podrá guardar la cita en Booksy él solo.

## Archivos

```
config/barberia.ts        Datos de la barbería: lo único que se cambia para cada cliente
app/api/whatsapp/route.ts Dirección a la que WhatsApp manda los mensajes
lib/agente.ts             La IA que habla con el cliente (Claude)
lib/barbero.ts            Avisos y botones del barbero
lib/whatsapp.ts           Envío de mensajes (API oficial de WhatsApp de Meta)
lib/db.ts                 Conversaciones y citas pedidas (Supabase)
supabase/bot.sql          Tablas: se pega en Supabase > SQL Editor
```

## Puesta en marcha (una vez por barbería)

1. **Datos**: rellena `config/barberia.ts` (horario, precios, barberos y el WhatsApp personal de cada barbero, que es donde reciben las citas).
2. **Base de datos**: crea un proyecto en Supabase y pega `supabase/bot.sql` en SQL Editor > Run.
3. **WhatsApp**: en developers.facebook.com crea una app de tipo "Empresa", añade el producto WhatsApp y registra el número de la barbería. Apunta el token, el "Phone number ID" y el "App secret".
4. **Plantillas** (WhatsApp Manager > Plantillas, categoría "Utilidad", idioma español). Sirven para escribir a alguien que lleva más de 24 h sin hablar con el bot:
   - `peticion_cita`: texto `Tienes una cita nueva: {{1}}` y tres botones de respuesta rápida: `Hecho`, `Otra hora`, `No hay hueco` (en ese orden).
   - `aviso_cita`: texto `Mensaje de la barbería: {{1}}`.
5. **IA**: crea una clave en console.anthropic.com.
6. **Publicar**: en Vercel, nuevo proyecto con este repositorio y **Root Directory = `bot-whatsapp`**. Pon las variables de `.env.example`.
7. **Conectar**: en Meta > WhatsApp > Configuración, webhook `https://TU-PROYECTO.vercel.app/api/whatsapp`, el mismo "verify token" que pusiste en Vercel, y suscríbete a `messages`.

## Costes aproximados

- WhatsApp: las respuestas a un cliente que acaba de escribir son gratis. Las plantillas (avisos tras más de 24 h) cuestan unos céntimos cada una.
- IA: alrededor de 1 céntimo por mensaje.
- Vercel: el plan gratis no permite uso comercial; para un cliente de pago hace falta Vercel Pro u otro hosting.

## Comandos

```
npm install
npm test          # pruebas
npm run typecheck
npm run dev
```
