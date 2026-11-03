-- Cópia dos Termos por e-mail (Brevo, Edge Function send-terms-copy).
-- email_sent_at marca o aceite cuja cópia já foi enviada, para não mandar
-- duas vezes. Só a Edge Function (service role) escreve nesta coluna; a regra
-- de INSERT do usuário continua igual.
alter table public.terms_acceptances
  add column if not exists user_agent text,
  add column if not exists email_sent_at timestamptz;
