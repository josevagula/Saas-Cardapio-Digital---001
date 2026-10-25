-- Mensagens editáveis enviadas aos clientes pelo WhatsApp (Clientes &
-- Fidelidade e atualização de status em Pedidos). Mesmo padrão de
-- loyalty_config/printing_config — um jsonb dentro de visual_configs.
-- null = usar os textos padrão do app.
alter table public.visual_configs
  add column if not exists message_templates jsonb;
