-- Feed de preços na cidade (aba Preços — sem busca)

create or replace function public.get_city_community_stats(p_city text default null)
returns json
language sql
stable
as $$
  select json_build_object(
    'today_count',
      count(*) filter (where po.recorded_at >= date_trunc('day', timezone('utc', now()))),
    'week_count',
      count(*) filter (where po.recorded_at >= now() - interval '7 days'),
    'month_count',
      count(*) filter (where po.recorded_at >= now() - interval '30 days'),
    'distinct_products',
      count(distinct po.product_id) filter (where po.recorded_at >= now() - interval '30 days')
  )
  from public.price_observations po
  left join public.store_locations sl on sl.id = po.store_location_id
  left join public.supermarkets sm on sm.id = po.supermarket_id
  where po.status = 'verified'
    and (
      p_city is null
      or trim(p_city) = ''
      or lower(coalesce(po.city, sl.city, sm.city, '')) = lower(trim(p_city))
    );
$$;

create or replace function public.get_city_price_drops(
  p_city text default null,
  p_limit int default 8
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
  with city_obs as (
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
      and c.recorded_at > now() - interval '14 days'
  )
  select
    pairs.product_id,
    pairs.product_name,
    pairs.brand,
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
  limit coalesce(p_limit, 8);
$$;

create or replace function public.get_city_lowest_prices(
  p_city text default null,
  p_limit int default 10
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
  with city_obs as (
    select
      po.product_id,
      po.unit_price,
      po.recorded_at,
      coalesce(sl.name, sm.name, 'Mercado') as store_name,
      coalesce(po.city, sl.city, sm.city) as obs_city,
      coalesce(po.store_location_id::text, po.supermarket_id::text, 'unknown') as store_key,
      p.name as product_name,
      p.brand,
      p.unit,
      p.package_size,
      row_number() over (
        partition by po.product_id, coalesce(po.store_location_id::text, po.supermarket_id::text, 'unknown')
        order by po.recorded_at desc
      ) as rn
    from public.price_observations po
    join public.products p on p.id = po.product_id
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
  latest_per_store as (
    select * from city_obs where rn = 1
  ),
  lowest as (
    select distinct on (product_id)
      product_id,
      product_name,
      brand,
      unit,
      package_size,
      store_name,
      obs_city as city,
      unit_price,
      recorded_at
    from latest_per_store
    order by product_id, unit_price asc, recorded_at desc
  )
  select
    l.product_id,
    l.product_name,
    l.brand,
    l.unit,
    l.package_size,
    l.store_name,
    l.city,
    l.unit_price,
    l.recorded_at,
    case
      when l.recorded_at >= now() - interval '1 hour' then 'agora'
      when l.recorded_at >= now() - interval '24 hours' then 'hoje'
      when l.recorded_at >= now() - interval '48 hours' then 'ontem'
      when l.recorded_at >= now() - interval '7 days' then 'esta semana'
      else 'antigo'
    end as freshness_label
  from lowest l
  order by l.recorded_at desc, l.product_name
  limit coalesce(p_limit, 10);
$$;

create or replace function public.get_city_recent_prices(
  p_city text default null,
  p_limit int default 8
)
returns table (
  product_id uuid,
  product_name text,
  brand text,
  store_name text,
  city text,
  unit_price numeric,
  recorded_at timestamptz,
  freshness_label text
)
language sql
stable
as $$
  select
    po.product_id,
    p.name as product_name,
    p.brand,
    coalesce(sl.name, sm.name, 'Mercado') as store_name,
    coalesce(po.city, sl.city, sm.city) as city,
    po.unit_price,
    po.recorded_at,
    case
      when po.recorded_at >= now() - interval '1 hour' then 'agora'
      when po.recorded_at >= now() - interval '24 hours' then 'hoje'
      when po.recorded_at >= now() - interval '48 hours' then 'ontem'
      when po.recorded_at >= now() - interval '7 days' then 'esta semana'
      else 'antigo'
    end as freshness_label
  from public.price_observations po
  join public.products p on p.id = po.product_id
  left join public.store_locations sl on sl.id = po.store_location_id
  left join public.supermarkets sm on sm.id = po.supermarket_id
  where po.status = 'verified'
    and (
      p_city is null
      or trim(p_city) = ''
      or lower(coalesce(po.city, sl.city, sm.city, '')) = lower(trim(p_city))
    )
  order by po.recorded_at desc
  limit coalesce(p_limit, 8);
$$;
