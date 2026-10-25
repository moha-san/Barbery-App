-- Esquema completo de la barbería (single-tenant). Ejecutar una vez en Supabase > SQL Editor.
-- Todas las horas se guardan en timestamptz (UTC). La zona del local vive en config/site.ts.

create extension if not exists btree_gist;

-- ─── Tipos ────────────────────────────────────────────────────────────────
create type public.user_role as enum ('admin', 'barbero', 'cliente');
create type public.appointment_status as enum ('confirmada', 'completada', 'no_presentado', 'cancelada');

-- ─── Tablas ───────────────────────────────────────────────────────────────
-- Personal (admin/barbero): id = auth.users.id. Clientes: id aleatorio, sin cuenta, identificados por teléfono.
create table public.users (
  id uuid primary key default gen_random_uuid(),
  rol public.user_role not null default 'cliente',
  nombre text not null check (char_length(nombre) between 1 and 100),
  telefono text not null check (telefono ~ '^\+?[0-9]{6,15}$'),
  email text,
  created_at timestamptz not null default now()
);
-- Un cliente por teléfono (permite el upsert al reservar).
create unique index users_cliente_telefono_key on public.users (telefono) where rol = 'cliente';

create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  avatar_url text,
  especialidad text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  duracion_min integer not null check (duracion_min between 5 and 480),
  precio numeric(10, 2) not null check (precio >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers (id) on delete restrict,
  client_id uuid not null references public.users (id) on delete restrict,
  service_id uuid not null references public.services (id) on delete restrict,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status public.appointment_status not null default 'confirmada',
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  -- Anti double-booking: Postgres rechaza (error 23P01) cualquier cita que se solape
  -- con otra no cancelada del mismo barbero, incluso con dos inserciones en el mismo milisegundo.
  constraint appointments_no_overlap exclude using gist (
    barber_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  ) where (status <> 'cancelada')
);
create index appointments_start_time_idx on public.appointments (start_time);

-- ─── Helpers ──────────────────────────────────────────────────────────────
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and rol in ('admin', 'barbero')
  );
$$;

-- Reserva atómica: crea/actualiza el cliente y la cita en una sola transacción.
-- La duración sale de la tabla services, nunca del navegador.
create or replace function public.book_appointment(
  p_barber_id uuid,
  p_service_id uuid,
  p_start_time timestamptz,
  p_nombre text,
  p_telefono text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duracion integer;
  v_client_id uuid;
  v_appointment_id uuid;
begin
  select duracion_min into v_duracion from services where id = p_service_id and activo;
  if v_duracion is null then
    raise exception 'Servicio no disponible' using errcode = 'P0002';
  end if;

  if not exists (select 1 from barbers where id = p_barber_id and activo) then
    raise exception 'Barbero no disponible' using errcode = 'P0002';
  end if;

  insert into users (rol, nombre, telefono)
  values ('cliente', p_nombre, p_telefono)
  on conflict (telefono) where rol = 'cliente'
  do update set nombre = excluded.nombre
  returning id into v_client_id;

  insert into appointments (barber_id, client_id, service_id, start_time, end_time)
  values (p_barber_id, v_client_id, p_service_id, p_start_time, p_start_time + make_interval(mins => v_duracion))
  returning id into v_appointment_id;

  return v_appointment_id;
end;
$$;

-- Solo el servidor (service_role) puede reservar: así se aplican las reglas de horario de la app.
revoke execute on function public.book_appointment(uuid, uuid, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.book_appointment(uuid, uuid, timestamptz, text, text) to service_role;

-- ─── RLS ──────────────────────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;

-- Catálogo público: cualquiera ve barberos y servicios activos; el personal ve todo.
create policy "barbers: lectura pública" on public.barbers
  for select using (activo or public.is_staff());
create policy "barbers: gestión personal" on public.barbers
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "services: lectura pública" on public.services
  for select using (activo or public.is_staff());
create policy "services: gestión personal" on public.services
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Usuarios: cada uno ve su fila; el personal ve a todos (necesita el teléfono del cliente).
create policy "users: leer propio o personal" on public.users
  for select to authenticated using (id = auth.uid() or public.is_staff());
create policy "users: personal gestiona" on public.users
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- Citas: solo el personal las ve y cambia de estado. Los clientes reservan vía servidor.
create policy "appointments: personal lee" on public.appointments
  for select to authenticated using (public.is_staff());
create policy "appointments: personal actualiza" on public.appointments
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- ─── Realtime para el dashboard ───────────────────────────────────────────
alter publication supabase_realtime add table public.appointments;

-- ─── Datos de ejemplo (borrar en producción) ──────────────────────────────
insert into public.barbers (nombre, avatar_url, especialidad) values
  ('Carlos', null, 'Degradados'),
  ('Lucía', null, 'Barba y afeitado clásico');

insert into public.services (nombre, duracion_min, precio) values
  ('Corte', 30, 15),
  ('Corte + barba', 45, 22),
  ('Arreglo de barba', 20, 10);

-- Alta del personal: crea el usuario en Authentication > Users y luego:
-- insert into public.users (id, rol, nombre, telefono, email)
-- values ('<uuid de auth.users>', 'admin', 'Dueño', '+34600000000', 'dueno@barberia.com');
