-- Alertas de preço e notificações
create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  city text,
  alert_type text not null check (alert_type in ('below_price', 'rise_pct')),
  target_price numeric(12, 2),
  threshold_pct numeric(5, 2) default 10,
  is_active boolean not null default true,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  constraint price_alerts_target_check check (
    (alert_type = 'below_price' and target_price is not null and target_price > 0)
    or (alert_type = 'rise_pct' and threshold_pct is not null and threshold_pct > 0)
  )
);

create unique index if not exists price_alerts_user_product_type_idx
  on public.price_alerts (user_id, product_id, alert_type);

create index if not exists price_alerts_user_active_idx
  on public.price_alerts (user_id, is_active);

create table if not exists public.price_alert_notifications (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.price_alerts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  message text not null,
  observed_price numeric(12, 2),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists price_alert_notifications_user_unread_idx
  on public.price_alert_notifications (user_id, is_read, created_at desc);

-- Avalia alertas após nova observação de preço na região
create or replace function public.evaluate_price_alerts(
  p_product_id uuid,
  p_unit_price numeric,
  p_city text
)
returns int
language plpgsql
as $$
declare
  alert_rec record;
  baseline numeric;
  rise_pct numeric;
  inserted int := 0;
  pname text;
begin
  select name into pname from public.products where id = p_product_id;

  for alert_rec in
    select pa.*
    from public.price_alerts pa
    where pa.product_id = p_product_id
      and pa.is_active = true
      and (
        pa.last_triggered_at is null
        or pa.last_triggered_at < now() - interval '24 hours'
      )
      and (
        pa.city is null
        or trim(pa.city) = ''
        or (
          p_city is not null
          and lower(trim(pa.city)) = lower(trim(p_city))
        )
      )
  loop
    if alert_rec.alert_type = 'below_price' then
      if p_unit_price <= alert_rec.target_price then
        insert into public.price_alert_notifications (
          alert_id, user_id, product_id, message, observed_price
        )
        values (
          alert_rec.id,
          alert_rec.user_id,
          p_product_id,
          format(
            '%s está a R$ %s em %s (seu alvo: até R$ %s)',
            pname,
            to_char(p_unit_price, 'FM999990D00'),
            coalesce(p_city, 'sua região'),
            to_char(alert_rec.target_price, 'FM999990D00')
          ),
          p_unit_price
        );
        update public.price_alerts
        set last_triggered_at = now()
        where id = alert_rec.id;
        inserted := inserted + 1;
      end if;
    elsif alert_rec.alert_type = 'rise_pct' then
      select round(avg(po.unit_price)::numeric, 2) into baseline
      from public.price_observations po
      where po.product_id = p_product_id
        and po.status = 'verified'
        and po.recorded_at > now() - interval '30 days'
        and po.unit_price <> p_unit_price
        and (
          alert_rec.city is null
          or trim(alert_rec.city) = ''
          or lower(coalesce(po.city, '')) = lower(trim(alert_rec.city))
        );

      if baseline is not null and baseline > 0 then
        rise_pct := round(((p_unit_price - baseline) / baseline * 100)::numeric, 1);
        if rise_pct >= alert_rec.threshold_pct then
          insert into public.price_alert_notifications (
            alert_id, user_id, product_id, message, observed_price
          )
          values (
            alert_rec.id,
            alert_rec.user_id,
            p_product_id,
            format(
              '%s subiu %s%% (agora R$ %s, média R$ %s)',
              pname,
              rise_pct,
              to_char(p_unit_price, 'FM999990D00'),
              to_char(baseline, 'FM999990D00')
            ),
            p_unit_price
          );
          update public.price_alerts
          set last_triggered_at = now()
          where id = alert_rec.id;
          inserted := inserted + 1;
        end if;
      end if;
    end if;
  end loop;

  return inserted;
end;
$$;

create or replace function public.get_unread_alert_count(p_user_id uuid)
returns int
language sql
stable
as $$
  select count(*)::int
  from public.price_alert_notifications
  where user_id = p_user_id and is_read = false;
$$;
