-- Khan Chaye POS — migration 009
-- Run this once in the Supabase SQL editor, after 008_inventory.sql.
--
-- Collective bills printed for a client: which orders were on the bill, so it
-- can be reprinted later (from any device) with the orders' current status.

create table if not exists client_bills (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  order_ids   uuid[] not null,
  period      text not null,
  total       numeric(12,2) not null,
  printed_by  text,
  created_at  timestamptz not null default now()
);
create index if not exists client_bills_client_idx on client_bills (client_id, created_at desc);
alter table client_bills enable row level security;
