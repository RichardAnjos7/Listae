-- Preço opcional ao cadastrar produto + promoção com validade

alter table public.price_observations
  add column if not exists is_promotion boolean not null default false,
  add column if not exists valid_until timestamptz;

create index if not exists price_observations_promo_valid_idx
  on public.price_observations (valid_until)
  where is_promotion = true and valid_until is not null;

create or replace function public.price_observation_is_active(
  p_is_promotion boolean,
  p_valid_until timestamptz
)
returns boolean
language sql
immutable
as $$
  select
    coalesce(p_is_promotion, false) = false
    or p_valid_until is null
    or p_valid_until >= now();
$$;

drop function if exists public.get_city_live_feed(text, int, timestamptz);

create or replace function public.get_city_live_feed(
  p_city text default null,
  p_limit int default 15,
  p_since timestamptz default null
)
returns table (
  id uuid,
  product_id uuid,
  product_name text,
  brand text,
  store_name text,
  unit_price numeric,
  recorded_at timestamptz,
  is_promotion boolean
)
language sql
stable
as $$
  select
    po.id,
    po.product_id,
    p.name as product_name,
    p.brand,
    coalesce(sl.name, sm.name, 'Mercado') as store_name,
    po.unit_price,
    po.recorded_at,
    coalesce(po.is_promotion, false) as is_promotion
  from public.price_observations po
  join public.products p on p.id = po.product_id
  left join public.store_locations sl on sl.id = po.store_location_id
  left join public.supermarkets sm on sm.id = po.supermarket_id
  where po.status = 'verified'
    and public.price_observation_is_active(po.is_promotion, po.valid_until)
    and (
      p_city is null
      or trim(p_city) = ''
      or lower(coalesce(po.city, sl.city, sm.city, '')) = lower(trim(p_city))
    )
    and (p_since is null or po.recorded_at > p_since)
  order by po.recorded_at desc
  limit coalesce(p_limit, 15);
$$;

create or replace function public.get_city_heat_map_today(
  p_city text default null,
  p_limit int default 10
)
returns table (
  product_id uuid,
  product_name text,
  brand text,
  store_name text,
  unit_price numeric,
  recorded_at timestamptz
)
language sql
stable
as $$
  with today_obs as (
    select
      po.product_id,
      p.name as product_name,
      p.brand,
      coalesce(sl.name, sm.name, 'Mercado') as store_name,
      po.unit_price,
      po.recorded_at,
      row_number() over (
        partition by po.product_id
        order by po.unit_price asc, po.recorded_at desc
      ) as rn
    from public.price_observations po
    join public.products p on p.id = po.product_id
    left join public.store_locations sl on sl.id = po.store_location_id
    left join public.supermarkets sm on sm.id = po.supermarket_id
    where po.status = 'verified'
      and public.price_observation_is_active(po.is_promotion, po.valid_until)
      and po.recorded_at >= date_trunc('day', timezone('utc', now()))
      and (
        p_city is null
        or trim(p_city) = ''
        or lower(coalesce(po.city, sl.city, sm.city, '')) = lower(trim(p_city))
      )
  )
  select product_id, product_name, brand, store_name, unit_price, recorded_at
  from today_obs
  where rn = 1
  order by unit_price asc
  limit coalesce(p_limit, 10);
$$;
