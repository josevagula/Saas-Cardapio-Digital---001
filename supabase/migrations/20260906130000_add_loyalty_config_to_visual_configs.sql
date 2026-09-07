-- Persists the restaurant's Configuração de Prêmios (points per R$10, points
-- needed for a reward, reward type/value, active toggle) so it survives a
-- reload and actually drives how many points a completed order earns,
-- instead of only living in unsaved component state.
alter table public.visual_configs
  add column if not exists loyalty_config jsonb;
