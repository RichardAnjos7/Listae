-- Central de notificacoes: tabela geral para todos os tipos (atividade em listas,
-- recompra, quedas de preco, resumos). Alertas de preco seguem em
-- price_alert_notifications e o inbox une as duas fontes.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, is_read, created_at desc);
