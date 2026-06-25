-- "Hora de recomprar" passa a usar aniversário mensal da compra
-- (mesma data do mês anterior), com tolerância de +/-2 dias.

drop function if exists public.get_repurchase_suggestions(uuid, int);

create or replace function public.get_repurchase_suggestions(
  p_user_id uuid,
  p_limit int default 5
)
returns table (
  product_id uuid,
  product_name text,
  brand text,
  target_day int,
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
  agg as (
    select
      product_id,
      max(product_name) as product_name,
      max(brand) as brand,
      max(completed_at) as last_at,
      count(distinct completed_at) as purchase_count
    from product_dates
    group by product_id
  ),
  calc as (
    select
      *,
      floor(extract(epoch from (now() - last_at)) / 86400.0)::int as days_since_last,
      -- dia-alvo = dia da última compra, limitado ao último dia do mês atual
      least(
        extract(day from last_at)::int,
        extract(day from ((date_trunc('month', now()) + interval '1 month') - interval '1 day'))::int
      ) as target_day,
      extract(day from now())::int as today_day
    from agg
  )
  select
    product_id,
    product_name,
    nullif(brand, '') as brand,
    target_day,
    days_since_last,
    purchase_count::int as purchase_count,
    last_at
  from calc
  where purchase_count >= 1
    and days_since_last >= 25
    and abs(today_day - target_day) <= 2
  order by abs(today_day - target_day) asc, days_since_last desc
  limit coalesce(p_limit, 5);
$$;
