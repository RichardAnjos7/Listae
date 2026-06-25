-- Dashboard "Para você": recompra recorrente + quedas em produtos do usuário

-- 1) Sugestões de recompra com base na cadência das compras concluídas
create or replace function public.get_repurchase_suggestions(
  p_user_id uuid,
  p_limit int default 5
)
returns table (
  product_id uuid,
  product_name text,
  brand text,
  avg_interval_days int,
  days_since_last int,
  purchase_count int,
  last_at timestamptz
)
language sql
stable
as $$
  with product_dates as (
    select distinct
      psi.product_id,
      psi.product_name,
      psi.brand,
      ps.completed_at
    from public.purchase_snapshots ps
    join public.purchase_snapshot_items psi on psi.snapshot_id = ps.id
    where ps.owner_id = p_user_id
  ),
  ordered as (
    select
      product_id,
      product_name,
      brand,
      completed_at,
      lag(completed_at) over (partition by product_id order by completed_at) as prev_at
    from product_dates
  ),
  agg as (
    select
      product_id,
      max(product_name) as product_name,
      max(brand) as brand,
      avg(extract(epoch from (completed_at - prev_at)) / 86400.0)
        filter (where prev_at is not null) as avg_interval_days,
      max(completed_at) as last_at,
      count(distinct completed_at) as purchase_count
    from ordered
    group by product_id
  )
  select
    product_id,
    product_name,
    nullif(brand, '') as brand,
    round(avg_interval_days)::int as avg_interval_days,
    floor(extract(epoch from (now() - last_at)) / 86400.0)::int as days_since_last,
    purchase_count::int as purchase_count,
    last_at
  from agg
  where purchase_count >= 2
    and avg_interval_days is not null
    and avg_interval_days > 0
    and extract(epoch from (now() - last_at)) / 86400.0 >= avg_interval_days * 0.8
  order by
    (extract(epoch from (now() - last_at)) / 86400.0) / nullif(avg_interval_days, 0) desc
  limit coalesce(p_limit, 5);
$$;

-- 2) Quedas de preço apenas para produtos que o usuário já comprou
create or replace function public.get_personal_price_drops(
  p_user_id uuid,
  p_city text default null,
  p_limit int default 5
)
returns table (
  product_id uuid,
  product_name text,
  brand text,
  store_name text,
  city text,
  previous_price numeric,
  current_price numeric,
  drop_pct numeric,
  recorded_at timestamptz
)
language sql
stable
as $$
  with user_products as (
    select distinct psi.product_id
    from public.purchase_snapshots ps
    join public.purchase_snapshot_items psi on psi.snapshot_id = ps.id
    where ps.owner_id = p_user_id
    union
    select distinct li.product_id
    from public.list_items li
    join public.shopping_lists sl on sl.id = li.list_id
    where sl.owner_id = p_user_id
      and sl.status = 'completed'
  ),
  city_obs as (
    select
      po.product_id,
      po.unit_price,
      po.recorded_at,
      coalesce(sl.name, sm.name, 'Mercado') as store_name,
      coalesce(po.city, sl.city, sm.city) as obs_city,
      coalesce(po.store_location_id::text, po.supermarket_id::text, 'unknown') as store_key,
      p.name as product_name,
      p.brand
    from public.price_observations po
    join public.products p on p.id = po.product_id
    join user_products up on up.product_id = po.product_id
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
  ranked as (
    select
      *,
      row_number() over (
        partition by product_id, store_key
        order by recorded_at desc
      ) as rn
    from city_obs
  ),
  pairs as (
    select
      c.product_id,
      c.product_name,
      c.brand,
      c.store_name,
      c.obs_city as city,
      p.unit_price as previous_price,
      c.unit_price as current_price,
      c.recorded_at
    from ranked c
    join ranked p
      on p.product_id = c.product_id
     and p.store_key = c.store_key
     and p.rn = c.rn + 1
    where c.rn = 1
      and c.unit_price < p.unit_price
      and c.recorded_at > now() - interval '21 days'
  )
  select
    pairs.product_id,
    pairs.product_name,
    nullif(pairs.brand, '') as brand,
    pairs.store_name,
    pairs.city,
    pairs.previous_price,
    pairs.current_price,
    round(
      ((pairs.previous_price - pairs.current_price) / nullif(pairs.previous_price, 0) * 100)::numeric,
      1
    ) as drop_pct,
    pairs.recorded_at
  from pairs
  order by drop_pct desc nulls last, pairs.recorded_at desc
  limit coalesce(p_limit, 5);
$$;
