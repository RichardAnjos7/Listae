-- Insights comunitários: feed ao vivo, cesta básica, tendências, compradores ativos

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
      count(distinct po.product_id) filter (where po.recorded_at >= now() - interval '30 days'),
    'distinct_users_week',
      count(distinct po.submitted_by) filter (where po.recorded_at >= now() - interval '7 days')
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
  recorded_at timestamptz
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
    po.recorded_at
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
  order by unit_price asc, product_name
  limit coalesce(p_limit, 10);
$$;

create or replace function public.get_city_basket_ranking(p_city text default null)
returns table (
  store_key text,
  store_name text,
  basket_total numeric,
  items_found int,
  items_expected int
)
language sql
stable
as $$
  with basket_terms as (
    select * from (values
      ('arroz'),
      ('feijão'),
      ('feijao'),
      ('leite'),
      ('óleo'),
      ('oleo')
    ) as t(term)
  ),
  basket_products as (
    select distinct on (bt.term)
      bt.term,
      p.id as product_id,
      p.name as product_name
    from basket_terms bt
    join public.products p on p.name ilike '%' || bt.term || '%'
    order by bt.term, p.is_global desc, p.name
  ),
  latest_prices as (
    select distinct on (bp.term, coalesce(po.store_location_id::text, po.supermarket_id::text, 'x'))
      bp.term,
      bp.product_name,
      coalesce(po.store_location_id::text, po.supermarket_id::text, 'unknown') as store_key,
      coalesce(sl.name, sm.name, 'Mercado') as store_name,
      po.unit_price
    from basket_products bp
    join public.price_observations po on po.product_id = bp.product_id
    left join public.store_locations sl on sl.id = po.store_location_id
    left join public.supermarkets sm on sm.id = po.supermarket_id
    where po.status = 'verified'
      and po.recorded_at > now() - interval '30 days'
      and (
        p_city is null
        or trim(p_city) = ''
        or lower(coalesce(po.city, sl.city, sm.city, '')) = lower(trim(p_city))
      )
    order by bp.term, coalesce(po.store_location_id::text, po.supermarket_id::text, 'x'), po.recorded_at desc
  ),
  by_store as (
    select
      store_key,
      max(store_name) as store_name,
      sum(unit_price)::numeric(12, 2) as basket_total,
      count(distinct term)::int as items_found
    from latest_prices
    group by store_key
  )
  select
    store_key,
    store_name,
    basket_total,
    items_found,
    (select count(distinct term)::int from basket_terms) as items_expected
  from by_store
  where items_found >= 2
  order by basket_total asc, store_name;
$$;

create or replace function public.get_community_price_alerts(
  p_city text default null,
  p_limit int default 6
)
returns table (
  product_id uuid,
  product_name text,
  store_name text,
  drop_count bigint,
  avg_drop_pct numeric,
  current_price numeric
)
language sql
stable
as $$
  with today_drops as (
    select
      po.product_id,
      p.name as product_name,
      coalesce(sl.name, sm.name, 'Mercado') as store_name,
      po.unit_price as current_price,
      po.submitted_by,
      lag(po.unit_price) over (
        partition by po.product_id, coalesce(po.store_location_id::text, po.supermarket_id::text, 'x')
        order by po.recorded_at
      ) as prev_price
    from public.price_observations po
    join public.products p on p.id = po.product_id
    left join public.store_locations sl on sl.id = po.store_location_id
    left join public.supermarkets sm on sm.id = po.supermarket_id
    where po.status = 'verified'
      and po.recorded_at >= date_trunc('day', timezone('utc', now()))
      and (
        p_city is null
        or trim(p_city) = ''
        or lower(coalesce(po.city, sl.city, sm.city, '')) = lower(trim(p_city))
      )
  ),
  drops as (
    select
      product_id,
      product_name,
      store_name,
      current_price,
      submitted_by,
      round(((prev_price - current_price) / nullif(prev_price, 0) * 100)::numeric, 1) as drop_pct
    from today_drops
    where prev_price is not null and current_price < prev_price
  )
  select
    product_id,
    max(product_name) as product_name,
    max(store_name) as store_name,
    count(distinct submitted_by)::bigint as drop_count,
    round(avg(drop_pct), 1) as avg_drop_pct,
    min(current_price) as current_price
  from drops
  group by product_id
  having count(distinct submitted_by) >= 1
  order by drop_count desc, avg_drop_pct desc
  limit coalesce(p_limit, 6);
$$;

create or replace function public.get_comparable_basket_stores(
  p_city text default null,
  p_limit int default 8
)
returns table (
  store_key text,
  store_name text,
  basket_total numeric,
  items_matched int
)
language sql
stable
as $$
  with terms(term) as (
    values
      ('arroz'), ('feijão'), ('feijao'), ('leite'), ('óleo'), ('oleo'),
      ('açúcar'), ('acucar'), ('café'), ('cafe'), ('macarrão'), ('macarrao'),
      ('farinha'), ('sal'), ('frango')
  ),
  basket_products as (
    select distinct on (t.term)
      t.term,
      p.id as product_id
    from terms t
    join public.products p on p.name ilike '%' || t.term || '%'
    order by t.term, p.is_global desc
  ),
  latest as (
    select distinct on (bp.term, coalesce(po.store_location_id::text, po.supermarket_id::text, 'x'))
      bp.term,
      coalesce(po.store_location_id::text, po.supermarket_id::text, 'unknown') as store_key,
      coalesce(sl.name, sm.name, 'Mercado') as store_name,
      po.unit_price
    from basket_products bp
    join public.price_observations po on po.product_id = bp.product_id
    left join public.store_locations sl on sl.id = po.store_location_id
    left join public.supermarkets sm on sm.id = po.supermarket_id
    where po.status = 'verified'
      and po.recorded_at > now() - interval '30 days'
      and (
        p_city is null
        or trim(p_city) = ''
        or lower(coalesce(po.city, sl.city, sm.city, '')) = lower(trim(p_city))
      )
    order by bp.term, coalesce(po.store_location_id::text, po.supermarket_id::text, 'x'), po.recorded_at desc
  )
  select
    store_key,
    max(store_name) as store_name,
    sum(unit_price)::numeric(12, 2) as basket_total,
    count(distinct term)::int as items_matched
  from latest
  group by store_key
  having count(distinct term) >= 3
  order by basket_total asc
  limit coalesce(p_limit, 8);
$$;

create or replace function public.get_product_trend_7d(
  p_city text default null,
  p_product_query text default 'arroz'
)
returns table (
  day date,
  avg_price numeric,
  obs_count bigint
)
language sql
stable
as $$
  with target as (
    select p.id
    from public.products p
    where p.name ilike '%' || coalesce(nullif(trim(p_product_query), ''), 'arroz') || '%'
    order by p.is_global desc, length(p.name)
    limit 1
  )
  select
    date_trunc('day', po.recorded_at)::date as day,
    round(avg(po.unit_price), 2) as avg_price,
    count(*)::bigint as obs_count
  from public.price_observations po
  join target t on t.id = po.product_id
  left join public.store_locations sl on sl.id = po.store_location_id
  left join public.supermarkets sm on sm.id = po.supermarket_id
  where po.status = 'verified'
    and po.recorded_at >= now() - interval '7 days'
    and (
      p_city is null
      or trim(p_city) = ''
      or lower(coalesce(po.city, sl.city, sm.city, '')) = lower(trim(p_city))
    )
  group by 1
  order by 1;
$$;

create or replace function public.get_active_shoppers_in_city(p_city text default null)
returns bigint
language sql
stable
as $$
  select count(distinct lp.user_id)::bigint
  from public.list_presence lp
  join public.shopping_lists sl on sl.id = lp.list_id
  left join public.supermarkets sm on sm.id = sl.supermarket_id
  left join public.profiles pr on pr.id = sl.owner_id
  where sl.status = 'active'
    and lp.last_seen_at > now() - interval '3 minutes'
    and (
      p_city is null
      or trim(p_city) = ''
      or lower(coalesce(sm.city, pr.city, '')) = lower(trim(p_city))
    );
$$;
