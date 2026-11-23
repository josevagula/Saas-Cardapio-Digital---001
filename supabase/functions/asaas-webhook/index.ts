// Receives Asaas webhooks and keeps profiles.subscription_status in sync.
// Deployed with verify_jwt = false: Asaas authenticates with the
// "asaas-access-token" header, which must equal ASAAS_WEBHOOK_TOKEN.
//
// Configure in Asaas > Integrações > Webhooks:
//   URL: https://<project-ref>.supabase.co/functions/v1/asaas-webhook
//   Token de autenticação: same value as ASAAS_WEBHOOK_TOKEN
//   Events: CHECKOUT_PAID, SUBSCRIPTION_CREATED, SUBSCRIPTION_UPDATED,
//           SUBSCRIPTION_INACTIVATED, SUBSCRIPTION_DELETED, PAYMENT_CONFIRMED,
//           PAYMENT_RECEIVED, PAYMENT_OVERDUE
//
// Linking an event back to an account:
//   CHECKOUT_PAID      -> profiles.asaas_checkout_id (saved by asaas-subscribe)
//   SUBSCRIPTION_*     -> asaas_subscription_id, else externalReference (user id),
//                         else asaas_customer_id of a profile still without one
//   PAYMENT_*          -> asaas_subscription_id = payment.subscription
import { addMonths, asaas, endOfDayBR, getAdmin, todayBR } from "../_shared/asaas.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// deno-lint-ignore no-explicit-any
type Any = any;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const expected = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  if (!expected || req.headers.get("asaas-access-token") !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: Any;
  try { body = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }

  const admin = getAdmin();
  const eventId = String(body?.id || `${body?.event}-${crypto.randomUUID()}`);

  // Idempotency: Asaas delivers at least once. A duplicate id hits the
  // primary key and is acknowledged without reprocessing.
  const { error: insertError } = await admin
    .from("asaas_webhook_events")
    .insert({ id: eventId, event: String(body?.event || "UNKNOWN"), payload: body });
  if (insertError) {
    if (insertError.code === "23505") return Response.json({ received: true, duplicate: true });
    console.error("Failed to log webhook event:", insertError.message);
    return new Response("Log failed", { status: 500 });
  }

  try {
    const { profileId, note } = await handleEvent(admin, body);
    await admin.from("asaas_webhook_events").update({ profile_id: profileId, note }).eq("id", eventId);
    return Response.json({ received: true });
  } catch (err) {
    console.error(`Error handling Asaas event ${body?.event}:`, err);
    // Remove the log row so Asaas' retry is processed again, then fail so it retries.
    await admin.from("asaas_webhook_events").delete().eq("id", eventId);
    return new Response("Handler error", { status: 500 });
  }
});

async function updateProfile(admin: Any, id: string, fields: Record<string, unknown>) {
  const { error } = await admin.from("profiles").update(fields).eq("id", id);
  if (error) throw new Error(`profiles update failed: ${error.message}`);
}

async function findProfile(admin: Any, column: string, value: unknown, extra?: (q: Any) => Any) {
  if (!value) return null;
  let q = admin.from("profiles").select("id, asaas_subscription_id, subscription_status").eq(column, value);
  if (extra) q = extra(q);
  const { data, error } = await q.limit(1).maybeSingle();
  if (error) throw new Error(`profiles lookup failed: ${error.message}`);
  return data;
}

async function handleEvent(admin: Any, body: Any): Promise<{ profileId: string | null; note: string }> {
  const event: string = body?.event;

  switch (event) {
    case "CHECKOUT_PAID": {
      const checkout = body.checkout || {};
      const profile = await findProfile(admin, "asaas_checkout_id", checkout.id);
      if (!profile) return { profileId: null, note: `no profile for checkout ${checkout.id}` };

      const nextDueDate: string = String(checkout.subscription?.nextDueDate || todayBR()).slice(0, 10);
      const fields: Record<string, unknown> = {
        subscription_status: nextDueDate > todayBR() ? "trialing" : "active",
        subscription_current_period_end: endOfDayBR(nextDueDate > todayBR() ? nextDueDate : addMonths(nextDueDate, 1)),
        subscription_price_id: "asaas_monthly_127",
      };
      if (checkout.customer) {
        fields.asaas_customer_id = checkout.customer;
        // Find the subscription this checkout created, if it already exists
        // (otherwise SUBSCRIPTION_CREATED links it by customer).
        const subs = await asaas(`/subscriptions?customer=${checkout.customer}&status=ACTIVE&limit=10`);
        const newest = (subs?.data || []).sort((a: Any, b: Any) => String(b.dateCreated).localeCompare(String(a.dateCreated)))[0];
        if (newest?.id) fields.asaas_subscription_id = newest.id;
      }

      // Renewing on top of an older, still-live subscription: stop the old one
      // so the account is never billed twice.
      const old = profile.asaas_subscription_id;
      if (old && fields.asaas_subscription_id && old !== fields.asaas_subscription_id) {
        await asaas(`/subscriptions/${old}`, { method: "DELETE" }).catch((e: Error) =>
          console.error(`Failed to delete old subscription ${old}:`, e.message));
      }
      await updateProfile(admin, profile.id, fields);
      return { profileId: profile.id, note: `checkout paid -> ${fields.subscription_status}` };
    }

    case "SUBSCRIPTION_CREATED":
    case "SUBSCRIPTION_UPDATED":
    case "SUBSCRIPTION_INACTIVATED":
    case "SUBSCRIPTION_DELETED": {
      const sub = body.subscription || {};
      let profile = await findProfile(admin, "asaas_subscription_id", sub.id);
      if (!profile && UUID_RE.test(String(sub.externalReference || ""))) {
        profile = await findProfile(admin, "id", sub.externalReference);
      }
      if (!profile && event === "SUBSCRIPTION_CREATED") {
        profile = await findProfile(admin, "asaas_customer_id", sub.customer, (q) => q.is("asaas_subscription_id", null));
      }
      if (!profile) return { profileId: null, note: `no profile for subscription ${sub.id}` };

      const ended = event === "SUBSCRIPTION_DELETED" || event === "SUBSCRIPTION_INACTIVATED" ||
        sub.deleted === true || (sub.status && sub.status !== "ACTIVE");

      if (event === "SUBSCRIPTION_CREATED" && !ended) {
        await updateProfile(admin, profile.id, { asaas_subscription_id: sub.id, asaas_customer_id: sub.customer ?? null });
        return { profileId: profile.id, note: "subscription linked" };
      }

      if (ended && profile.asaas_subscription_id === sub.id) {
        await updateProfile(admin, profile.id, { subscription_status: "canceled" });
        return { profileId: profile.id, note: "subscription ended -> canceled" };
      }
      return { profileId: profile.id, note: "no change" };
    }

    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED":
    case "PAYMENT_OVERDUE": {
      const payment = body.payment || {};
      if (!payment.subscription) return { profileId: null, note: "payment not from a subscription" };
      const profile = await findProfile(admin, "asaas_subscription_id", payment.subscription);
      if (!profile) return { profileId: null, note: `no profile for subscription ${payment.subscription}` };
      if (profile.subscription_status === "canceled") return { profileId: profile.id, note: "already canceled" };

      if (event === "PAYMENT_OVERDUE") {
        await updateProfile(admin, profile.id, { subscription_status: "past_due" });
        return { profileId: profile.id, note: "payment overdue -> past_due" };
      }
      const dueDate = String(payment.dueDate || todayBR()).slice(0, 10);
      await updateProfile(admin, profile.id, {
        subscription_status: "active",
        subscription_current_period_end: endOfDayBR(addMonths(dueDate, 1)),
      });
      return { profileId: profile.id, note: "payment confirmed -> active" };
    }

    default:
      return { profileId: null, note: "event ignored" };
  }
}
