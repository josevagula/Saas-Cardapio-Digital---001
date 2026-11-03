// Edge Function: envia por e-mail (Brevo) a cópia dos Termos aceitos no
// cadastro, com o link para /termos e a versão aceita.
//
// Chamada pelo site logo depois de gravar a linha em public.terms_acceptances,
// e de novo a cada login (para reenviar se o envio anterior falhou). Só envia
// para o aceite mais recente do próprio usuário que ainda não tem
// email_sent_at, então chamadas repetidas não duplicam o e-mail.
//
// Segredos (Supabase > Edge Functions > Secrets):
//   BREVO_API_KEY       chave da API do Brevo (SMTP & API > API Keys)
//   BREVO_SENDER_EMAIL  remetente verificado no Brevo (ex.: contato@zushy.com.br)
//   SITE_URL            opcional, padrão https://zushy.com.br
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já vêm prontos no ambiente.
import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = ['https://zushy.com.br', 'https://www.zushy.com.br', 'http://localhost:3000'];

function cors(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' });

  const apiKey = Deno.env.get('BREVO_API_KEY');
  const sender = Deno.env.get('BREVO_SENDER_EMAIL');
  const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://zushy.com.br').replace(/\/$/, '');
  if (!apiKey || !sender) return json(req, 500, { error: 'Brevo não configurado' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Identifica o usuário pelo token da sessão enviado pelo site.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user?.email) return json(req, 401, { error: 'não autenticado' });

  const { data: acceptance, error: findError } = await admin
    .from('terms_acceptances')
    .select('id, terms_version, accepted_at')
    .eq('user_id', user.id)
    .is('email_sent_at', null)
    .order('accepted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) return json(req, 500, { error: findError.message });
  if (!acceptance) return json(req, 200, { sent: false, reason: 'nada pendente' });

  // Reserva o envio antes de mandar: se duas chamadas chegarem juntas, só uma
  // consegue marcar a linha e a outra sai sem enviar.
  const { data: claimed } = await admin
    .from('terms_acceptances')
    .update({ email_sent_at: new Date().toISOString() })
    .eq('id', acceptance.id)
    .is('email_sent_at', null)
    .select('id');
  if (!claimed?.length) return json(req, 200, { sent: false, reason: 'já enviado' });

  const name = String(user.user_metadata?.nome ?? '').trim();
  const acceptedAt = new Date(acceptance.accepted_at).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'long',
    timeStyle: 'short',
  });
  const version = escapeHtml(acceptance.terms_version);
  const termsUrl = `${siteUrl}/termos`;
  const privacyUrl = `${siteUrl}/privacidade`;

  const html = `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#f5f0ea;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <h1 style="font-size:20px;margin:0 0 16px">Sua cópia dos Termos de Uso do Zushy</h1>
    <p style="font-size:15px;line-height:1.6">Olá${name ? `, ${escapeHtml(name)}` : ''}!</p>
    <p style="font-size:15px;line-height:1.6">Este e-mail confirma que você aceitou os Termos de Uso e a Política de Privacidade do Zushy ao criar sua conta.</p>
    <table style="font-size:14px;line-height:1.6;margin:16px 0">
      <tr><td style="padding-right:12px;color:#666">Versão aceita</td><td><strong>${version}</strong></td></tr>
      <tr><td style="padding-right:12px;color:#666">Data do aceite</td><td>${escapeHtml(acceptedAt)} (horário de Brasília)</td></tr>
    </table>
    <p style="font-size:15px;line-height:1.6">Leia os documentos quando quiser:</p>
    <p style="font-size:15px;line-height:1.8">
      <a href="${termsUrl}" style="color:#c2410c">Termos de Uso</a><br>
      <a href="${privacyUrl}" style="color:#c2410c">Política de Privacidade</a>
    </p>
    <p style="font-size:13px;line-height:1.6;color:#666;margin-top:24px">Dúvidas? Escreva para zushy.br@gmail.com.</p>
  </div>
</body></html>`;

  const text = [
    `Olá${name ? `, ${name}` : ''}!`,
    'Este e-mail confirma que você aceitou os Termos de Uso e a Política de Privacidade do Zushy ao criar sua conta.',
    `Versão aceita: ${acceptance.terms_version}`,
    `Data do aceite: ${acceptedAt} (horário de Brasília)`,
    `Termos de Uso: ${termsUrl}`,
    `Política de Privacidade: ${privacyUrl}`,
    'Dúvidas? Escreva para zushy.br@gmail.com.',
  ].join('\n\n');

  const brevo = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Zushy', email: sender },
      to: [{ email: user.email, ...(name ? { name } : {}) }],
      replyTo: { email: 'zushy.br@gmail.com', name: 'Zushy' },
      subject: 'Sua cópia dos Termos de Uso do Zushy',
      htmlContent: html,
      textContent: text,
      tags: ['termos'],
    }),
  });

  if (!brevo.ok) {
    // Libera a linha para tentar de novo no próximo login.
    await admin.from('terms_acceptances').update({ email_sent_at: null }).eq('id', acceptance.id);
    return json(req, 502, { error: 'falha no Brevo', status: brevo.status, detail: await brevo.text() });
  }

  return json(req, 200, { sent: true });
});
