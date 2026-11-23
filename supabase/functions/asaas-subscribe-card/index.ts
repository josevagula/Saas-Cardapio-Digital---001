// On-site card payment: the Zushy payment form posts the card here and this
// function creates the Asaas customer + monthly subscription directly, so the
// user never leaves zushy.com.br.
//   - First-time subscribers: first charge on today + TRIAL_DAYS (status
//     'trialing'). Returning subscribers (cancelled / overdue): charged today.
//   - Card data is only forwarded to Asaas over HTTPS. It is NEVER stored or
//     logged here: only the Asaas customer/subscription ids are saved.
//   - Rate-limited per account (billing_card_attempts) against card testing.
import {
  addDays, addMonths, asaas, corsHeaders, endOfDayBR, getAdmin, getUser, json,
  PLAN_VALUE, todayBR, TRIAL_DAYS,
} from "../_shared/asaas.ts";

const MAX_FAILED_PER_HOUR = 5;

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = getAdmin();
  let userId: string | null = null;

  try {
    const user = await getUser(req, admin);
    if (!user) return json({ error: "Sessão inválida. Faça login novamente." }, 401);
    userId = user.id;

    // deno-lint-ignore no-explicit-any
    let body: any;
    try { body = await req.json(); } catch { return json({ error: "Dados inválidos." }, 400); }

    const holderName = String(body?.holderName ?? "").trim().slice(0, 100);
    const number = digits(body?.number);
    const expiryMonth = digits(body?.expiryMonth).padStart(2, "0");
    let expiryYear = digits(body?.expiryYear);
    if (expiryYear.length === 2) expiryYear = `20${expiryYear}`;
    const ccv = digits(body?.ccv);
    const cpfCnpj = digits(body?.cpfCnpj);
    const postalCode = digits(body?.postalCode);
    const addressNumber = String(body?.addressNumber ?? "").trim().slice(0, 10);

    const invalid =
      !holderName ? "Informe o nome impresso no cartão." :
      number.length < 13 || number.length > 19 ? "Número do cartão inválido." :
      !(Number(expiryMonth) >= 1 && Number(expiryMonth) <= 12) || expiryYear.length !== 4 ? "Validade inválida." :
      ccv.length < 3 || ccv.length > 4 ? "CVV inválido." :
      cpfCnpj.length !== 11 && cpfCnpj.length !== 14 ? "Informe um CPF ou CNPJ válido." :
      postalCode.length !== 8 ? "Informe um CEP válido." :
      !addressNumber ? "Informe o número do endereço." : "";
    if (invalid) return json({ error: invalid }, 400);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("nome, telefone, subscription_status, asaas_subscription_id, asaas_customer_id, billing_exempt")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || !profile) return json({ error: "Falha ao carregar dados da conta." }, 500);
    if (profile.billing_exempt) return json({ error: "Sua conta tem plano cortesia, sem cobrança." }, 409);
    if (profile.subscription_status === "trialing" || profile.subscription_status === "active") {
      return json({ error: "Sua assinatura já está ativa." }, 409);
    }

    // Card-testing guard: too many refused cards in the last hour -> wait.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("billing_card_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("ok", false)
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_FAILED_PER_HOUR) {
      return json({ error: "Muitas tentativas com cartão recusado. Aguarde uma hora e tente novamente." }, 429);
    }

    const email = user.email || undefined;
    const phone = digits(profile.telefone).replace(/^55(?=\d{10,11}$)/, "");
    const mobilePhone = phone.length === 10 || phone.length === 11 ? phone : undefined;
    const name = String(profile.nome || holderName).trim();

    // Asaas customer: reuse the account's one (refreshing CPF/CEP), else create.
    const customerFields = { name, cpfCnpj, email, mobilePhone, postalCode, addressNumber, externalReference: user.id };
    let customerId: string = profile.asaas_customer_id || "";
    if (customerId) {
      await asaas(`/customers/${customerId}`, { method: "POST", body: customerFields });
    } else {
      const customer = await asaas("/customers", { method: "POST", body: customerFields });
      customerId = customer.id;
      await admin.from("profiles").update({ asaas_customer_id: customerId }).eq("id", user.id);
    }

    const firstTime = !profile.asaas_subscription_id;
    const today = todayBR();
    const nextDueDate = firstTime ? addDays(today, TRIAL_DAYS) : today;
    const remoteIp = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || undefined;

    let subscription;
    try {
      subscription = await asaas("/subscriptions", {
        method: "POST",
        body: {
          customer: customerId,
          billingType: "CREDIT_CARD",
          value: PLAN_VALUE,
          nextDueDate,
          cycle: "MONTHLY",
          description: "Zushy - Plano Mensal (cardápio digital + painel)",
          externalReference: user.id,
          creditCard: { holderName, number, expiryMonth, expiryYear, ccv },
          creditCardHolderInfo: { name: holderName, email, cpfCnpj, postalCode, addressNumber, mobilePhone, phone: mobilePhone },
          remoteIp,
        },
      });
    } catch (err) {
      await admin.from("billing_card_attempts").insert({ user_id: user.id, ok: false });
      return json({ error: `Cartão não aprovado: ${(err as Error).message}` }, 402);
    }
    await admin.from("billing_card_attempts").insert({ user_id: user.id, ok: true });

    // Renewing: stop the old subscription so the account is never billed twice.
    const old = profile.asaas_subscription_id;
    if (old && old !== subscription.id) {
      await asaas(`/subscriptions/${old}`, { method: "DELETE" }).catch((e: Error) =>
        console.error(`Failed to delete old subscription ${old}:`, e.message));
    }

    const { error: saveError } = await admin.from("profiles").update({
      asaas_customer_id: customerId,
      asaas_subscription_id: subscription.id,
      subscription_status: firstTime ? "trialing" : "active",
      subscription_current_period_end: endOfDayBR(firstTime ? nextDueDate : addMonths(today, 1)),
      subscription_price_id: "asaas_monthly_127",
    }).eq("id", user.id);
    if (saveError) {
      // The subscription exists in Asaas; the SUBSCRIPTION_CREATED webhook
      // links it via externalReference, so don't ask for the card again.
      console.error("Failed to save subscription on profile:", saveError.message);
    }

    return json({ ok: true, firstChargeDate: nextDueDate });
  } catch (err) {
    // Message only: never log the request body (card data).
    console.error("asaas-subscribe-card error:", (err as Error).message);
    return json({ error: `Não foi possível concluir o pagamento: ${(err as Error).message}` }, 500);
  }
});
