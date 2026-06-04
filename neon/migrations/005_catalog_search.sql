-- Busca de catálogo: prioriza globais, EAN exato, similaridade de nome
create or replace function public.search_catalog_products(
  p_query text,
  p_user_id uuid default null,
  p_limit int default 20
)
returns table (
  id uuid,
  name text,
  brand text,
  unit text,
  package_size text,
  barcode text,
  category_id uuid,
  is_global boolean,
  rank_score numeric
)
language sql
stable
as $$
  with q as (
    select trim(coalesce(p_query, '')) as term
  ),
  filtered as (
    select
      p.id,
      p.name,
      p.brand,
      p.unit,
      p.package_size,
      p.barcode,
      p.category_id,
      p.is_global,
      (
        case when (select term from q) = '' then 0::numeric
        when p.barcode is not null and p.barcode = (select term from q) then 100::numeric
        when p.is_global then 10::numeric
        else 5::numeric
        end
        + coalesce(similarity(p.name, (select term from q)), 0) * 20
        + coalesce(similarity(coalesce(p.brand, ''), (select term from q)), 0) * 5
      ) as rank_score
    from public.products p, q
    where (
      p.is_global = true
      or (p_user_id is not null and p.created_by = p_user_id)
    )
    and (
      (select term from q) = ''
      or p.name ilike '%' || (select term from q) || '%'
      or coalesce(p.brand, '') ilike '%' || (select term from q) || '%'
      or coalesce(p.package_size, '') ilike '%' || (select term from q) || '%'
      or (p.barcode is not null and p.barcode = (select term from q))
    )
  )
  select *
  from filtered
  order by rank_score desc, is_global desc, name asc
  limit coalesce(p_limit, 20);
$$;

-- Resolve ou cria vínculo de loja global para supermercado do usuário
create or replace function public.resolve_store_location_for_supermarket(
  p_chain_id uuid,
  p_name text,
  p_city text,
  p_neighborhood text default null
)
returns uuid
language plpgsql
stable
as $$
declare
  loc_id uuid;
  cname text;
begin
  if p_chain_id is null or p_city is null or trim(p_city) = '' then
    return null;
  end if;

  select id into loc_id
  from public.store_locations
  where chain_id = p_chain_id
    and lower(city) = lower(trim(p_city))
    and lower(name) = lower(trim(p_name))
  limit 1;

  if loc_id is not null then
    return loc_id;
  end if;

  select name into cname from public.retail_chains where id = p_chain_id;

  insert into public.store_locations (chain_id, name, city, neighborhood)
  values (
    p_chain_id,
    coalesce(nullif(trim(p_name), ''), cname, 'Loja'),
    trim(p_city),
    nullif(trim(coalesce(p_neighborhood, '')), '')
  )
  returning id into loc_id;

  return loc_id;
end;
$$;
