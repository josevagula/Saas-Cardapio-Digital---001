-- Products the restaurant wants offered as a one-tap "Que tal adicionar?"
-- suggestion (cart recommendation / bump offer) inside the public menu's
-- cart drawer. Default false = product is never suggested there.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_cart_recommendation boolean NOT NULL DEFAULT false;
