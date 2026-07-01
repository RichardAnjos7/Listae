-- Submissões de produtos ao catálogo (moderação pelo admin)

create table if not exists public.product_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  unit text not null default 'un',
  package_size text,
  category_id uuid references public.categories (id) on delete set null,
  image_staging_path text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid not null references public.users (id) on delete cascade,
  reviewed_by uuid references public.users (id) on delete set null,
  reviewed_at timestamptz,
  reject_reason text,
  product_id uuid references public.products (id) on delete set null,
  unit_price numeric,
  supermarket_id uuid references public.supermarkets (id) on delete set null,
  is_promotion boolean not null default false,
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists product_submissions_pending_idx
  on public.product_submissions (created_at desc)
  where status = 'pending';

create index if not exists product_submissions_submitted_by_idx
  on public.product_submissions (submitted_by, created_at desc);
