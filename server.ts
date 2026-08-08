import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// ==================== STRIPE SETUP ====================

let stripeClient: Stripe | null = null;
function getStripeClient(): Stripe | null {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      console.warn("STRIPE_SECRET_KEY is not defined. Billing routes will return an error.");
      return null;
    }
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
}

// Server-only Supabase client using the service role key, which bypasses
// Row Level Security — required so the Stripe webhook (which has no signed-in
// user session) can write subscription status onto the right account's
// profile row. Never expose this key to the client bundle (no VITE_ prefix).
// Typed `any` deliberately: this project has no generated Database schema
// (see src/lib/supabase.ts), and supabase-js's .update()/.insert() overloads
// resolve to `never` without one — matching the same untyped-table style
// already used throughout src/lib/workspaceRepo.ts.
let supabaseAdmin: any | null = null;
function getSupabaseAdmin(): any | null {
  if (!supabaseAdmin) {
    const url = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      console.warn("VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined. Billing routes will return an error.");
      return null;
    }
    supabaseAdmin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  }
  return supabaseAdmin;
}

// Resolves the signed-in Supabase user from the "Authorization: Bearer <access_token>"
// header sent by the frontend, using the service-role admin client to validate the token.
async function getUserFromAuthHeader(req: express.Request) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

// Stripe webhook — MUST be registered before express.json() below and use the
// raw body parser, since Stripe's signature verification needs the exact raw
// request bytes. Once express.json() has parsed the body, verification fails.
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const stripe = getStripeClient();
  const admin = getSupabaseAdmin();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !admin || !webhookSecret) {
    console.error("Stripe webhook received but Stripe/Supabase admin/webhook secret isn't configured.");
    return res.status(500).send("Webhook not configured");
  }

  const signature = req.headers["stripe-signature"];
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature as string, webhookSecret);
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  async function upsertSubscriptionByCustomerId(customerId: string, fields: Record<string, any>) {
    const { error } = await admin!.from("profiles").update(fields).eq("stripe_customer_id", customerId);
    if (error) console.error("Failed to update profile subscription fields:", error.message);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const supabaseUserId = session.client_reference_id;
          const fields = {
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            subscription_price_id: subscription.items.data[0]?.price.id ?? null,
            subscription_current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString()
          };
          if (supabaseUserId) {
            const { error } = await admin.from("profiles").update(fields).eq("id", supabaseUserId);
            if (error) console.error("Failed to update profile after checkout:", error.message);
          } else {
            await upsertSubscriptionByCustomerId(session.customer as string, fields);
          }
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertSubscriptionByCustomerId(subscription.customer as string, {
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          subscription_price_id: subscription.items.data[0]?.price.id ?? null,
          subscription_current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString()
        });
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertSubscriptionByCustomerId(subscription.customer as string, {
          subscription_status: "canceled"
        });
        break;
      }
      default:
        break;
    }
    return res.json({ received: true });
  } catch (err: any) {
    console.error("Error handling Stripe webhook event:", err);
    return res.status(500).send("Webhook handler error");
  }
});

app.use(express.json());

// Initialize AI Client Lazily
let aiClient: GoogleGenAI | null = null;

function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      console.warn("GEMINI_API_KEY is not defined in environment secrets. AI features will run with premium template simulation.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// ==================== API ROUTES ====================

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Creates a Stripe Checkout Session for the signed-in account's subscription
// and returns its URL — the frontend redirects the browser there. Used both
// to start paying for the first time and to renew a cancelled plan.
app.post("/api/stripe/create-checkout-session", async (req, res) => {
  const stripe = getStripeClient();
  const admin = getSupabaseAdmin();
  const priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
  if (!stripe || !admin || !priceId) {
    return res.status(500).json({ error: "Cobrança não configurada no servidor." });
  }

  const user = await getUserFromAuthHeader(req);
  if (!user) {
    return res.status(401).json({ error: "Sessão inválida. Faça login novamente." });
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    return res.status(500).json({ error: "Falha ao carregar dados da conta." });
  }

  let customerId = profile?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id }
    });
    customerId = customer.id;
    const { error: updateError } = await admin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
    if (updateError) console.error("Failed to save stripe_customer_id:", updateError.message);
  }

  const origin = `${req.protocol}://${req.get("host")}`;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    // 7-day free trial, card required upfront — Stripe won't charge until
    // the trial ends, matching the "7 dias grátis" promise on the signup
    // page, but a real payment method must be on file to start it.
    subscription_data: { trial_period_days: 7, metadata: { supabase_user_id: user.id } },
    success_url: `${origin}/?checkout=success`,
    cancel_url: `${origin}/?checkout=cancel`
  });

  return res.json({ url: session.url });
});

// Creates a Stripe Billing Portal session so a signed-in account can manage
// or cancel their subscription through Stripe's own hosted UI.
app.post("/api/stripe/create-portal-session", async (req, res) => {
  const stripe = getStripeClient();
  const admin = getSupabaseAdmin();
  if (!stripe || !admin) {
    return res.status(500).json({ error: "Cobrança não configurada no servidor." });
  }

  const user = await getUserFromAuthHeader(req);
  if (!user) {
    return res.status(401).json({ error: "Sessão inválida. Faça login novamente." });
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile?.stripe_customer_id) {
    return res.status(400).json({ error: "Esta conta ainda não tem uma assinatura Stripe." });
  }

  const origin = `${req.protocol}://${req.get("host")}`;
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id as string,
    return_url: `${origin}/?billing=return`
  });

  return res.json({ url: portalSession.url });
});

// AI 1: Product Description Generator
app.post("/api/gemini/generate-description", async (req, res) => {
  const { productName, category, ingredients } = req.body;

  if (!productName || !category) {
    return res.status(400).json({ error: "Nome do produto e categoria são obrigatórios." });
  }

  const ai = getAIClient();
  if (!ai) {
    // Elegant fallback simulation
    return res.json({
      description: `Experimente o nosso incrível ${productName}! Cuidadosamente preparado com ${ingredients && ingredients.length > 0 ? ingredients.join(", ") : "ingredientes frescos de alta qualidade"}. Uma explosão de sabores perfeita para saciar sua fome e encantar o seu paladar.`,
      copy: `🔥 Procurando o sabor ideal? Nosso ${productName} une frescor e tradição em cada mordida. Peça agora e receba quentinho em casa com entrega super rápida!`,
      keywords: [productName.toLowerCase(), category.toLowerCase(), "delivery", "saboroso", "sushi-menu"]
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Gere uma descrição deliciosa, uma copy de vendas persuasiva para o WhatsApp e 5 palavras-chave de busca para um item com os seguintes detalhes:
Nome do Produto: ${productName}
Categoria: ${category}
Ingredientes: ${ingredients && ingredients.length > 0 ? ingredients.join(", ") : "Ingredientes selecionados da casa"}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: "A detailed and mouth-watering product description in Portuguese." },
            copy: { type: Type.STRING, description: "A highly persuasive sales pitch copy suitable for social media or WhatsApp in Portuguese." },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5 relevant search or SEO keywords." }
          },
          required: ["description", "copy", "keywords"]
        }
      }
    });

    const text = response.text;
    if (text) {
      return res.json(JSON.parse(text));
    } else {
      throw new Error("Empty response from Gemini");
    }
  } catch (error: any) {
    console.error("Erro na API do Gemini:", error);
    // Graceful error recovery with custom fallback
    return res.json({
      description: `Incrível ${productName} da categoria ${category}. Preparado com maestria usando nossos melhores ingredientes selecionados. Sabor irresistível que garante uma experiência gastronômica memorável.`,
      copy: `⚡ O queridinho da casa! Nosso ${productName} está pronto para ser enviado até você. Peça já pelo nosso cardápio digital!`,
      keywords: [productName.toLowerCase(), category.toLowerCase(), "comida", "qualidade", "pedir-online"]
    });
  }
});

// Builds combo suggestions using ONLY product names that really exist in the
// caller's cardápio — never invents items, so this is safe to use both as the
// no-API-key template and as the error-recovery fallback below.
const FALLBACK_COMBO_NAME_TEMPLATES: ((a: string, b: string) => string)[] = [
  (a, b) => `Combo Sushi Mega: ${a} + ${b}`,
  (a, b) => `Duo Executivo do Chefe: ${a} + ${b}`,
  (a, b) => `Combo Relâmpago: ${a} + ${b}`,
  (a, b) => `Combinado Especial: ${a} + ${b}`
];
const FALLBACK_COMBO_DESCRIPTIONS = [
  "A união perfeita de dois itens já cadastrados no seu cardápio por um preço super especial.",
  "Peça esses dois itens já cadastrados em conjunto e garanta um desconto exclusivo.",
  "Uma combinação pensada para vender mais nos horários de pico, usando só o que já está no seu cardápio."
];
const FALLBACK_DISCOUNTS = [10, 12, 15, 18, 20, 22, 25];

function shuffleNames(names: string[]) {
  const copy = [...names];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// Reshuffles the caller's own products and randomizes the copy/discount on
// every call, so clicking "Criar Novas Promoções" again produces a new
// promotion instead of the same fixed combo — never invents a product that
// isn't already registered in the cardápio, so this is safe to use both as
// the no-API-key template and as the error-recovery fallback below.
function buildFallbackCombos(names: string[]) {
  const shuffled = shuffleNames(names);
  if (shuffled.length === 0) return [];
  if (shuffled.length === 1) {
    return [{
      name: `Oferta Especial: ${shuffled[0]}`,
      products: [shuffled[0]],
      discountPercent: pickRandom(FALLBACK_DISCOUNTS),
      description: `Desconto exclusivo no nosso ${shuffled[0]} para atrair mais pedidos enquanto novos itens são cadastrados no cardápio.`
    }];
  }
  const combos = [{
    name: pickRandom(FALLBACK_COMBO_NAME_TEMPLATES)(shuffled[0], shuffled[1]),
    products: [shuffled[0], shuffled[1]],
    discountPercent: pickRandom(FALLBACK_DISCOUNTS),
    description: pickRandom(FALLBACK_COMBO_DESCRIPTIONS)
  }];
  if (shuffled.length >= 4) {
    combos.push({
      name: pickRandom(FALLBACK_COMBO_NAME_TEMPLATES)(shuffled[2], shuffled[3]),
      products: [shuffled[2], shuffled[3]],
      discountPercent: pickRandom(FALLBACK_DISCOUNTS),
      description: pickRandom(FALLBACK_COMBO_DESCRIPTIONS)
    });
  }
  return combos;
}

// Keeps only combos whose products are exact matches (case/whitespace-insensitive)
// against the real cardápio, dropping any hallucinated/invented item names.
function sanitizeCombos(rawCombos: any[], validNames: string[]) {
  const validSet = new Set(validNames.map(n => n.trim().toLowerCase()));
  return (Array.isArray(rawCombos) ? rawCombos : [])
    .map((combo: any) => ({
      ...combo,
      products: Array.isArray(combo?.products)
        ? combo.products.filter((p: any) => typeof p === "string" && validSet.has(p.trim().toLowerCase()))
        : []
    }))
    .filter((combo: any) => combo.products.length >= 1);
}

// AI 2: AI Promotion Suggester
app.post("/api/gemini/suggest-promotions", async (req, res) => {
  const { products } = req.body;

  if (!products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: "É necessário enviar uma lista de produtos." });
  }

  const productNames = products.map((p: any) => p?.name).filter(Boolean);

  const ai = getAIClient();
  if (!ai) {
    return res.json({
      combos: buildFallbackCombos(productNames),
      bestHours: ["Terça a Quinta-feira, das 18:00 às 20:00 (Período de Happy Hour)", "Domingos, das 15:00 às 17:00 (Lanche da tarde)"],
      marketingStrategy: "Ofereça frete grátis exclusivamente nas compras acima de R$ 50 feitas durantes as horas promocionais sugeridas. Divulgue no status do WhatsApp usando gatilhos de escassez (ex: 'Apenas para as próximas 10 pessoas!')."
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Com base EXCLUSIVAMENTE na seguinte lista de produtos já cadastrados no cardápio do restaurante, sugira 2 combos promocionais altamente atrativos, os melhores dias/horários para aplicar descontos (para aumentar o fluxo em dias lentos), e uma estratégia de marketing inteligente.
REGRA OBRIGATÓRIA: use apenas os nomes de produtos exatamente como aparecem na lista abaixo. NUNCA invente, altere ou sugira produtos que não estejam nesta lista.
Produtos do cardápio: ${JSON.stringify(productNames)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            combos: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Nome atrativo e comercial do combo." },
                  products: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de nomes dos produtos inclusos, copiados EXATAMENTE da lista de produtos do cardápio fornecida — nunca produtos inventados." },
                  discountPercent: { type: Type.INTEGER, description: "Porcentagem recomendada de desconto do combo." },
                  description: { type: Type.STRING, description: "Explicação do porquê esse combo é irresistível." }
                },
                required: ["name", "products", "discountPercent", "description"]
              }
            },
            bestHours: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de horários ou dias recomendados para promoções relâmpago."
            },
            marketingStrategy: {
              type: Type.STRING,
              description: "Uma estratégia curta de copy e divulgação para reter clientes."
            }
          },
          required: ["combos", "bestHours", "marketingStrategy"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    const parsed = JSON.parse(text);
    // Never trust the model blindly: strip out any suggested product that isn't
    // actually registered in the cardápio before returning the combos.
    const sanitized = sanitizeCombos(parsed.combos, productNames);
    return res.json({
      ...parsed,
      combos: sanitized.length > 0 ? sanitized : buildFallbackCombos(productNames)
    });
  } catch (error: any) {
    console.error("Erro na API de Promoção:", error);
    return res.json({
      combos: buildFallbackCombos(productNames),
      bestHours: ["Quartas-feiras à noite", "Sábados à tarde"],
      marketingStrategy: "Crie campanhas de cupom relâmpago nas redes sociais para engajar o público jovem."
    });
  }
});

// AI 3: AI Sales Analyst
app.post("/api/gemini/analyze-sales", async (req, res) => {
  const { salesSummary, topProducts, lowPerformingProducts } = req.body;

  const ai = getAIClient();
  if (!ai) {
    // Template analytical summary
    return res.json({
      lowPerformingAnalysis: "Os produtos com baixa saída representam uma ociosidade no estoque de ingredientes. Sugere-se criar um combo que agregue o produto menos vendido (como sobremesas artesanais) junto com o líder de vendas para estimular a experimentação e diminuir o desperdício.",
      championsAnalysis: "Seus produtos campeões de vendas estão concentrados na categoria principal. Eles são os pilares da sua receita e possuem alta fidelidade. Vale a pena criar uma variação premium destes itens para aumentar o ticket médio geral.",
      opportunities: [
        "Lançamento de um Programa de Fidelidade focado no produto campeão para incentivar compras recorrentes no meio da semana.",
        "Implementar cupons de cashback (ex: compre R$ 80 hoje, ganhe R$ 10 na próxima semana) para reduzir o intervalo entre compras.",
        "Aproveitar o horário de pico das 19h às 21h para ofertar acompanhamentos rápidos com 20% de desconto na tela final do carrinho."
      ],
      forecastSummary: "Previsão de crescimento de 8% a 12% no faturamento mensal se houver ativação de combos nos dias de menor movimento (segundas e terças-feiras). Há potencial de aumento de 15% no ticket médio através de sugestões personalizadas no carrinho público."
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Analise os seguintes dados de vendas de uma plataforma SaaS de cardápios e deliverys, gerando conselhos e recomendações estratégicas acionáveis:
Resumo de Vendas: ${JSON.stringify(salesSummary)}
Principais Vendedores: ${JSON.stringify(topProducts)}
Produtos com Menor Desempenho: ${JSON.stringify(lowPerformingProducts)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lowPerformingAnalysis: { type: Type.STRING, description: "Análise profunda de porquê alguns produtos vendem pouco e como reverter o quadro." },
            championsAnalysis: { type: Type.STRING, description: "Explicação das forças dos produtos mais vendidos e como usá-los para puxar outras vendas." },
            opportunities: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 recomendações operacionais e estratégicas para alavancar faturamento." },
            forecastSummary: { type: Type.STRING, description: "Previsão baseada no ticket médio e frequência de pedidos." }
          },
          required: ["lowPerformingAnalysis", "championsAnalysis", "opportunities", "forecastSummary"]
        }
      }
    });

    const text = response.text;
    if (text) {
      return res.json(JSON.parse(text));
    } else {
      throw new Error("Empty response from Gemini");
    }
  } catch (error: any) {
    console.error("Erro na Análise de Vendas:", error);
    return res.json({
      lowPerformingAnalysis: "Analise a precificação e a qualidade das fotos dos itens com menor saída. Reduzir temporariamente o preço ou reposicionar no topo do cardápio pode reverter a situação.",
      championsAnalysis: "Seus campeões são de alta aceitação. Mantenha os padrões rigorosos de qualidade destes itens pois eles seguram a reputação do estabelecimento.",
      opportunities: [
        "Criar cupons de fidelidade progressivos.",
        "Melhorar a copy de vendas das categorias secundárias.",
        "Oferecer atendimento ágil e personalizado via WhatsApp."
      ],
      forecastSummary: "Espera-se estabilização com tendência de alta moderada se forem implementados cupons inteligentes de desconto no fim de semana."
    });
  }
});


// ==================== VITE MIDDLEWARE SETUP ====================

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite Development Middleware Mounted.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Serving Static Assets from 'dist' directory.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
});
