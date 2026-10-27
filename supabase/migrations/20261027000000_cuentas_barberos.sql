-- Cada barbero con su propia cuenta: solo ve sus citas y su caja. El dueño (admin) lo ve todo.
-- Se pega entero en Supabase > SQL Editor y Run. Se puede ejecutar dos veces sin romper nada.

-- Qué ficha de barbero es de qué cuenta.
alter table public.barbers add column if not exists user_id uuid references public.users (id) on delete set null;
create unique index if not exists barbers_user_id_key on public.barbers (user_id);

-- La ficha de barbero de quien ha entrado (null si es el dueño o no tiene ficha).
create or replace function public.my_barber_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select b.id from public.barbers b
  join public.users u on u.id = b.user_id
  where b.user_id = auth.uid() and u.rol = 'barbero'
  limit 1;
$$;

-- ¿Puede ver las citas de este barbero? El dueño, todas. Un barbero con ficha, solo las suyas.
-- Un barbero sin ficha enlazada sigue viéndolo todo (como antes), para no dejar a nadie sin agenda.
create or replace function public.can_see_barber(p_barber_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or (public.is_staff() and coalesce(public.my_barber_id() = p_barber_id, true));
$$;

drop policy if exists "appointments: personal lee" on public.appointments;
create policy "appointments: personal lee" on public.appointments
  for select to authenticated using (public.can_see_barber(barber_id));
drop policy if exists "appointments: personal actualiza" on public.appointments;
create policy "appointments: personal actualiza" on public.appointments
  for update to authenticated using (public.can_see_barber(barber_id)) with check (public.can_see_barber(barber_id));
