-- iList: schema Neon (sem Supabase Auth / RLS / Realtime)
create extension if not exists "pgcrypto";

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references public.users (id) on delete cascade,
  name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  unit text not null default 'un',
  category_id uuid references public.categories (id) on delete set null,
  barcode text,
  is_global boolean not null default false,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index products_category_id_idx on public.products (category_id);
create index products_name_idx on public.products (name);

create table public.supermarkets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index supermarkets_user_id_idx on public.supermarkets (user_id);

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  supermarket_id uuid references public.supermarkets (id) on delete set null,
  owner_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  share_code text unique,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shopping_lists_owner_idx on public.shopping_lists (owner_id);
create index shopping_lists_share_code_idx on public.shopping_lists (share_code);

create table public.list_collaborators (
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  joined_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create or replace function public.user_can_access_list(list_uuid uuid, p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.shopping_lists sl
    where sl.id = list_uuid
      and (
        sl.owner_id = p_user_id
        or exists (
          select 1 from public.list_collaborators lc
          where lc.list_id = sl.id and lc.user_id = p_user_id
        )
      )
  );
$$;

create or replace function public.join_list_by_code(code text, p_user_id uuid)
returns uuid
language plpgsql
as $$
declare
  lid uuid;
begin
  if code is null or length(trim(code)) = 0 then
    raise exception 'Código inválido';
  end if;
  select id into lid
  from public.shopping_lists
  where share_code = trim(code)
    and status = 'active';
  if lid is null then
    raise exception 'Lista não encontrada';
  end if;
  if exists (
    select 1 from public.shopping_lists sl
    where sl.id = lid and sl.owner_id = p_user_id
  ) then
    return lid;
  end if;
  insert into public.list_collaborators (list_id, user_id, role)
  values (lid, p_user_id, 'editor')
  on conflict (list_id, user_id) do nothing;
  return lid;
end;
$$;

create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity numeric(12, 3) not null default 1,
  unit_price numeric(12, 2),
  checked boolean not null default false,
  added_by uuid references public.profiles (id) on delete set null,
  checked_by uuid references public.profiles (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index list_items_list_id_idx on public.list_items (list_id);

create table public.favorite_products (
  user_id uuid not null references public.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table public.price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  supermarket_id uuid references public.supermarkets (id) on delete set null,
  price numeric(12, 2) not null,
  recorded_at timestamptz not null default now(),
  list_id uuid references public.shopping_lists (id) on delete set null
);

create index price_history_product_recorded_idx on public.price_history (product_id, recorded_at desc);
create index price_history_supermarket_idx on public.price_history (supermarket_id, recorded_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger shopping_lists_updated_at
  before update on public.shopping_lists
  for each row execute function public.set_updated_at();

create trigger list_items_updated_at
  before update on public.list_items
  for each row execute function public.set_updated_at();

create or replace function public.get_most_bought_products(p_user_id uuid, p_limit int default 10)
returns table (
  product_id uuid,
  product_name text,
  brand text,
  unit text,
  times_bought bigint,
  last_price numeric
)
language sql
stable
as $$
  select
    p.id,
    p.name,
    coalesce(p.brand, '') as brand,
    p.unit,
    count(li.id) as times_bought,
    (
      select ph.price
      from public.price_history ph
      where ph.product_id = p.id
      order by ph.recorded_at desc
      limit 1
    ) as last_price
  from public.list_items li
  join public.products p on p.id = li.product_id
  join public.shopping_lists sl on sl.id = li.list_id
  where sl.owner_id = p_user_id
    and sl.status = 'completed'
  group by p.id, p.name, p.brand, p.unit
  order by times_bought desc
  limit coalesce(p_limit, 10);
$$;

create or replace function public.get_price_variations(p_user_id uuid, p_limit int default 15)
returns table (
  product_id uuid,
  product_name text,
  current_price numeric,
  previous_price numeric,
  variation_pct numeric,
  direction text
)
language sql
stable
as $$
  with ranked as (
    select
      ph.product_id,
      ph.price,
      row_number() over (partition by ph.product_id order by ph.recorded_at desc) as rn
    from public.price_history ph
    join public.shopping_lists sl on sl.id = ph.list_id
    where sl.owner_id = p_user_id
  ),
  pairs as (
    select
      c.product_id,
      c.price as current_price,
      p.price as previous_price
    from ranked c
    join ranked p on p.product_id = c.product_id and p.rn = c.rn + 1
    where c.rn = 1
  )
  select
    pr.id as product_id,
    pr.name as product_name,
    pairs.current_price,
    pairs.previous_price,
    round(
      ((pairs.current_price - pairs.previous_price) / nullif(pairs.previous_price, 0) * 100)::numeric,
      1
    ) as variation_pct,
    case
      when pairs.current_price > pairs.previous_price then 'up'
      when pairs.current_price < pairs.previous_price then 'down'
      else 'flat'
    end as direction
  from pairs
  join public.products pr on pr.id = pairs.product_id
  where pairs.current_price is distinct from pairs.previous_price
  order by abs(pairs.current_price - pairs.previous_price) desc
  limit coalesce(p_limit, 15);
$$;

create or replace function public.compare_supermarket_prices(p_user_id uuid)
returns table (
  supermarket_id uuid,
  supermarket_name text,
  trip_count bigint,
  avg_total numeric,
  last_total numeric
)
language sql
stable
as $$
  with totals as (
    select
      sl.id as list_id,
      sl.supermarket_id,
      sm.name as supermarket_name,
      coalesce(sum(li.quantity * coalesce(li.unit_price, 0)), 0)::numeric(12, 2) as list_total
    from public.shopping_lists sl
    left join public.supermarkets sm on sm.id = sl.supermarket_id
    join public.list_items li on li.list_id = sl.id
    where sl.owner_id = p_user_id
      and sl.status = 'completed'
      and sl.supermarket_id is not null
    group by sl.id, sl.supermarket_id, sm.name
  ),
  by_sm as (
    select
      supermarket_id,
      max(supermarket_name) as supermarket_name,
      count(*)::bigint as trip_count,
      avg(list_total)::numeric(12, 2) as avg_total
    from totals
    group by supermarket_id
  )
  select
    b.supermarket_id,
    b.supermarket_name,
    b.trip_count,
    b.avg_total,
    (
      select t.list_total
      from totals t
      where t.supermarket_id = b.supermarket_id
      order by t.list_id desc
      limit 1
    ) as last_total
  from by_sm b
  order by b.avg_total asc nulls last;
$$;

create or replace function public.get_monthly_stats(p_user_id uuid)
returns json
language sql
stable
as $$
  with month_lists as (
    select sl.id, sl.completed_at
    from public.shopping_lists sl
    where sl.owner_id = p_user_id
      and sl.status = 'completed'
      and sl.completed_at is not null
      and sl.completed_at >= date_trunc('month', now())
  ),
  totals as (
    select coalesce(sum(li.quantity * coalesce(li.unit_price, 0)), 0)::numeric(12, 2) as month_total
    from public.list_items li
    where li.list_id in (select id from month_lists)
  ),
  trip as (
    select count(*)::int as trips from month_lists
  ),
  last_purchase as (
    select sl.completed_at
    from public.shopping_lists sl
    where sl.owner_id = p_user_id and sl.status = 'completed' and sl.completed_at is not null
    order by sl.completed_at desc
    limit 1
  ),
  avg_per_trip as (
    select
      case
        when (select trips from trip) > 0
        then (select month_total from totals) / (select trips from trip)
        else 0::numeric
      end as avg_purchase
  )
  select json_build_object(
    'month_total', (select month_total from totals),
    'trips_this_month', (select trips from trip),
    'avg_per_trip_month', (select avg_purchase from avg_per_trip),
    'last_purchase_at', (select completed_at from last_purchase)
  );
$$;

create or replace function public.get_savings_suggestion(p_user_id uuid)
returns json
language sql
stable
as $$
  with cmp as (
    select * from public.compare_supermarket_prices(p_user_id)
  ),
  best as (
    select * from cmp order by avg_total asc nulls last limit 1
  ),
  worst as (
    select * from cmp order by avg_total desc nulls last limit 1
  )
  select case
    when (select count(*) from cmp) < 2 then json_build_object('has_suggestion', false)
    else json_build_object(
      'has_suggestion', true,
      'best_market_id', (select supermarket_id from best),
      'best_market_name', (select supermarket_name from best),
      'worst_market_name', (select supermarket_name from worst),
      'estimated_savings',
        greatest(
          coalesce((select avg_total from worst), 0) - coalesce((select avg_total from best), 0),
          0
        )
    )
  end;
$$;
