-- Khan Chaye POS — migration 006
-- Run this once in the Supabase SQL editor, after 005_order_editing.sql.
-- Adds clients (e.g. "Dollar Shop" — a regular bulk/business buyer) that an
-- order can be tagged with.

create table if not exists clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Normalized (lowercase, spaces/punctuation stripped) uniqueness so "Dollar
-- Shop", "dollarshop" and "DOLLAR-SHOP" can't all end up as separate rows —
-- matches the normalizeClientName() logic in the app.
create unique index if not exists clients_name_unique_idx
  on clients (regexp_replace(lower(name), '[^a-z0-9]+', '', 'g'));

alter table clients enable row level security;

drop trigger if exists clients_set_updated_at on clients;
create trigger clients_set_updated_at
  before update on clients
  for each row execute function set_updated_at(); -- defined in sql/schema.sql

-- orders.client_name is a snapshot (same pattern as order_items.item_name)
-- so a renamed/deleted client doesn't rewrite history.
alter table orders add column if not exists client_id uuid references clients(id) on delete set null;
alter table orders add column if not exists client_name text;

-- edit_order() needs to accept the client too — replace it with a version
-- that also updates client_id/client_name.
create or replace function edit_order(
  p_order_id uuid,
  p_items jsonb,
  p_payment_method text,
  p_note text,
  p_editor text,
  p_client_id uuid default null,
  p_client_name text default null
) returns void as $$
declare
  v_subtotal numeric(10,2);
begin
  if not exists (select 1 from orders where id = p_order_id) then
    raise exception 'Order % not found', p_order_id;
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'An order must have at least one item — cancel it instead of saving it empty.';
  end if;

  delete from order_items where order_id = p_order_id;

  insert into order_items (order_id, item_id, item_name, unit_price, quantity, parcel_qty, parcel_fee, line_total)
  select
    p_order_id,
    nullif(elem->>'item_id', '')::uuid,
    elem->>'item_name',
    (elem->>'unit_price')::numeric,
    (elem->>'quantity')::int,
    (elem->>'parcel_qty')::int,
    (elem->>'parcel_fee')::numeric,
    (elem->>'line_total')::numeric
  from jsonb_array_elements(p_items) as elem;

  select coalesce(sum(line_total), 0) into v_subtotal from order_items where order_id = p_order_id;

  update orders
  set subtotal = v_subtotal,
      total = v_subtotal,
      payment_method = p_payment_method,
      note = nullif(p_note, ''),
      client_id = p_client_id,
      client_name = p_client_name,
      edited_at = now(),
      edited_by = p_editor
  where id = p_order_id;
end;
$$ language plpgsql;
