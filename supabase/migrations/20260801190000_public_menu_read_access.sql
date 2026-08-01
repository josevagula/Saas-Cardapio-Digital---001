-- Lets an anonymous customer open a restaurant's public menu link
-- (?menu=<slug>) from any device and see that restaurant's real branding,
-- catalog, and active coupons — previously the public menu only ever showed
-- whatever was cached in the *viewer's own* browser, since there was no
-- account-agnostic way to resolve a slug to its owner's data.
-- These are additive SELECT-only policies alongside the existing
-- owner-scoped "for all" policies (Postgres RLS policies are OR'd), so
-- write access remains owner-only.

create policy "visual_configs_public_select" on public.visual_configs
  for select using (true);

create policy "categories_public_select" on public.categories
  for select using (true);

create policy "products_public_select" on public.products
  for select using (true);

create policy "coupons_public_select_active" on public.coupons
  for select using (active = true);
