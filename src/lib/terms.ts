import { supabase } from './supabase';

// Versão vigente dos Termos de Uso e da Política de Privacidade.
// Troque as duas linhas aqui quando os documentos mudarem: TERMS_VERSION é o
// que fica gravado em terms_acceptances; o rótulo aparece no topo das páginas.
export const TERMS_VERSION = '2026-11-03';
export const TERMS_VERSION_LABEL = 'Versão 1.1 · 3 de novembro de 2026';

// O localStorage guarda só um lembrete de que falta gravar o aceite no banco
// (cadastro sem sessão ou insert que falhou). Não é prova de aceite: a prova é
// a linha em public.terms_acceptances.
const PENDING_KEY = 'zushy_terms_acceptance_pending';

interface PendingAcceptance {
  userId: string;
  version: string;
  userAgent: string;
}

function readPending(): PendingAcceptance | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingAcceptance) : null;
  } catch {
    return null;
  }
}

function clearPending() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* sem storage disponível: nada a limpar */
  }
}

export function markTermsAcceptancePending(userId: string) {
  const pending: PendingAcceptance = {
    userId,
    version: TERMS_VERSION,
    userAgent: navigator.userAgent
  };
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    /* sem storage disponível: o aceite não poderá ser reenviado depois */
  }
}

async function insertAcceptance(userId: string, version: string, userAgent: string) {
  const { error } = await supabase
    .from('terms_acceptances')
    .insert({ user_id: userId, terms_version: version, user_agent: userAgent });
  return error;
}

// Pede à Edge Function send-terms-copy (Brevo) que envie a cópia dos Termos
// do aceite mais recente ainda não enviado. A função ignora chamadas repetidas,
// então pode ser chamada a cada login para reenviar se o envio anterior falhou.
// Nunca lança erro.
export async function sendTermsCopy() {
  try {
    const { error } = await supabase.functions.invoke('send-terms-copy', { method: 'POST' });
    if (error) console.warn('Cópia dos Termos por e-mail não enviada:', error.message);
  } catch (err) {
    console.warn('Cópia dos Termos por e-mail não enviada:', err);
  }
}

// Grava o aceite logo após o signUp (com sessão ativa). Se falhar, deixa
// pendente para o próximo login. Nunca lança erro: não bloqueia o cadastro.
export async function recordTermsAcceptance(userId: string) {
  try {
    const error = await insertAcceptance(userId, TERMS_VERSION, navigator.userAgent);
    if (!error) {
      clearPending();
      // Sem await: o e-mail não deve atrasar a ida para o pagamento.
      void sendTermsCopy();
      return;
    }
    console.warn('Aceite dos Termos ficou pendente:', error.message);
  } catch (err) {
    console.warn('Aceite dos Termos ficou pendente:', err);
  }
  markTermsAcceptancePending(userId);
}

// Chamado quando há sessão (login ou retorno da confirmação de e-mail):
// grava o aceite pendente desse usuário, se houver.
export async function flushPendingTermsAcceptance(userId: string) {
  const pending = readPending();
  if (!pending || pending.userId !== userId) return;
  try {
    const error = await insertAcceptance(pending.userId, pending.version, pending.userAgent);
    if (!error) {
      clearPending();
      await sendTermsCopy();
    } else {
      console.warn('Aceite dos Termos continua pendente:', error.message);
    }
  } catch (err) {
    console.warn('Aceite dos Termos continua pendente:', err);
  }
}
