-- Function to handle new user profile creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for auto profile creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Dashboard stats function
create or replace function public.get_dashboard_stats(uid uuid)
returns table (
  total_products bigint,
  total_stores bigint,
  purchases_this_month bigint,
  avg_monthly_spend numeric,
  inflation_percentage numeric
) language sql as $$
  select
    (select count(*) from public.products where user_id = uid),
    (select count(*) from public.stores where user_id = uid),
    (select count(*) from public.purchases where user_id = uid and purchase_date >= date_trunc('month', current_date)),
    (select coalesce(avg(monthly_total), 0) from (
      select sum(total_price) as monthly_total
      from public.purchases
      where user_id = uid
      group by date_trunc('month', purchase_date)
    ) sub),
    (select coalesce(
      case
        when old_avg = 0 then 0
        else round(((new_avg - old_avg) / old_avg) * 100, 1)
      end, 0
    ) from (
      select
        (select coalesce(avg(unit_price), 0) from public.purchases
         where user_id = uid and purchase_date >= date_trunc('month', current_date) - interval '1 month'
         and purchase_date < date_trunc('month', current_date)) as old_avg,
        (select coalesce(avg(unit_price), 0) from public.purchases
         where user_id = uid and purchase_date >= date_trunc('month', current_date)) as new_avg
    ) calc);
$$;

-- Product price stats function
create or replace function public.get_product_price_stats(uid uuid, pid uuid)
returns table (
  lowest_price numeric,
  highest_price numeric,
  average_price numeric,
  last_price numeric
) language sql as $$
  select
    coalesce(min(unit_price), 0),
    coalesce(max(unit_price), 0),
    coalesce(round(avg(unit_price), 2), 0),
    coalesce((select unit_price from public.purchases where user_id = uid and product_id = pid order by purchase_date desc limit 1), 0)
  from public.purchases
  where user_id = uid and product_id = pid;
$$;

-- Lowest price function
create or replace function public.get_lowest_price(uid uuid, pid uuid)
returns numeric language sql as $$
  select coalesce(min(unit_price), 0)
  from public.purchases
  where user_id = uid and product_id = pid;
$$;

-- Highest price function
create or replace function public.get_highest_price(uid uuid, pid uuid)
returns numeric language sql as $$
  select coalesce(max(unit_price), 0)
  from public.purchases
  where user_id = uid and product_id = pid;
$$;

-- Average price function
create or replace function public.get_average_price(uid uuid, pid uuid)
returns numeric language sql as $$
  select coalesce(round(avg(unit_price), 2), 0)
  from public.purchases
  where user_id = uid and product_id = pid;
$$;

-- Price change percentage function
create or replace function public.get_price_change_percentage(uid uuid, pid uuid)
returns numeric language sql as $$
  select coalesce(
    case
      when old_price = 0 then 0
      else round(((new_price - old_price) / old_price) * 100, 1)
    end, 0
  ) from (
    select
      (select unit_price from public.purchases
       where user_id = uid and product_id = pid
       order by purchase_date desc limit 1 offset 1) as old_price,
      (select unit_price from public.purchases
       where user_id = uid and product_id = pid
       order by purchase_date desc limit 1) as new_price
  ) calc;
$$;

-- Personal inflation function
create or replace function public.get_personal_inflation(uid uuid)
returns table (
  product_name text,
  old_avg_price numeric,
  new_avg_price numeric,
  inflation_pct numeric
) language sql as $$
  select
    p.canonical_name,
    coalesce(old_calc.avg_price, 0),
    coalesce(new_calc.avg_price, 0),
    case
      when coalesce(old_calc.avg_price, 0) = 0 then 0
      else round(((coalesce(new_calc.avg_price, 0) - old_calc.avg_price) / old_calc.avg_price) * 100, 1)
    end
  from public.products p
  left join lateral (
    select avg(pr.unit_price) as avg_price
    from public.purchases pr
    where pr.user_id = uid and pr.product_id = p.id
    and pr.purchase_date >= date_trunc('month', current_date) - interval '6 months'
    and pr.purchase_date < date_trunc('month', current_date) - interval '3 months'
  ) old_calc on true
  left join lateral (
    select avg(pr.unit_price) as avg_price
    from public.purchases pr
    where pr.user_id = uid and pr.product_id = p.id
    and pr.purchase_date >= date_trunc('month', current_date) - interval '3 months'
  ) new_calc on true
  where p.user_id = uid
  order by abs(case
    when coalesce(old_calc.avg_price, 0) = 0 then 0
    else ((coalesce(new_calc.avg_price, 0) - old_calc.avg_price) / old_calc.avg_price) * 100
  end) desc
  limit 10;
$$;

-- Admin platform stats function
create or replace function public.get_admin_stats()
returns table (
  total_users bigint,
  total_products bigint,
  total_stores bigint,
  total_purchases bigint,
  active_users bigint
) language sql as $$
  select
    (select count(*) from public.profiles),
    (select count(*) from public.products),
    (select count(*) from public.stores),
    (select count(*) from public.purchases),
    (select count(*) from public.profiles where is_active = true and created_at >= now() - interval '30 days');
$$;

-- Store analytics function
create or replace function public.get_store_stats(uid uuid, sid uuid)
returns table (
  total_purchases bigint,
  total_spent numeric,
  avg_spend numeric,
  unique_products bigint
) language sql as $$
  select
    count(*),
    coalesce(sum(total_price), 0),
    coalesce(round(avg(total_price), 2), 0),
    count(distinct product_id)
  from public.purchases
  where user_id = uid and store_id = sid;
$$;

-- Price trend data function
create or replace function public.get_price_trend(uid uuid, pid uuid, period text default 'monthly')
returns table (
  date_label text,
  avg_price numeric,
  purchase_count bigint
) language sql as $$
  select
    case
      when period = 'daily' then to_char(purchase_date, 'YYYY-MM-DD')
      when period = 'weekly' then to_char(purchase_date, 'YYYY-"W"IW')
      else to_char(purchase_date, 'YYYY-MM')
    end as date_label,
    round(avg(unit_price), 2),
    count(*)
  from public.purchases
  where user_id = uid and product_id = pid
  group by date_label
  order by date_label;
$$;

-- Spending trend function
create or replace function public.get_spending_trend(uid uuid)
returns table (
  month_label text,
  total_spend numeric,
  purchase_count bigint
) language sql as $$
  select
    to_char(purchase_date, 'YYYY-MM') as month_label,
    round(sum(total_price), 2),
    count(*)
  from public.purchases
  where user_id = uid
  group by month_label
  order by month_label desc
  limit 12;
$$;
