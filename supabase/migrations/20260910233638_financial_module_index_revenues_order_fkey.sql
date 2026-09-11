-- Covering index for the revenues.order_id foreign key (flagged by the
-- performance advisor) — separate from the existing partial unique index,
-- which only covers non-null order_id lookups used for upsert conflict
-- targeting, not general FK-join lookups.
create index revenues_order_id_idx on public.revenues (order_id);
