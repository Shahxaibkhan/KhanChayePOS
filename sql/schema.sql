-- Khan Chaye POS — Supabase schema
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).

create extension if not exists pgcrypto;

-- ───────────────────────── items ─────────────────────────
create table if not exists items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null default 'General',
  price       numeric(10,2) not null check (price >= 0),
  cost        numeric(10,2) not null default 0 check (cost >= 0),
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists items_category_idx on items (category);
create index if not exists items_active_idx on items (is_active);

-- ───────────────────────── orders ─────────────────────────
create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  order_number   bigint generated always as identity,
  created_at     timestamptz not null default now(),
  subtotal       numeric(10,2) not null default 0,
  total          numeric(10,2) not null default 0,
  payment_method text not null default 'cash' check (payment_method in ('cash','card','online')),
  note           text,
  created_by     text,
  status         text not null default 'completed' check (status in ('completed','voided'))
);

create index if not exists orders_created_at_idx on orders (created_at desc);
create index if not exists orders_status_idx on orders (status);

-- ─────────────────────── order_items ───────────────────────
create table if not exists order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  item_id     uuid references items(id) on delete set null,
  item_name   text not null,
  unit_price  numeric(10,2) not null,
  quantity    integer not null check (quantity > 0),
  line_total  numeric(10,2) not null
);

create index if not exists order_items_order_id_idx on order_items (order_id);

-- ───────────────────────── expenses ─────────────────────────
create table if not exists expenses (
  id            uuid primary key default gen_random_uuid(),
  description   text not null,
  category      text not null default 'General',
  amount        numeric(10,2) not null check (amount >= 0),
  expense_date  date not null default current_date,
  created_by    text,
  created_at    timestamptz not null default now()
);

create index if not exists expenses_date_idx on expenses (expense_date desc);

-- ───────────────────────── RLS ─────────────────────────
-- The app only ever talks to Supabase from the server using the service-role
-- key (which bypasses RLS), so we lock every table down with RLS enabled and
-- zero policies. Nothing can read/write these tables via the public anon key.
alter table items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table expenses enable row level security;

-- keep updated_at fresh on items
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists items_set_updated_at on items;
create trigger items_set_updated_at
  before update on items
  for each row execute function set_updated_at();

-- a few starter items so the POS isn't empty on first run — edit/delete freely from Admin
insert into items (name, category, price, sort_order) values
  ('Doodh Patti', 'Chaye', 80, 1),
  ('Kadak Chaye', 'Chaye', 80, 2),
  ('Green Tea', 'Chaye', 70, 3),
  ('Aloo Paratha', 'Paratha', 150, 10),
  ('Plain Paratha', 'Paratha', 80, 11),
  ('Paratha Roll', 'Paratha', 180, 12)
on conflict do nothing;
