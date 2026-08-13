-- Lets each restaurant configure the subtitle shown under its name on the
-- public menu's hero banner (previously a fixed string for every tenant).
ALTER TABLE public.visual_configs ADD COLUMN IF NOT EXISTS menu_description text;
