-- Khan Chaye POS — migration 004
-- Run this once in the Supabase SQL editor, after 003_real_menu.sql.
-- Adds a per-cup parcel/takeaway surcharge, tracked per order line.

alter table order_items add column if not exists parcel_qty integer not null default 0;
alter table order_items add column if not exists parcel_fee numeric(10,2) not null default 0;

alter table order_items drop constraint if exists order_items_parcel_qty_check;
alter table order_items add constraint order_items_parcel_qty_check
  check (parcel_qty >= 0 and parcel_qty <= quantity);
