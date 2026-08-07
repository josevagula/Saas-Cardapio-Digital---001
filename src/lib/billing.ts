import { supabase } from './supabase';

// Calls one of the /api/stripe/* routes on our own Express server, attaching
// the signed-in user's Supabase access token so the server can verify who's
// asking before touching Stripe or the profiles table.
async function authPost(path: string): Promise<{ url: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sessão expirada. Faça login novamente.');

  const response = await fetch(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Não foi possível conectar com a cobrança agora. Tente novamente.');
  }
  return data;
}

// Redirects the browser to a Stripe Checkout page to start or renew the
// account's paid subscription.
export async function startCheckout(): Promise<void> {
  const { url } = await authPost('/api/stripe/create-checkout-session');
  window.location.href = url;
}

// Redirects the browser to Stripe's hosted Billing Portal, where the account
// can update payment details or cancel the subscription.
export async function openBillingPortal(): Promise<void> {
  const { url } = await authPost('/api/stripe/create-portal-session');
  window.location.href = url;
}
