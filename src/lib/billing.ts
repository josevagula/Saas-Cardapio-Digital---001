import { supabase } from './supabase';

// Calls one of the asaas-* Supabase Edge Functions (supabase/functions/).
// supabase-js attaches the signed-in user's access token automatically, and
// the function verifies it before touching Asaas or the profiles table.
async function invokeBilling<T>(name: string): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sessão expirada. Faça login novamente.');

  const { data, error } = await supabase.functions.invoke(name, { method: 'POST' });
  if (error) {
    // Non-2xx responses carry our { error } JSON in error.context (a Response).
    let message = '';
    try { message = (await (error as any).context?.json())?.error || ''; } catch { /* not JSON */ }
    throw new Error(message || 'Não foi possível conectar com a cobrança agora. Tente novamente.');
  }
  return data as T;
}

// Redirects the browser to the Asaas hosted Checkout (credit card, monthly)
// to start or renew the subscription — or, when a charge is overdue, to that
// charge's invoice page so the card can be retried or replaced.
export async function startCheckout(): Promise<void> {
  const { url } = await invokeBilling<{ url: string }>('asaas-subscribe');
  window.location.href = url;
}

// Cancels the Asaas subscription. Access continues until the end of the
// period already paid (or of the free trial).
export async function cancelSubscription(): Promise<void> {
  await invokeBilling<{ ok: true }>('asaas-cancel');
}
