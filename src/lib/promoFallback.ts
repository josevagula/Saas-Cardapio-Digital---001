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

// Mirrors the day codes toggled in "Personalização" (VisualCustomizer's
// operatingDaysList), so promo hour suggestions only ever name a day the
// restaurant actually marked as open.
const DAY_CODE_NAMES: Record<string, string> = {
  dom: 'Domingos',
  seg: 'Segundas-feiras',
  ter: 'Terças-feiras',
  qua: 'Quartas-feiras',
  qui: 'Quintas-feiras',
  sex: 'Sextas-feiras',
  sab: 'Sábados'
};
const ALL_DAY_CODES = Object.keys(DAY_CODE_NAMES);

// What the promo generator needs from Personalização (VisualConfig).
export interface PromoStoreSettings {
  operatingDaysList?: string[];
  openingTime?: string; // "HH:MM"
  closingTime?: string; // "HH:MM"
  deliveryFee?: number;
}

const DAY_MINUTES = 24 * 60;

function parseTime(t?: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec((t || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function formatTime(minutes: number): string {
  const m = ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// The restaurant's opening window as [start, end) minutes, where end may run
// past midnight (e.g. 18:00–02:00 → [1080, 1560]). Same open==close rule as
// checkIsStoreOpen: open 24h. null = hours not configured.
export function getOpeningWindow(settings: PromoStoreSettings): { start: number; end: number } | null {
  const open = parseTime(settings.openingTime);
  const close = parseTime(settings.closingTime);
  if (open === null || close === null) return null;
  const end = close > open ? close : close + DAY_MINUTES;
  return { start: open, end };
}

// True when a time of day (minutes) falls inside the opening window.
export function isWithinOpeningWindow(minutes: number, settings: PromoStoreSettings): boolean {
  const w = getOpeningWindow(settings);
  if (!w) return true;
  return (minutes >= w.start && minutes <= w.end) || (minutes + DAY_MINUTES >= w.start && minutes + DAY_MINUTES <= w.end);
}

// Promo slots that only ever fall inside the hours set in Personalização.
function buildTimeSlots(settings: PromoStoreSettings): string[] {
  const w = getOpeningWindow(settings);
  if (!w) return ['durante o seu horário de atendimento'];
  const span = w.end - w.start;
  const len = Math.min(120, span);
  const slot = (from: number, label: string) => `das ${formatTime(from)} às ${formatTime(from + len)} (${label})`;
  const slots = [
    slot(w.start, 'logo na abertura, para puxar os primeiros pedidos'),
    slot(w.end - len, 'reta final antes de fechar')
  ];
  if (span >= 300) {
    const mid = w.start + Math.round((span - len) / 2 / 30) * 30;
    slots.push(slot(mid, 'Happy Hour no meio do expediente'));
  }
  return slots;
}

export function buildBestHours(settings: PromoStoreSettings): string[] {
  const { operatingDaysList } = settings;
  const codes = operatingDaysList && operatingDaysList.length > 0
    ? operatingDaysList.filter(c => DAY_CODE_NAMES[c])
    : ALL_DAY_CODES;

  if (codes.length === 0) {
    return ['Marque ao menos um dia de funcionamento em Personalização para receber sugestões de horários promocionais.'];
  }

  const days = shuffle(codes.map(c => DAY_CODE_NAMES[c]));
  const slots = shuffle(buildTimeSlots(settings));
  const count = Math.min(2, days.length);
  return Array.from({ length: count }, (_, i) => `${days[i]}, ${slots[i % slots.length]}`);
}

// Restaurants that already deliver for R$ 0 (Personalização) shouldn't be
// told to "offer free delivery" — they already do.
export function hasFreeDelivery(settings: PromoStoreSettings): boolean {
  return Number(settings.deliveryFee || 0) <= 0;
}

export function mentionsFreeDelivery(text: string): boolean {
  return /frete\s+gr[aá]tis|entrega\s+gr[aá]tis|isen[cç][aã]o\s+(de|do)\s+frete|frete\s+zero/i.test(text);
}

const MARKETING_STRATEGY_OPTIONS = [
  'Dispare uma mensagem em lote para clientes inativos com um cupom relâmpago de 10% válido só nos horários sugeridos.',
  'Ofereça frete grátis exclusivamente nas compras acima de R$ 50 feitas durante as horas promocionais sugeridas. Divulgue no status do WhatsApp usando gatilhos de escassez.',
  'Crie campanhas de cupom relâmpago nas redes sociais para engajar o público jovem.',
  'Poste o combo no status do WhatsApp com contagem regressiva para criar senso de urgência.'
];

export function pickMarketingStrategy(settings: PromoStoreSettings): string {
  const options = hasFreeDelivery(settings)
    ? MARKETING_STRATEGY_OPTIONS.filter(o => !mentionsFreeDelivery(o))
    : MARKETING_STRATEGY_OPTIONS;
  return pickRandom(options);
}

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

export function buildFallbackPromoReport(products: Pick<Product, 'name'>[], settings: PromoStoreSettings) {
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
    bestHours: buildBestHours(settings),
    marketingStrategy: pickMarketingStrategy(settings)
  };
}
