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
  servicio text not null,
  barbero text not null,
  inicio timestamptz not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'confirmada', 'otra_hora', 'rechazada', 'cancelada')),
  created_at timestamptz not null default now()
);
create index if not exists peticiones_cliente_idx on public.peticiones (cliente_telefono, created_at desc);

-- Lo que espera el bot de cada barbero (p. ej. que escriba la otra hora que propone).
create table if not exists public.esperas (
  telefono text primary key,
  peticion_id bigint not null references public.peticiones (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Nadie entra desde fuera: RLS activado y sin políticas (el servidor usa service_role).
alter table public.mensajes enable row level security;
alter table public.recibidos enable row level security;
alter table public.peticiones enable row level security;
alter table public.esperas enable row level security;
