-- Sistema de Impressão Automática (Bluetooth/ESC-POS): persiste os perfis de
-- impressora e as preferências de impressão (mesmo padrão de loyalty_config/
-- auto_kit_config — um jsonb dentro de visual_configs, nada de tabela nova).
alter table public.visual_configs
  add column if not exists printing_config jsonb;

-- Habilita Supabase Realtime para orders — necessário para que o painel do
-- admin saiba, sem precisar recarregar a página, que um pedido novo chegou
-- (gatilho da impressão automática "Recebido"). Realtime respeita a RLS já
-- existente (orders_owner_select: auth.uid() = user_id), então cada dono só
-- recebe eventos dos próprios pedidos — mesma visibilidade de sempre, só que
-- ao vivo. Não altera nenhuma policy nem coluna de dados.
alter publication supabase_realtime add table public.orders;
