-- Explicit ordering for products (nullable, nulls sort last). Previously
-- there was no column controlling row order, so products/admin panel/public
-- menu rendered in whatever order Postgres happened to return rows in.
-- Reads are ordered by this column (see src/lib/workspaceRepo.ts); the admin
-- panel now lets an owner reorder products within a category, which writes
-- sequential values here per category.

alter table public.products add column if not exists display_order integer;
