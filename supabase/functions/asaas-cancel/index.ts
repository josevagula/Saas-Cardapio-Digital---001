// Cancels the signed-in account's Asaas subscription. No more charges are
// generated; the account keeps access until subscription_current_period_end
// (end of the trial, or of the month already paid).
import { asaas, corsHeaders, getAdmin, getUser, json } from "../_shared/asaas.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const admin = getAdmin();
    const user = await getUser(req, admin);
    if (!user) return json({ error: "Sessão inválida. Faça login novamente." }, 401);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("asaas_subscription_id, subscription_status")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || !profile) return json({ error: "Falha ao carregar dados da conta." }, 500);
    if (!profile.asaas_subscription_id) {
      return json({ error: "Esta conta ainda não tem uma assinatura ativa." }, 400);
    }

    if (profile.subscription_status !== "canceled") {
      await asaas(`/subscriptions/${profile.asaas_subscription_id}`, { method: "DELETE" });
    }

    const { error } = await admin
      .from("profiles")
      .update({ subscription_status: "canceled" })
      .eq("id", user.id);
    if (error) console.error("Failed to mark profile canceled:", error.message);

    return json({ ok: true });
  } catch (err) {
    console.error("asaas-cancel error:", err);
    return json({ error: `Não foi possível cancelar agora: ${(err as Error).message}` }, 500);
  }
});
