-- Avisos al móvil (Web Push). Se pega en Supabase > SQL Editor o con `npx supabase db push`.

-- Un móvil/navegador que acepta avisos. user_id es el personal (avisos de reservas nuevas)
-- o el cliente (recordatorio de su cita). Un mismo móvil solo se guarda una vez (endpoint único).
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

-- Sin políticas: solo el servidor (service_role) lee y escribe. Nadie ve los móviles de otros.
alter table public.push_subscriptions enable row level security;

-- Para no mandar dos veces el recordatorio de la misma cita.
alter table public.appointments add column recordatorio_enviado boolean not null default false;
