-- Khan Chaye POS — migration 007
-- Run this once in the Supabase SQL editor, after 006_clients.sql.
-- Orders are now punched as 'pending' (bill sent with the waiter) and only
-- become 'completed' — and count towards sales — once the money is received
-- and the cashier marks them paid.

alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('pending', 'completed', 'voided', 'returned'));

alter table orders add column if not exists paid_at timestamptz;
alter table orders add column if not exists paid_by text;
