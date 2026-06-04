-- Login por usuário (e-mail permanece para contas Google)
alter table public.users add column if not exists username text;

update public.users
set username = lower(
  case
    when email like '%@%' then split_part(email, '@', 1)
    else email
  end
)
where username is null and password_hash is not null;

alter table public.users alter column email drop not null;

create unique index if not exists users_username_unique on public.users (username)
  where username is not null;
