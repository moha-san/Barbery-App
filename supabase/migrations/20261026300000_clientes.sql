-- Ficha de cliente (notas) y lista de espera.
-- Se pega entero en Supabase > SQL Editor (o `npx supabase db push`). Se puede ejecutar dos veces sin romper nada.

-- ─── Notas del cliente ("le gusta el degradado bajo", "alérgico a…") ─────────
alter table public.users add column if not exists notas text;
alter table public.users drop constraint if exists users_notas_len;
alter table public.users add constraint users_notas_len check (char_length(notas) <= 1000);

-- ─── Lista de espera: clientes que quieren hueco en un día completo ───────
-- barber_id vacío = le vale cualquier barbero. Se apunta desde la web (vía servidor).
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  barber_id uuid references public.barbers (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  nombre text not null check (char_length(nombre) between 1 and 100),
  telefono text not null check (telefono ~ '^\+?[0-9]{6,15}$'),
  created_at timestamptz not null default now(),
  unique (fecha, telefono)
);
create index if not exists waitlist_fecha_idx on public.waitlist (fecha);
alter table public.waitlist enable row level security;
drop policy if exists "waitlist: personal gestiona" on public.waitlist;
create policy "waitlist: personal gestiona" on public.waitlist
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
