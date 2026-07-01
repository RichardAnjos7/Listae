-- Famílias de produto: genérico (sem marca) + variantes com marca
alter table public.products
  add column if not exists base_product_id uuid references public.products (id) on delete set null;

create index if not exists products_base_product_id_idx
  on public.products (base_product_id)
  where base_product_id is not null;

-- Cria produtos genéricos para marcas existentes que ainda não têm pai
insert into public.products (name, brand, unit, category_id, is_global, created_by)
select distinct p.name, null, p.unit, p.category_id, true, null::uuid
from public.products p
where p.brand is not null
  and p.is_global = true
  and not exists (
    select 1
    from public.products g
    where g.brand is null
      and g.name = p.name
      and g.unit = p.unit
      and g.category_id is not distinct from p.category_id
  );

-- Vincula variantes ao genérico
update public.products p
set base_product_id = g.id
from public.products g
where p.brand is not null
  and g.brand is null
  and p.name = g.name
  and p.unit = g.unit
  and p.category_id is not distinct from g.category_id
  and p.base_product_id is null;

-- Variantes de um produto (genérico ou marca específica)
create or replace function public.get_product_brand_variants(
  p_product_id uuid,
  p_user_id uuid default null,
  p_supermarket_id uuid default null,
  p_limit int default 30
)
returns table (
  id uuid,
  name text,
  brand text,
  unit text,
  package_size text,
  barcode text,
  category_id uuid,
  image_url text,
  last_price numeric
)
language sql
stable
as $$
  with anchor as (
    select
      coalesce(p.base_product_id, p.id) as family_id,
      p.id as self_id
    from public.products p
    where p.id = p_product_id
    limit 1
  )
  select
    v.id,
    v.name,
    v.brand,
    v.unit,
    v.package_size,
    v.barcode,
    v.category_id,
    v.image_url,
    (
      select ph.price
      from public.price_history ph
      where ph.product_id = v.id
        and (
          p_supermarket_id is null
          or ph.supermarket_id = p_supermarket_id
        )
      order by
        case when p_supermarket_id is not null and ph.supermarket_id = p_supermarket_id then 0 else 1 end,
        ph.recorded_at desc
      limit 1
    ) as last_price
  from anchor a
  join public.products v on v.base_product_id = a.family_id
  where v.brand is not null
    and (
      v.is_global = true
      or (p_user_id is not null and v.created_by = p_user_id)
    )
  order by v.brand asc nulls last, v.name asc
  limit coalesce(p_limit, 30);
$$;

-- Comparação de cesta: genéricos usam o menor preço entre variantes na loja
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
  pricing_products as (
    select i.product_id, i.quantity, i.product_id as price_product_id
    from items i
    where not exists (
      select 1 from public.products v where v.base_product_id = i.product_id
    )
    union all
    select i.product_id, i.quantity, v.id as price_product_id
    from items i
    join public.products v on v.base_product_id = i.product_id
  ),
  stores as (
    select distinct
      coalesce(po.store_location_id::text, po.supermarket_id::text, 'unknown') as store_key,
      coalesce(sl.name, sm.name, 'Mercado') as store_name
    from public.price_observations po
    join pricing_products pp on pp.price_product_id = po.product_id
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
      pp.product_id,
      pp.quantity,
      min(vp.unit_price) as unit_price
    from pricing_products pp
    cross join stores s
    join lateral (
      select po.unit_price
      from public.price_observations po
      where po.product_id = pp.price_product_id
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
    ) vp on true
    group by s.store_key, s.store_name, pp.product_id, pp.quantity
  ),
  item_totals as (
    select
      p.store_key,
      p.store_name,
      p.product_id,
      p.quantity,
      p.unit_price
    from priced p
    where p.unit_price is not null
  )
  select
    t.store_key,
    t.store_name,
    sum(round(t.quantity * t.unit_price, 2))::numeric(12, 2) as estimated_total,
    count(distinct t.product_id)::int as items_priced,
    (select count(*)::int from items) as items_total
  from item_totals t
  group by t.store_key, t.store_name
  order by estimated_total asc nulls last;
$$;
