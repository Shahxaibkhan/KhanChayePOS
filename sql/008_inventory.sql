-- Khan Chaye POS — migration 008
-- Run this once in the Supabase SQL editor, after 007_pending_payment.sql.
--
-- Inventory: ingredients with a stock level and a low-stock threshold,
-- recipes saying how much of each ingredient one unit of a menu item uses,
-- and triggers that keep stock in step with orders:
--   * an order line is added   -> its ingredients are deducted
--   * an order line is removed -> they're added back (edit_order() deletes
--                                 and re-inserts lines, so edits net out)
--   * an order is voided       -> everything on it is added back
-- Pending and returned orders still count as used (the chai was made).
-- Only orders placed after this migration touch stock.

-- ───────────────────────── tables ─────────────────────────
create table if not exists ingredients (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  unit           text not null,                    -- kg, L, g, pcs ...
  stock          numeric(12,3) not null default 0, -- may go negative if not restocked in the app
  low_threshold  numeric(12,3) not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table ingredients enable row level security;

drop trigger if exists ingredients_set_updated_at on ingredients;
create trigger ingredients_set_updated_at
  before update on ingredients
  for each row execute function set_updated_at(); -- defined in sql/schema.sql

create table if not exists recipes (
  item_id        uuid not null references items(id) on delete cascade,
  ingredient_id  uuid not null references ingredients(id) on delete cascade,
  qty_per_unit   numeric(12,4) not null check (qty_per_unit > 0),
  primary key (item_id, ingredient_id)
);
alter table recipes enable row level security;

-- Manual stock changes only (deliveries and stock counts); sales are derived
-- from orders and aren't logged here.
create table if not exists stock_movements (
  id             uuid primary key default gen_random_uuid(),
  ingredient_id  uuid not null references ingredients(id) on delete cascade,
  change         numeric(12,3) not null,
  reason         text not null check (reason in ('restock', 'count')),
  note           text,
  created_by     text,
  created_at     timestamptz not null default now()
);
create index if not exists stock_movements_created_idx on stock_movements (created_at desc);
alter table stock_movements enable row level security;

-- ───────────────────────── stock triggers ─────────────────────────
create or replace function apply_item_stock(p_item_id uuid, p_qty numeric) returns void as $$
  update ingredients g
  set stock = g.stock - p_qty * r.qty_per_unit
  from recipes r
  where r.item_id = p_item_id and r.ingredient_id = g.id;
$$ language sql;

create or replace function order_items_stock() returns trigger as $$
declare
  v_status text;
begin
  if tg_op = 'INSERT' then
    select status into v_status from orders where id = new.order_id;
    if v_status is distinct from 'voided' then
      perform apply_item_stock(new.item_id, new.quantity);
    end if;
    return new;
  else
    -- Parent may already be gone (cascade delete of a failed order): null
    -- status means it was never voided, so the stock goes back.
    select status into v_status from orders where id = old.order_id;
    if v_status is distinct from 'voided' then
      perform apply_item_stock(old.item_id, -old.quantity);
    end if;
    return old;
  end if;
end;
$$ language plpgsql;

drop trigger if exists order_items_stock on order_items;
create trigger order_items_stock
  after insert or delete on order_items
  for each row execute function order_items_stock();

create or replace function orders_void_stock() returns trigger as $$
begin
  if new.status = 'voided' and old.status is distinct from 'voided' then
    perform apply_item_stock(oi.item_id, -oi.quantity) from order_items oi where oi.order_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists orders_void_stock on orders;
create trigger orders_void_stock
  after update of status on orders
  for each row execute function orders_void_stock();

-- ───────────────────────── manual stock changes ─────────────────────────
create or replace function restock_ingredient(p_id uuid, p_qty numeric, p_by text, p_note text default null)
returns void as $$
begin
  update ingredients set stock = stock + p_qty where id = p_id;
  insert into stock_movements (ingredient_id, change, reason, note, created_by)
  values (p_id, p_qty, 'restock', p_note, p_by);
end;
$$ language plpgsql;

-- Physical count: sets the stock to what's actually on the shelf.
create or replace function count_ingredient(p_id uuid, p_count numeric, p_by text)
returns void as $$
declare
  v_old numeric;
begin
  select stock into v_old from ingredients where id = p_id for update;
  update ingredients set stock = p_count where id = p_id;
  insert into stock_movements (ingredient_id, change, reason, created_by)
  values (p_id, p_count - coalesce(v_old, 0), 'count', p_by);
end;
$$ language plpgsql;

-- ───────────────────────── starter data ─────────────────────────
-- Generic estimates — edit them in Admin → Inventory. Stock starts at 0:
-- do a stock count once so the levels are real.
insert into ingredients (name, unit, low_threshold) values
  ('Milk',            'kg',  5),
  ('Tea leaves',      'g',   250),
  ('Sugar',           'kg',  2),
  ('Gur',             'kg',  0.5),
  ('Coffee',          'g',   50),
  ('Cooking oil',     'L',   2),
  ('Flour',           'kg',  2),
  ('Eggs',            'pcs', 12),
  ('Samosas',         'pcs', 20),
  ('Chicken nuggets', 'pcs', 10),
  ('Roll wraps',      'pcs', 10),
  ('Water bottles',   'pcs', 6)
on conflict (name) do nothing;

-- 1 kg milk ≈ 5 regular cups (0.2 kg each); large ≈ 0.3 kg.
insert into recipes (item_id, ingredient_id, qty_per_unit)
select i.id, g.id, v.qty
from (values
  ('Karak Chaye (Regular)', 'Milk', 0.2),   ('Karak Chaye (Regular)', 'Tea leaves', 5),   ('Karak Chaye (Regular)', 'Sugar', 0.015),
  ('Karak Chaye (Large)',   'Milk', 0.3),   ('Karak Chaye (Large)',   'Tea leaves', 7),   ('Karak Chaye (Large)',   'Sugar', 0.02),
  ('Doodh Patti (Regular)', 'Milk', 0.2),   ('Doodh Patti (Regular)', 'Tea leaves', 5),   ('Doodh Patti (Regular)', 'Sugar', 0.015),
  ('Doodh Patti (Large)',   'Milk', 0.3),   ('Doodh Patti (Large)',   'Tea leaves', 7),   ('Doodh Patti (Large)',   'Sugar', 0.02),
  ('Elaichi Chaye (Regular)', 'Milk', 0.2), ('Elaichi Chaye (Regular)', 'Tea leaves', 5), ('Elaichi Chaye (Regular)', 'Sugar', 0.015),
  ('Elaichi Chaye (Large)',   'Milk', 0.3), ('Elaichi Chaye (Large)',   'Tea leaves', 7), ('Elaichi Chaye (Large)',   'Sugar', 0.02),
  ('Masala Chaye (Regular)',  'Milk', 0.2), ('Masala Chaye (Regular)',  'Tea leaves', 5), ('Masala Chaye (Regular)',  'Sugar', 0.015),
  ('Masala Chaye (Large)',    'Milk', 0.3), ('Masala Chaye (Large)',    'Tea leaves', 7), ('Masala Chaye (Large)',    'Sugar', 0.02),
  ('Gur Chaye (Regular)',     'Milk', 0.2), ('Gur Chaye (Regular)',     'Tea leaves', 5), ('Gur Chaye (Regular)',     'Gur', 0.02),
  ('Gur Chaye (Large)',       'Milk', 0.3), ('Gur Chaye (Large)',       'Tea leaves', 7), ('Gur Chaye (Large)',       'Gur', 0.03),
  ('Khan Special Malai (Regular)', 'Milk', 0.25), ('Khan Special Malai (Regular)', 'Tea leaves', 5), ('Khan Special Malai (Regular)', 'Sugar', 0.015),
  ('Khan Special Malai (Large)',   'Milk', 0.35), ('Khan Special Malai (Large)',   'Tea leaves', 7), ('Khan Special Malai (Large)',   'Sugar', 0.02),
  ('Kehwa',          'Tea leaves', 3),  ('Kehwa',          'Sugar', 0.01),
  ('Kashmiri Tea',   'Milk', 0.25),     ('Kashmiri Tea',   'Tea leaves', 5), ('Kashmiri Tea',   'Sugar', 0.015),
  ('Chocolate Tea',  'Milk', 0.25),     ('Chocolate Tea',  'Tea leaves', 5), ('Chocolate Tea',  'Sugar', 0.015),
  ('Tandoori Chaye', 'Milk', 0.25),     ('Tandoori Chaye', 'Tea leaves', 6), ('Tandoori Chaye', 'Sugar', 0.02),
  ('Coffee',         'Milk', 0.2),      ('Coffee',         'Coffee', 8),     ('Coffee',         'Sugar', 0.015),
  ('Simple Paratha',         'Flour', 0.1), ('Simple Paratha',         'Cooking oil', 0.03),
  ('Aloo Paratha',           'Flour', 0.1), ('Aloo Paratha',           'Cooking oil', 0.03),
  ('Anda Paratha',           'Flour', 0.1), ('Anda Paratha',           'Cooking oil', 0.03), ('Anda Paratha', 'Eggs', 1),
  ('Cheese Paratha',         'Flour', 0.1), ('Cheese Paratha',         'Cooking oil', 0.03),
  ('Chocolate Paratha',      'Flour', 0.1), ('Chocolate Paratha',      'Cooking oil', 0.03),
  ('Chicken Paratha',        'Flour', 0.1), ('Chicken Paratha',        'Cooking oil', 0.03),
  ('Chicken Cheese Paratha', 'Flour', 0.1), ('Chicken Cheese Paratha', 'Cooking oil', 0.03),
  ('Qeema Paratha',          'Flour', 0.1), ('Qeema Paratha',          'Cooking oil', 0.03),
  ('Aloo Samosa',           'Samosas', 1), ('Aloo Samosa',           'Cooking oil', 0.01),
  ('Shami Samosa',          'Samosas', 1), ('Shami Samosa',          'Cooking oil', 0.01),
  ('Chicken Cheese Samosa', 'Samosas', 1), ('Chicken Cheese Samosa', 'Cooking oil', 0.01),
  ('Tikka Cheese Samosa',   'Samosas', 1), ('Tikka Cheese Samosa',   'Cooking oil', 0.01),
  ('Pizza Samosa',          'Samosas', 1), ('Pizza Samosa',          'Cooking oil', 0.01),
  ('Zinger Samosa',         'Samosas', 1), ('Zinger Samosa',         'Cooking oil', 0.01),
  ('Chicken Nuggets (2 pcs)', 'Chicken nuggets', 2), ('Chicken Nuggets (2 pcs)', 'Cooking oil', 0.02),
  ('Malai Boti Roll',   'Roll wraps', 1), ('Malai Boti Roll',   'Cooking oil', 0.01),
  ('Kabab Roll',        'Roll wraps', 1), ('Kabab Roll',        'Cooking oil', 0.01),
  ('Malai Crunch Roll', 'Roll wraps', 1), ('Malai Crunch Roll', 'Cooking oil', 0.01),
  ('Chicken Shawarma',  'Roll wraps', 1), ('Chicken Shawarma',  'Cooking oil', 0.01),
  ('Egg Boil',      'Eggs', 1),
  ('Egg Full Fry',  'Eggs', 1), ('Egg Full Fry',  'Cooking oil', 0.01),
  ('Egg Half Fry',  'Eggs', 1), ('Egg Half Fry',  'Cooking oil', 0.01),
  ('Egg Omelette',  'Eggs', 2), ('Egg Omelette',  'Cooking oil', 0.015),
  ('Water Bottle',  'Water bottles', 1)
) as v(item_name, ingredient_name, qty)
join items i on i.name = v.item_name
join ingredients g on g.name = v.ingredient_name
on conflict (item_id, ingredient_id) do nothing;
