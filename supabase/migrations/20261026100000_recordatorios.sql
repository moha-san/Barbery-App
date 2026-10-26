-- Varios recordatorios por cita (p. ej. 24 h y 1 h antes). Se guardan las horas ya avisadas.
alter table public.appointments add column recordatorios_enviados smallint[] not null default '{}';
alter table public.appointments drop column if exists recordatorio_enviado;
