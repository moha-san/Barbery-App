-- Página propia de cada barbero (para el enlace de su Instagram).
-- Se pega entero en Supabase > SQL Editor (o `npx supabase db push`). Se puede ejecutar dos veces sin romper nada.

-- Enlace bonito (/barbero/carlos) y su usuario de Instagram.
alter table public.barbers add column if not exists slug text;
alter table public.barbers add column if not exists instagram text;
create unique index if not exists barbers_slug_key on public.barbers (slug);

-- Rellena el enlace de los barberos que ya existen a partir de su nombre ("José Luis" → "jose-luis").
update public.barbers b
set slug = trim(both '-' from regexp_replace(lower(translate(b.nombre, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')), '[^a-z0-9]+', '-', 'g'))
           || case when exists (
                select 1 from public.barbers o
                where o.id < b.id
                  and lower(translate(o.nombre, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')) = lower(translate(b.nombre, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'))
              ) then '-' || left(b.id::text, 4) else '' end
where b.slug is null;

-- Fotos de la galería que son de un barbero concreto (vacío = foto del local).
alter table public.gallery_photos add column if not exists barber_id uuid references public.barbers (id) on delete set null;
create index if not exists gallery_photos_barber_idx on public.gallery_photos (barber_id);
