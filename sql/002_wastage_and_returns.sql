-- Khan Chaye POS — migration 002
-- Run this once in the Supabase SQL editor, after sql/schema.sql.
-- Adds: a 'returned' order status (separate from 'voided'), and a wastage log.

alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check check (status in ('completed','voided','returned'));

create table if not exists wastage (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid references items(id) on delete set null,
  description     text not null,
  category        text not null default 'Raw Material',
  quantity        integer not null default 1 check (quantity > 0),
  estimated_cost  numeric(10,2) not null default 0 check (estimated_cost >= 0),
  wastage_date    date not null default current_date,
  created_by      text,
  created_at      timestamptz not null default now()
);

create index if not exists wastage_date_idx on wastage (wastage_date desc);

alter table wastage enable row level security;
-- (service-role only, same as every other table — see sql/schema.sql for why)
