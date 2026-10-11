-- Optional special price charged only when the product is added through the
-- cart's "Que tal adicionar?" suggestion (bump offer). NULL = no special
-- price; the normal menu price is used.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cart_offer_price numeric NULL;
