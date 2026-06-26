-- Motor de notificações: preferências por tipo + log de dedupe (anti-spam)

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.users (id) on delete cascade,
  price_alert boolean not null default true,
  list_activity boolean not null default true,
  repurchase boolean not null default true,
  price_drop boolean not null default true,
  weekly_digest boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Registro do que já foi enviado, para não repetir a mesma notificação.
-- A chave de dedupe embute uma janela de tempo (ex.: mês/semana).
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  dedupe_key text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists notification_log_user_key_idx
  on public.notification_log (user_id, dedupe_key);

create index if not exists notification_log_created_idx
  on public.notification_log (created_at);
