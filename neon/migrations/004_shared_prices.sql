-- Base compartilhada de preços, lojas globais e histórico imutável por compra
create extension if not exists pg_trgm;

-- Redes de varejo (Carrefour, Assaí, etc.)
create table if not exists public.retail_chains (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

insert into public.retail_chains (name, slug) values
  ('Carrefour', 'carrefour'),
  ('Assaí Atacadista', 'assai'),
  ('Nova Era', 'nova-era'),
  ('Atacadão', 'atacadao'),
  ('Extra', 'extra')
on conflict (slug) do nothing;

-- Filiais / pontos de venda compartilhados
create table if not exists public.store_locations (
  id uuid primary key default gen_random_uuid(),
  chain_id uuid references public.retail_chains (id) on delete set null,
  name text not null,
  city text,
  neighborhood text,
  address text,
  lat numeric(10, 7),
  lng numeric(10, 7),
  created_at timestamptz not null default now()
);

create index if not exists store_locations_city_idx on public.store_locations (city);
create index if not exists store_locations_chain_idx on public.store_locations (chain_id);

-- Perfil: cidade padrão para filtros
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists neighborhood text;

-- Produto: embalagem e EAN único quando informado
alter table public.products add column if not exists package_size text;

create unique index if not exists products_barcode_unique_idx
  on public.products (barcode)
  where barcode is not null;

create index if not exists products_name_trgm_idx
  on public.products using gin (name gin_trgm_ops);

-- Supermercados do usuário: vínculo opcional com loja global + localização
alter table public.supermarkets add column if not exists chain_id uuid references public.retail_chains (id) on delete set null;
alter table public.supermarkets add column if not exists store_location_id uuid references public.store_locations (id) on delete set null;
alter table public.supermarkets add column if not exists city text;
alter table public.supermarkets add column if not exists neighborhood text;

-- Observações de preço (base compartilhada)
create table if not exists public.price_observations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  store_location_id uuid references public.store_locations (id) on delete set null,
  supermarket_id uuid references public.supermarkets (id) on delete set null,
  unit_price numeric(12, 2) not null check (unit_price > 0),
  quantity numeric(12, 3) not null default 1 check (quantity > 0),
  line_total numeric(12, 2) generated always as (round(quantity * unit_price, 2)) stored,
  city text,
  neighborhood text,
  submitted_by uuid not null references public.users (id) on delete cascade,
  list_id uuid references public.shopping_lists (id) on delete set null,
  status text not null default 'verified'
    check (status in ('pending', 'verified', 'rejected', 'suspicious')),
  source text not null default 'list_complete'
    check (source in ('list_complete', 'manual', 'ocr')),
  recorded_at timestamptz not null default now()
);

create index if not exists price_observations_product_recorded_idx
  on public.price_observations (product_id, recorded_at desc);

create index if not exists price_observations_city_product_idx
  on public.price_observations (city, product_id, recorded_at desc)
  where status = 'verified';

create index if not exists price_observations_submitted_idx
  on public.price_observations (submitted_by, recorded_at desc);

-- Snapshot imutável da compra (histórico individual detalhado)
create table if not exists public.purchase_snapshots (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null unique references public.shopping_lists (id) on delete cascade,
  owner_id uuid not null references public.users (id) on delete cascade,
  supermarket_id uuid references public.supermarkets (id) on delete set null,
  supermarket_name text,
  store_location_id uuid references public.store_locations (id) on delete set null,
  city text,
  neighborhood text,
  completed_at timestamptz not null,
  list_total numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists purchase_snapshots_owner_idx
  on public.purchase_snapshots (owner_id, completed_at desc);

create table if not exists public.purchase_snapshot_items (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.purchase_snapshots (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  product_name text not null,
  brand text,
  unit text not null,
  package_size text,
  quantity numeric(12, 3) not null,
  unit_price numeric(12, 2) not null,
  line_total numeric(12, 2) not null
);

create index if not exists purchase_snapshot_items_snapshot_idx
  on public.purchase_snapshot_items (snapshot_id);

-- Classifica observação (outliers simples)
create or replace function public.classify_price_observation(
  p_product_id uuid,
  p_unit_price numeric,
  p_city text
)
returns text
language sql
stable
as $$
  with med as (
    select percentile_cont(0.5) within group (order by unit_price) as m
    from public.price_observations
    where product_id = p_product_id
      and status = 'verified'
      and recorded_at > now() - interval '90 days'
      and (
        p_city is null
        or city is null
        or lower(city) = lower(p_city)
      )
  )
  select case
    when (select m from med) is null then 'verified'
    when p_unit_price < (select m from med) * 0.05 then 'suspicious'
    when p_unit_price > (select m from med) * 5 then 'suspicious'
    else 'verified'
  end;
$$;

-- Busca de preços compartilhados (última observação por produto + loja)
create or replace function public.search_shared_product_prices(
  p_query text,
  p_city text default null,
  p_limit int default 40
)
returns table (
  product_id uuid,
  product_name text,
  brand text,
  unit text,
  package_size text,
  store_name text,
  city text,
  unit_price numeric,
  recorded_at timestamptz,
  freshness_label text
)
language sql
stable
as $$
  with matching as (
    select p.id, p.name, p.brand, p.unit, p.package_size
    from public.products p
    where length(trim(coalesce(p_query, ''))) > 0
      and (
        p.name ilike '%' || trim(p_query) || '%'
        or coalesce(p.brand, '') ilike '%' || trim(p_query) || '%'
        or coalesce(p.package_size, '') ilike '%' || trim(p_query) || '%'
      )
    limit 80
  ),
  ranked as (
    select
      po.product_id,
      po.unit_price,
      po.recorded_at,
      coalesce(sl.name, sm.name, 'Mercado') as store_name,
      coalesce(po.city, sl.city, sm.city) as obs_city,
      m.name as product_name,
      m.brand,
      m.unit,
      m.package_size,
      row_number() over (
        partition by po.product_id,
          coalesce(po.store_location_id::text, po.supermarket_id::text, 'unknown')
        order by po.recorded_at desc
      ) as rn
    from public.price_observations po
    join matching m on m.id = po.product_id
    left join public.store_locations sl on sl.id = po.store_location_id
    left join public.supermarkets sm on sm.id = po.supermarket_id
    where po.status = 'verified'
      and (
        p_city is null
        or trim(p_city) = ''
        or lower(coalesce(po.city, sl.city, sm.city, '')) = lower(trim(p_city))
      )
  )
  select
    r.product_id,
    r.product_name,
    r.brand,
    r.unit,
    r.package_size,
    r.store_name,
    r.obs_city as city,
    r.unit_price,
    r.recorded_at,
    case
      when r.recorded_at >= now() - interval '1 hour' then 'agora'
      when r.recorded_at >= now() - interval '24 hours' then 'hoje'
      when r.recorded_at >= now() - interval '48 hours' then 'ontem'
      when r.recorded_at >= now() - interval '7 days' then 'esta semana'
      else 'antigo'
    end as freshness_label
  from ranked r
  where r.rn = 1
  order by r.recorded_at desc, r.product_name, r.store_name
  limit coalesce(p_limit, 40);
$$;

-- Estatísticas agregadas por produto (região opcional)
create or replace function public.get_product_price_stats(
  p_product_id uuid,
  p_city text default null
)
returns json
language sql
stable
as $$
  with obs as (
    select po.unit_price, po.recorded_at, po.supermarket_id, po.store_location_id
    from public.price_observations po
    where po.product_id = p_product_id
      and po.status = 'verified'
      and po.recorded_at > now() - interval '90 days'
      and (
        p_city is null
        or trim(p_city) = ''
        or lower(coalesce(po.city, '')) = lower(trim(p_city))
      )
  ),
  agg as (
    select
      min(unit_price) as min_price,
      max(unit_price) as max_price,
      round(avg(unit_price)::numeric, 2) as avg_price,
      count(*)::int as sample_count,
      max(recorded_at) as last_recorded_at
    from obs
  ),
  last_price as (
    select unit_price from obs order by recorded_at desc limit 1
  ),
  first_month as (
    select unit_price from obs
    where recorded_at > now() - interval '30 days'
    order by recorded_at asc
    limit 1
  ),
  last_month as (
    select unit_price from obs
    where recorded_at > now() - interval '30 days'
    order by recorded_at desc
    limit 1
  )
  select json_build_object(
    'min_price', (select min_price from agg),
    'max_price', (select max_price from agg),
    'avg_price', (select avg_price from agg),
    'last_price', (select unit_price from last_price),
    'sample_count', (select sample_count from agg),
    'last_recorded_at', (select last_recorded_at from agg),
    'trend_30d_pct',
      case
        when (select unit_price from first_month) is null
          or (select unit_price from first_month) = 0
        then null
        else round(
          (
            ((select unit_price from last_month) - (select unit_price from first_month))
            / (select unit_price from first_month)
            * 100
          )::numeric,
          1
        )
      end
  );
$$;

-- Comparar cesta: total se todos os itens forem comprados no mesmo mercado (quando houver preço)
create or replace function public.compare_list_basket_prices(
  p_list_id uuid,
  p_city text default null
)
returns table (
  store_key text,
  store_name text,
  estimated_total numeric,
  items_priced int,
  items_total int
)
language sql
stable
as $$
  with items as (
    select li.product_id, li.quantity
    from public.list_items li
    where li.list_id = p_list_id
  ),
  stores as (
    select distinct
      coalesce(po.store_location_id::text, po.supermarket_id::text, 'unknown') as store_key,
      coalesce(sl.name, sm.name, 'Mercado') as store_name
    from public.price_observations po
    join items i on i.product_id = po.product_id
    left join public.store_locations sl on sl.id = po.store_location_id
    left join public.supermarkets sm on sm.id = po.supermarket_id
    where po.status = 'verified'
      and po.recorded_at > now() - interval '30 days'
      and (
        p_city is null
        or trim(p_city) = ''
        or lower(coalesce(po.city, sl.city, sm.city, '')) = lower(trim(p_city))
      )
  ),
  priced as (
    select
      s.store_key,
      s.store_name,
      i.product_id,
      i.quantity,
      (
        select po.unit_price
        from public.price_observations po
        where po.product_id = i.product_id
          and po.status = 'verified'
          and po.recorded_at > now() - interval '30 days'
          and coalesce(po.store_location_id::text, po.supermarket_id::text, 'unknown') = s.store_key
          and (
            p_city is null
            or trim(p_city) = ''
            or lower(coalesce(po.city, '')) = lower(trim(p_city))
          )
        order by po.recorded_at desc
        limit 1
      ) as unit_price
    from items i
    cross join stores s
  )
  select
    p.store_key,
    p.store_name,
    sum(round(p.quantity * p.unit_price, 2))::numeric(12, 2) as estimated_total,
    count(p.unit_price)::int as items_priced,
    (select count(*)::int from items) as items_total
  from priced p
  where p.unit_price is not null
  group by p.store_key, p.store_name
  order by estimated_total asc nulls last;
$$;
