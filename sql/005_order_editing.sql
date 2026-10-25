-- Khan Chaye POS — migration 005
-- Run this once in the Supabase SQL editor, after 004_parcel_charge.sql.
-- Lets a completed order's items/payment/note be edited in place, instead of
-- only void-and-redo. edit_order() replaces an order's line items and
-- recalculates its total atomically (one transaction — can't half-apply).

alter table orders add column if not exists edited_at timestamptz;
alter table orders add column if not exists edited_by text;

create or replace function edit_order(
  p_order_id uuid,
  p_items jsonb, -- array of {item_id, item_name, unit_price, quantity, parcel_qty, parcel_fee, line_total}
  p_payment_method text,
  p_note text,
  p_editor text
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
      edited_at = now(),
      edited_by = p_editor
  where id = p_order_id;
end;
$$ language plpgsql;
