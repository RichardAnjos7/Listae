-- Feed ao vivo: expor valid_until das promoções na UI

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
  is_promotion boolean,
  valid_until timestamptz
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
    coalesce(po.is_promotion, false) as is_promotion,
    po.valid_until
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
