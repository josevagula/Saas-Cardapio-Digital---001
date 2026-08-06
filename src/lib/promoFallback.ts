import type { Product } from '../types';

// Used whenever the real Gemini-backed /api/gemini/suggest-promotions route
// isn't reachable — which, on the static GitHub Pages deploy, is every time,
// since there's no server behind it. Each call reshuffles the restaurant's
// own products and randomizes the copy/discount so clicking "Criar Novas
// Promoções" repeatedly actually produces a new promotion instead of the
// same fixed combo every time — never inventing a product that isn't
// already registered in the cardápio.

const COMBO_NAME_TEMPLATES: ((a: string, b: string) => string)[] = [
  (a, b) => `Combo Sushi Supreme: ${a} + ${b}`,
  (a, b) => `Dupla Perfeita: ${a} + ${b}`,
  (a, b) => `Combo Especial da Casa: ${a} + ${b}`,
  (a, b) => `Oferta Relâmpago: ${a} + ${b}`,
  (a, b) => `Combo do Chef: ${a} + ${b}`
];

const COMBO_DESCRIPTIONS = [
  'Uma combinação irresistível de produtos já cadastrados no seu cardápio, pensada para aumentar o ticket médio.',
  'Junte esses itens que já fazem parte do seu cardápio e ofereça um desconto que os clientes não vão resistir.',
  'Combine sabores queridos do seu cardápio nesse combo pensado para vender mais nos horários de pico.',
  'Uma sugestão pronta pra rodar hoje mesmo, usando só produtos que você já tem cadastrados.'
];

const SINGLE_PRODUCT_DESCRIPTIONS = [
  'Um desconto exclusivo no seu produto cadastrado para atrair mais pedidos.',
  'Destaque esse item já cadastrado com uma oferta especial por tempo limitado.',
  'Aproveite para dar mais visibilidade a esse produto do seu cardápio com um preço promocional.'
];

const DISCOUNT_OPTIONS = [10, 12, 15, 18, 20, 22, 25];

const BEST_HOURS_OPTIONS = [
  ['Quintas e Sextas-feiras de noite'],
  ['Terça a Quinta-feira, das 18:00 às 20:00 (Período de Happy Hour)', 'Domingos, das 15:00 às 17:00 (Lanche da tarde)'],
  ['Quartas-feiras à noite', 'Sábados à tarde'],
  ['Segundas e Terças-feiras, das 19:00 às 21:00 (dias de menor movimento)']
];

const MARKETING_STRATEGY_OPTIONS = [
  'Disparar mensagem em lote para clientes inativos com cupom relâmpago de 10% durante as 19h.',
  'Ofereça frete grátis exclusivamente nas compras acima de R$ 50 feitas durante as horas promocionais sugeridas. Divulgue no status do WhatsApp usando gatilhos de escassez.',
  'Crie campanhas de cupom relâmpago nas redes sociais para engajar o público jovem.',
  'Poste o combo no status do WhatsApp com contagem regressiva para criar senso de urgência.'
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function buildFallbackPromoReport(products: Product[]) {
  const realNames = shuffle(products.map(p => p.name).filter(Boolean));

  const combos: { name: string; products: string[]; discountPercent: number; description: string }[] = [];

  if (realNames.length === 1) {
    combos.push({
      name: `Oferta Especial: ${realNames[0]}`,
      products: [realNames[0]],
      discountPercent: pickRandom(DISCOUNT_OPTIONS),
      description: pickRandom(SINGLE_PRODUCT_DESCRIPTIONS)
    });
  } else if (realNames.length >= 2) {
    combos.push({
      name: pickRandom(COMBO_NAME_TEMPLATES)(realNames[0], realNames[1]),
      products: [realNames[0], realNames[1]],
      discountPercent: pickRandom(DISCOUNT_OPTIONS),
      description: pickRandom(COMBO_DESCRIPTIONS)
    });
    if (realNames.length >= 4) {
      combos.push({
        name: pickRandom(COMBO_NAME_TEMPLATES)(realNames[2], realNames[3]),
        products: [realNames[2], realNames[3]],
        discountPercent: pickRandom(DISCOUNT_OPTIONS),
        description: pickRandom(COMBO_DESCRIPTIONS)
      });
    }
  }

  return {
    combos,
    bestHours: pickRandom(BEST_HOURS_OPTIONS),
    marketingStrategy: pickRandom(MARKETING_STRATEGY_OPTIONS)
  };
}
