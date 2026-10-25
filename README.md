# Barbery App

PWA de reservas para **una** barbería (single-tenant, llave en mano). Next.js 14 (App Router) · TypeScript · Tailwind · Supabase · Radix UI.

## Puesta en marcha

1. Crea un proyecto en Supabase y ejecuta `supabase/schema.sql` en el SQL Editor.
2. Crea el usuario del dueño en *Authentication > Users* y dale rol con el `insert` comentado al final del SQL.
3. `cp .env.example .env.local` y rellena las claves (Supabase, Resend, email del dueño).
4. `npm install && npm run dev`

## Rebrandear para un cliente

Solo se toca `config/site.ts` (nombre, logo, color, teléfono, WhatsApp, horario, zona horaria) y los iconos de `public/icons/`.

## Estructura

```
config/site.ts                 Marca y horario del local
supabase/schema.sql            Tablas, restricción anti-solapes, RLS, función book_appointment
types/database.ts              Tipos de la BD (formato supabase gen types)
actions/appointments.ts        getAvailableSlots, bookAppointment, updateAppointmentStatus
actions/notifications.ts       sendImmediateAlert (email al dueño con Resend)
actions/auth.ts                Login / logout del equipo
lib/slots.ts (+ .test.ts)      Cálculo de huecos libres
lib/whatsapp.ts                generateWhatsAppReminderLink
lib/supabase/                  Clientes de Supabase (servidor, admin, navegador)
app/page.tsx                   Flujo de reserva público
app/dashboard/page.tsx         Agenda del día (tiempo real)
app/login/page.tsx             Acceso del equipo
app/manifest.ts, public/sw.js  PWA instalable
```

## Cómo se evitan las dobles reservas

1. `bookAppointment` comprueba en el servidor que la hora está dentro del horario y libre.
2. La función SQL `book_appointment` inserta cliente y cita en una transacción.
3. La restricción `appointments_no_overlap` (exclusión GiST sobre `barber_id` + `tstzrange`) hace que Postgres rechace cualquier cita solapada, aunque lleguen dos a la vez. La app traduce ese error (23P01) a "Alguien acaba de reservar esa hora".

## Comprobaciones

`npm run typecheck` · `npm run lint` · `npm test` · `npm run build`
