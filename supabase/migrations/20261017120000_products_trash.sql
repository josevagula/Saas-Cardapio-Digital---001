-- Lixeira de produtos: deleting a product only marks it (deleted_at) so it
-- can be restored from the admin's "Lixeira". Added after a sync race
-- permanently deleted newly created products (2026-10-17) with no way to
-- recover them on this plan.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- Safety net for every DELETE, whatever sends it — including dashboard tabs
-- still running an older build whose sync pruned "rows missing from the
-- local list": an active product is moved to the trash instead of being
-- removed. Only a product already in the trash is really deleted (the
-- Lixeira's "Excluir definitivamente").
CREATE OR REPLACE FUNCTION public.products_soft_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.deleted_at IS NULL THEN
    UPDATE public.products SET deleted_at = now() WHERE id = OLD.id;
    RETURN NULL;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS products_soft_delete ON public.products;
CREATE TRIGGER products_soft_delete
  BEFORE DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_soft_delete();

-- The public menu (anon) never sees trashed products; the owner still reads
-- them through products_owner_all.
DROP POLICY IF EXISTS "products_public_select" ON public.products;
CREATE POLICY "products_public_select" ON public.products
  FOR SELECT USING (deleted_at IS NULL);
