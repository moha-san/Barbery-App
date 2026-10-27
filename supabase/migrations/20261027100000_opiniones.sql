-- Opiniones con estrellas en la portada: nota media de Google y opiniones que elige el dueño.
-- Se pega entero en Supabase > SQL Editor y Run. Se puede ejecutar dos veces sin romper nada.

-- Nota media y número de reseñas (las que salen en Google Maps). Vacío = no se enseña.
alter table public.shop_settings add column if not exists google_rating numeric(2,1) check (google_rating between 1 and 5);
alter table public.shop_settings add column if not exists google_rating_count integer check (google_rating_count >= 0);

-- Opiniones de clientes que el dueño copia en Ajustes (p. ej. sus favoritas de Google).
create table if not exists public.opiniones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 60),
  estrellas smallint not null default 5 check (estrellas between 1 and 5),
  texto text not null check (char_length(texto) between 1 and 400),
  created_at timestamptz not null default now()
);
alter table public.opiniones enable row level security;
drop policy if exists "opiniones: lectura pública" on public.opiniones;
create policy "opiniones: lectura pública" on public.opiniones for select using (true);
drop policy if exists "opiniones: dueño gestiona" on public.opiniones;
create policy "opiniones: dueño gestiona" on public.opiniones
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
