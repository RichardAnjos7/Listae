-- Catálogo: imagem, subcategoria e busca atualizada
alter table public.products add column if not exists subcategory text;
alter table public.products add column if not exists image_url text;

create index if not exists products_subcategory_idx on public.products (subcategory)
  where subcategory is not null;

drop function if exists public.search_catalog_products(text, uuid, int);

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
  subcategory text,
  image_url text,
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
      p.subcategory,
      p.image_url,
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
      or coalesce(p.subcategory, '') ilike '%' || (select term from q) || '%'
      or (p.barcode is not null and p.barcode = (select term from q))
    )
  )
  select *
  from filtered
  order by rank_score desc, is_global desc, name asc
  limit coalesce(p_limit, 20);
$$;
