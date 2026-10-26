-- Panel de ajustes del dueño: horario, días libres, fotos y cancelación por el cliente.
-- Se pega entero en Supabase > SQL Editor (o `npx supabase db push`). Se puede ejecutar dos veces sin romper nada.

-- Solo el dueño (admin) cambia precios, barberos, horario y fotos.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.users where id = auth.uid() and rol = 'admin');
$$;

-- ─── Ajustes del local (una sola fila) ────────────────────────────────────
-- business_hours: {"0": [], "1": [{"open":"10:00","close":"14:00"}, ...], ...}. Si está vacío se usa config/site.ts.
create table if not exists public.shop_settings (
  id smallint primary key default 1 check (id = 1),
  business_hours jsonb,
  hero_url text,
  logo_url text,
  updated_at timestamptz not null default now()
);
alter table public.shop_settings enable row level security;
drop policy if exists "shop_settings: lectura pública" on public.shop_settings;
create policy "shop_settings: lectura pública" on public.shop_settings for select using (true);
drop policy if exists "shop_settings: dueño gestiona" on public.shop_settings;
create policy "shop_settings: dueño gestiona" on public.shop_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ─── Días libres, vacaciones y descansos ──────────────────────────────────
-- barber_id vacío = cierra toda la barbería.
create table if not exists public.time_off (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid references public.barbers (id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  motivo text check (char_length(motivo) <= 100),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists time_off_range_idx on public.time_off (start_time, end_time);
alter table public.time_off enable row level security;
drop policy if exists "time_off: personal gestiona" on public.time_off;
create policy "time_off: personal gestiona" on public.time_off
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ─── Galería de fotos ─────────────────────────────────────────────────────
create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  path text not null,
  created_at timestamptz not null default now()
);
alter table public.gallery_photos enable row level security;
drop policy if exists "gallery: lectura pública" on public.gallery_photos;
create policy "gallery: lectura pública" on public.gallery_photos for select using (true);
drop policy if exists "gallery: dueño gestiona" on public.gallery_photos;
create policy "gallery: dueño gestiona" on public.gallery_photos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Carpeta pública "fotos" en Storage. Cualquiera las ve; solo el dueño sube y borra.
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true) on conflict (id) do nothing;
drop policy if exists "fotos: dueño sube" on storage.objects;
create policy "fotos: dueño sube" on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos' and public.is_admin());
drop policy if exists "fotos: dueño borra" on storage.objects;
create policy "fotos: dueño borra" on storage.objects
  for delete to authenticated using (bucket_id = 'fotos' and public.is_admin());
