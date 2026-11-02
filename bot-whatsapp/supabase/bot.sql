-- Tablas del bot de WhatsApp. Se pega entero en Supabase > SQL Editor y Run.
-- Se puede ejecutar dos veces sin romper nada. Solo el servidor del bot las usa (clave service_role).

-- Conversación con cada cliente, para que el bot recuerde lo que se habló.
create table if not exists public.mensajes (
  id bigint generated always as identity primary key,
  telefono text not null,
  rol text not null check (rol in ('cliente', 'bot')),
  texto text not null,
  created_at timestamptz not null default now()
);
create index if not exists mensajes_telefono_idx on public.mensajes (telefono, created_at desc);

-- Mensajes de WhatsApp ya procesados: WhatsApp a veces manda el mismo dos veces.
create table if not exists public.recibidos (
  wa_id text primary key,
  created_at timestamptz not null default now()
);

-- Peticiones de cita que el barbero tiene que pasar a Booksy.
create table if not exists public.peticiones (
  id bigint generated always as identity primary key,
  cliente_telefono text not null,
  cliente_nombre text not null,
  local text not null default '',
  servicio text not null,
  barbero text not null,
  inicio timestamptz not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'confirmada', 'otra_hora', 'rechazada', 'cancelada')),
  recordada boolean not null default false, -- ya se le recordó al barbero
  cliente_avisado boolean not null default false, -- ya se le dijo al cliente que sigue pendiente
  resena_pedida boolean not null default false, -- ya se le pidió la reseña de Google
  created_at timestamptz not null default now()
);
alter table public.peticiones add column if not exists local text not null default '';
alter table public.peticiones add column if not exists recordada boolean not null default false;
alter table public.peticiones add column if not exists cliente_avisado boolean not null default false;
alter table public.peticiones add column if not exists resena_pedida boolean not null default false;
create index if not exists peticiones_cliente_idx on public.peticiones (cliente_telefono, created_at desc);

-- Lo que espera el bot de cada barbero (p. ej. que escriba la otra hora que propone).
create table if not exists public.esperas (
  telefono text primary key,
  peticion_id bigint not null references public.peticiones (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Clientes a los que ya se escribió para que vuelvan (para no repetir).
create table if not exists public.recuperados (
  telefono text primary key,
  enviado_at timestamptz not null default now()
);

-- Clientes con los que habla el dueño desde el panel: el bot no contesta hasta "hasta".
create table if not exists public.pausas (
  telefono text primary key,
  hasta timestamptz not null
);

-- Nadie entra desde fuera: RLS activado y sin políticas (el servidor usa service_role).
alter table public.mensajes enable row level security;
alter table public.recibidos enable row level security;
alter table public.peticiones enable row level security;
alter table public.esperas enable row level security;
alter table public.recuperados enable row level security;
alter table public.pausas enable row level security;

-- Recordatorios de citas sin contestar: llama al bot cada 5 minutos.
-- Cambia la dirección y la contraseña (CRON_SECRET de Vercel) antes de ejecutarlo.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('bot-recordatorios') where exists (select 1 from cron.job where jobname = 'bot-recordatorios');
select cron.schedule(
  'bot-recordatorios',
  '*/5 * * * *',
  $$ select net.http_get(
       url := 'https://TU-BOT.vercel.app/api/recordatorios',
       headers := jsonb_build_object('Authorization', 'Bearer TU_CRON_SECRET')
     ) $$
);
