-- Optional paid add-ons a customer can pick per product on the public menu
-- (e.g. "Cream Cheese Extra", up to 3x, R$3 each), configured by the admin
-- per product. Stored as a JSON array of {id, name, price, maxQuantity}.
-- Empty array = no add-ons offered for that product.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS extras jsonb NOT NULL DEFAULT '[]'::jsonb;
