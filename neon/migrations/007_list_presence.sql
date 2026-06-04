-- Presença em tempo real na lista compartilhada (heartbeat)
create table if not exists public.list_presence (
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  user_name text not null default '',
  last_seen_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create index if not exists list_presence_list_seen_idx
  on public.list_presence (list_id, last_seen_at desc);
