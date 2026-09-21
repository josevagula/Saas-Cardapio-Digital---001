-- Restart the per-restaurant order counter so the next new order is PED-0001.
-- Only the counter moves: existing orders keep whatever order_number they
-- already have (assign_order_number hands out next_number - 1 after bumping,
-- so next_number = 1 means the next order gets 1).
update public.order_counters set next_number = 1;
