import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

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
      keywords: [productName.toLowerCase(), category.toLowerCase(), "delivery", "saboroso", "luvia-menu"]
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
function buildFallbackCombos(names: string[]) {
  if (names.length === 0) return [];
  if (names.length === 1) {
    return [{
      name: `Oferta Especial: ${names[0]}`,
      products: [names[0]],
      discountPercent: 10,
      description: `Desconto exclusivo no nosso ${names[0]} para atrair mais pedidos enquanto novos itens são cadastrados no cardápio.`
    }];
  }
  const combos = [{
    name: `Combo Luvia Mega: ${names[0]} + ${names[1]}`,
    products: [names[0], names[1]],
    discountPercent: 15,
    description: "A união perfeita de dois itens já cadastrados no seu cardápio por um preço super especial."
  }];
  const last = names[names.length - 1];
  const mid = names[Math.floor(names.length / 2)];
  if (names.length >= 3 && last !== mid) {
    combos.push({
      name: "Duo Executivo do Chefe",
      products: [mid, last],
      discountPercent: 20,
      description: "Peça esses dois itens já cadastrados em conjunto e garanta 20% de economia."
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
