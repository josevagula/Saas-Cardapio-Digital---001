-- "Pedidos Arquivados": staff can move completed (delivered) orders out of
-- the Concluídos tab into an archive grouped by day. Archiving is purely a
-- display flag — the order keeps its 'delivered' status, so loyalty,
-- receitas and analytics derived from delivered orders are unaffected.
-- Null = not archived.
alter table public.orders add column if not exists archived_at timestamptz;
