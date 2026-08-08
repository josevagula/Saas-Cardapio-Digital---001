-- A product can now belong to more than one category at once. category_id
-- (singular) stays in place as a legacy/safety-net column, kept in sync as
-- the first entry of category_ids by the app — category_ids is the real
-- source of truth going forward.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_ids text[] NOT NULL DEFAULT '{}'::text[];

-- Backfill from the existing single category_id so already-created products
-- keep their category instead of becoming uncategorized.
UPDATE public.products
SET category_ids = ARRAY[category_id]
WHERE category_id IS NOT NULL AND (category_ids IS NULL OR array_length(category_ids, 1) IS NULL);
