// Starts (or recovers) the signed-in account's monthly subscription and
// returns a URL for the browser to open:
//   - a charge is overdue on an existing subscription -> that charge's Asaas
//     invoice page, where the card can be retried or swapped;
//   - otherwise -> a fresh Asaas hosted Checkout (credit card, recurring).
//     First-time subscribers get TRIAL_DAYS free: the first charge is
//     scheduled for today + TRIAL_DAYS. Returning subscribers pay today.
// The account is only unlocked by the asaas-webhook function once Asaas
// confirms the checkout — never by the success redirect.
import {
  addDays, asaas, corsHeaders, getAdmin, getUser, json,
  PLAN_NAME, PLAN_VALUE, SITE_URL, todayBR, TRIAL_DAYS,
} from "../_shared/asaas.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const admin = getAdmin();
    const user = await getUser(req, admin);
    if (!user) return json({ error: "Sessão inválida. Faça login novamente." }, 401);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("nome, telefone, subscription_status, asaas_subscription_id, billing_exempt")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || !profile) return json({ error: "Falha ao carregar dados da conta." }, 500);

    // Pre-Asaas customers are never charged (profiles.billing_exempt).
    if (profile.billing_exempt) return json({ error: "Sua conta tem plano cortesia, sem cobrança." }, 409);

    const status = profile.subscription_status as string;

    // Existing, still-live subscription with an unpaid charge: send them to
    // that invoice instead of creating a second subscription.
    if (profile.asaas_subscription_id && status !== "canceled") {
      if (status === "trialing" || status === "active") {
        return json({ error: "Sua assinatura já está ativa." }, 409);
      }
      const subId = profile.asaas_subscription_id;
      const overdue = await asaas(`/subscriptions/${subId}/payments?status=OVERDUE`);
      const pending = overdue?.data?.length ? overdue : await asaas(`/subscriptions/${subId}/payments?status=PENDING`);
      const invoiceUrl = pending?.data?.[0]?.invoiceUrl;
      if (invoiceUrl) return json({ url: invoiceUrl });
    }

    // Trial only for accounts that never had an Asaas subscription.
    const firstTime = !profile.asaas_subscription_id;
    const today = todayBR();
    const nextDueDate = firstTime ? addDays(today, TRIAL_DAYS) : today;

    const phoneDigits = String(profile.telefone || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
    const customerData: Record<string, unknown> = {};
    if (profile.nome) customerData.name = profile.nome;
    if (user.email) customerData.email = user.email;
    if (phoneDigits.length === 10 || phoneDigits.length === 11) customerData.phone = phoneDigits;

    const checkout = await asaas("/checkouts", {
      method: "POST",
      body: {
        billingTypes: ["CREDIT_CARD"],
        chargeTypes: ["RECURRENT"],
        minutesToExpire: 120,
        externalReference: user.id,
        callback: {
          successUrl: `${SITE_URL}/?checkout=success`,
          cancelUrl: `${SITE_URL}/?checkout=cancel`,
          expiredUrl: `${SITE_URL}/?checkout=expired`,
        },
        items: [{
          name: PLAN_NAME,
          description: firstTime
            ? `Cardápio digital + painel. ${TRIAL_DAYS} dias grátis, depois R$ 127/mês.`
            : "Cardápio digital + painel. R$ 127/mês.",
          quantity: 1,
          value: PLAN_VALUE,
        }],
        subscription: { cycle: "MONTHLY", nextDueDate },
        ...(Object.keys(customerData).length ? { customerData } : {}),
      },
    });

    // Remember which checkout belongs to this account — the CHECKOUT_PAID
    // webhook is matched back to the profile by this id.
    const { error: saveError } = await admin
      .from("profiles")
      .update({ asaas_checkout_id: checkout.id })
      .eq("id", user.id);
    if (saveError) {
      console.error("Failed to save asaas_checkout_id:", saveError.message);
      return json({ error: "Falha ao preparar o pagamento. Tente novamente." }, 500);
    }

    return json({ url: checkout.link });
  } catch (err) {
    console.error("asaas-subscribe error:", err);
    return json({ error: `Não foi possível abrir o pagamento: ${(err as Error).message}` }, 500);
  }
});
