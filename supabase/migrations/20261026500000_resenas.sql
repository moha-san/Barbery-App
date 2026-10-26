-- Reseña de Google automática: el enlace se pone en Ajustes y cada cita guarda si ya se pidió.
-- Se pega entero en Supabase > SQL Editor y Run. Se puede ejecutar dos veces sin romper nada.
alter table public.shop_settings add column if not exists google_review_url text;
alter table public.appointments add column if not exists resena_enviada boolean not null default false;
-- Las citas antiguas no reciben el aviso.
update public.appointments set resena_enviada = true where end_time < now();
