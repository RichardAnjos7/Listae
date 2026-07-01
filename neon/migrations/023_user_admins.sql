-- Administradores do catálogo (além do usuário raiz super_dev)
alter table public.users
  add column if not exists is_admin boolean not null default false;

update public.users
set is_admin = true
where username = 'super_dev';

create index if not exists users_is_admin_idx on public.users (is_admin)
  where is_admin = true;
