-- Função faz INSERT quando a loja não existe; não pode ser STABLE.
create or replace function public.resolve_store_location_for_supermarket(
  p_chain_id uuid,
  p_name text,
  p_city text,
  p_neighborhood text default null
)
returns uuid
language plpgsql
volatile
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
