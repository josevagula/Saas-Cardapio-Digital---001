-- Categories had no persisted order at all: fetches read them with no
-- ORDER BY, so the sequence a restaurant arranges via the up/down reorder
-- buttons in Cardápio (client-side array order) was never written back to
-- Supabase. It looked fine within one session (the in-memory array kept the
-- new order) but reverted to whatever order Postgres happened to return on
-- the next load/refresh — which is also why anything downstream that groups
-- by category (e.g. the loyalty "Produto Grátis" picker) could look
-- unsorted. This adds a real, persisted position per category.

alter table public.categories add column display_order integer;

-- Backfill existing rows with their current creation order so nothing
-- visibly reshuffles for accounts that never touched the reorder buttons.
with ordered as (
  select id, row_number() over (partition by user_id order by created_at, id) - 1 as rn
  from public.categories
)
update public.categories c
set display_order = ordered.rn
from ordered
where c.id = ordered.id;

alter table public.categories alter column display_order set not null;
alter table public.categories alter column display_order set default 0;

create index categories_user_display_order_idx on public.categories (user_id, display_order);
