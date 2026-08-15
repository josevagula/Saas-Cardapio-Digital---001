-- Supersedes display_order (a single global position per product) with a
-- per-category one: a product in two categories needs an independent
-- position in each, since reordering it within one category shouldn't move
-- it within the other. Stored as a {categoryId: position} map rather than a
-- join table since a product's category list is already denormalized onto
-- the row (category_ids).

alter table public.products add column if not exists category_display_order jsonb not null default '{}'::jsonb;

-- Carry forward the handful of values set under the old global scheme
-- (single-category products only, in practice) as their starting position
-- in that one category.
update public.products
set category_display_order = jsonb_build_object(category_ids[1], display_order)
where display_order is not null
  and category_ids is not null
  and array_length(category_ids, 1) > 0;

alter table public.products drop column if exists display_order;
