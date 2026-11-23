// Shared helpers for the asaas-* Edge Functions.
//
// Secrets (Supabase Dashboard > Edge Functions > Secrets):
//   ASAAS_API_KEY        API key from Asaas > Integrações > Chaves de API
//                        (sandbox keys start with $aact_hmlg_, production with $aact_prod_)
//   ASAAS_API_URL        https://api-sandbox.asaas.com/v3 (sandbox) or https://api.asaas.com/v3
//   ASAAS_WEBHOOK_TOKEN  any long random string, also typed into the Asaas webhook config
//   SITE_URL             optional, defaults to https://zushy.com.br
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected by Supabase automatically.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

export const PLAN_NAME = "Zushy - Plano Mensal"; // Asaas limits item names to 30 chars
export const PLAN_VALUE = 127.0; // R$/mês, matches the landing page
export const TRIAL_DAYS = 7;

export const SITE_URL = (Deno.env.get("SITE_URL") || "https://zushy.com.br").replace(/\/$/, "");
const ASAAS_API_URL = (Deno.env.get("ASAAS_API_URL") || "https://api-sandbox.asaas.com/v3").replace(/\/$/, "");

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// deno-lint-ignore no-explicit-any
export function getAdmin(): any {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Resolves the signed-in user from the request's "Authorization: Bearer <jwt>".
// deno-lint-ignore no-explicit-any
export async function getUser(req: Request, admin: any) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// Thin wrapper over the Asaas REST API. Throws with Asaas' own error
// description (they come back as { errors: [{ code, description }] }).
// deno-lint-ignore no-explicit-any
export async function asaas(path: string, init: { method?: string; body?: unknown } = {}): Promise<any> {
  const apiKey = Deno.env.get("ASAAS_API_KEY");
  if (!apiKey) throw new Error("ASAAS_API_KEY não configurada.");
  const res = await fetch(`${ASAAS_API_URL}${path}`, {
    method: init.method || "GET",
    headers: {
      access_token: apiKey,
      "Content-Type": "application/json",
      "User-Agent": "Zushy",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  // deno-lint-ignore no-explicit-any
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const description = data?.errors?.[0]?.description || `HTTP ${res.status}`;
    console.error(`Asaas ${init.method || "GET"} ${path} failed:`, text);
    throw new Error(description);
  }
  return data;
}

// "Today" in Brazil (Asaas due dates are calendar dates in America/Sao_Paulo).
export function todayBR(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonths(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10);
}

// End of a calendar day in Brazil (UTC-3, no DST since 2019) as a timestamptz.
export function endOfDayBR(isoDate: string): string {
  return `${isoDate}T23:59:59-03:00`;
}
