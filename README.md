# Barbery App

PWA de reservas para **una** barbería (single-tenant, llave en mano). Next.js 14 (App Router) · TypeScript · Tailwind · Supabase · Radix UI.

## Puesta en marcha

1. Crea un proyecto en Supabase.
2. `cp .env.example .env.local` y rellena las claves (Supabase, claves de avisos con `npx web-push generate-vapid-keys`, `CRON_SECRET`).
3. `npm install`
4. Tablas: `npx supabase login`, `npx supabase link --project-ref <ref>` y `npx supabase db push`.
5. Datos de prueba: `npm run seed` (admin, barbero, 4 servicios, 3 citas y una prueba anti-solapes).
6. `npm run dev`

## Rebrandear para un cliente

Solo se toca `config/site.ts`:

1. Datos: `name`, `phone`, `whatsapp`, `address`, horario (`businessHours`).
2. Estilo: cambia la línea `const preset = 'clasico'` por `'urbano'` o `'minimal'`.
3. Estilo propio: copia un preset dentro de `themePresets`, cambia colores (hex), letras (`fonts`), redondez (`radius`), `logo`, `heroImage` y `tagline`, y elígelo en esa línea.
4. Pon el logo y la portada del cliente en `public/brand/`. El icono de la app se genera solo con las iniciales y los colores del tema (`app/brand-icon`).

Los colores llegan a Tailwind como `bg-surface`, `text-muted`, `border-border`, `bg-primary`, `text-on-primary`… Nunca uses colores fijos en los componentes.

## Estructura

```
config/site.ts                 Marca y horario del local
supabase/migrations/          Tablas, restricción anti-solapes, RLS, función book_appointment
types/database.ts              Tipos de la BD (formato supabase gen types)
actions/appointments.ts        getAvailableSlots, bookAppointment, updateAppointmentStatus
actions/notifications.ts       Aviso al móvil del dueño por reserva y recordatorio del día antes
actions/push.ts                Guardar el móvil que acepta avisos (personal o cliente)
lib/push.ts, lib/push-client.ts  Envío de avisos (web-push) y permiso en el navegador
app/api/cron/recordatorios/    Recordatorios automáticos (lo llama pg_cron cada 10 min)
lib/reminders.ts (+ .test.ts)  Qué recordatorio toca a cada cita
actions/auth.ts                Login / logout del equipo
lib/slots.ts (+ .test.ts)      Cálculo de huecos libres
lib/whatsapp.ts                generateWhatsAppReminderLink
lib/calendar.ts (+ .test.ts)   Archivo .ics y enlace de Google Calendar de la cita
scripts/seed.ts                Datos de prueba (npm run seed)
lib/supabase/                  Clientes de Supabase (servidor, admin, navegador)
app/page.tsx                   Flujo de reserva público
app/dashboard/page.tsx         Agenda del día (tiempo real)
app/login/page.tsx             Acceso del equipo
app/manifest.ts, public/sw.js  PWA instalable
```

## Avisos al móvil

- **Dueño y barberos:** en el panel tocan *Activar avisos*. Cada reserva nueva les llega al móvil.
- **Clientes:** tras reservar tocan *Avisarme antes de la cita*. Reciben un aviso por cada valor de `reminderHoursBefore` en `config/site.ts` (por defecto 24 h y 1 h antes). Supabase (pg_cron) llama a `/api/cron/recordatorios` cada 10 min: ver `supabase/cron-recordatorios.sql.example`.
- **Barberos:** en cada cita del panel, *Enviar recordatorio al móvil* avisa al cliente al momento (si activó los avisos; si no, queda el botón de WhatsApp).
- **iPhone:** solo funciona con la app añadida a la pantalla de inicio (iOS 16.4 o más). La app lo explica si no está instalada.
- Variables: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`. Sin ellas la app funciona, pero no manda avisos.

## Cómo se evitan las dobles reservas

1. `bookAppointment` comprueba en el servidor que la hora está dentro del horario y libre.
2. La función SQL `book_appointment` inserta cliente y cita en una transacción.
3. La restricción `appointments_no_overlap` (exclusión GiST sobre `barber_id` + `tstzrange`) hace que Postgres rechace cualquier cita solapada, aunque lleguen dos a la vez. La app traduce ese error (23P01) a "Alguien acaba de reservar esa hora".

## Comprobaciones

`npm run typecheck` · `npm run lint` · `npm test` · `npm run build`
