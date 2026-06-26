-- Resumo mensal + horário de silêncio (quiet hours) nas preferências
alter table public.notification_preferences
  add column if not exists monthly_summary boolean not null default true,
  add column if not exists quiet_hours_enabled boolean not null default false,
  add column if not exists quiet_start smallint not null default 22,
  add column if not exists quiet_end smallint not null default 7,
  add column if not exists utc_offset_minutes integer not null default -180;
