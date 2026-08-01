import { VisualConfig, Category, Product, Order, Coupon, CustomerInfo, SalesAnalytics, SubscriptionPlan } from '../types';
import { PONTO_JAPA_LOGO_DATA_URL } from '../components/SushiIcons';

export const INITIAL_VISUAL_CONFIG: VisualConfig = {
  establishmentName: "Ponto japa",
  phone: "(11) 98765-4321",
  address: "Alameda das Esmeraldas, 450 - Jardins, São Paulo - SP",
  logoUrl: PONTO_JAPA_LOGO_DATA_URL,
  bannerUrl: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=1200&h=400&fit=crop&q=80",
  primaryColor: "#F97316", // Orange Sushi Premium
  fontFamily: "display",
  themeMode: "dark", // Mode escuro padrão para consistência com o painel SaaS
  deliveryFee: 7.00,
  menuSlug: "ponto-japa",
  openingTime: "18:00",
  closingTime: "23:30",
  openingDays: "Segunda a Domingo",
  operatingDaysList: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
  deliveryTime: "30-45 min",
  autoStatusByTime: false,
  isStoreOpenManual: true
};

export const INITIAL_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Combinados Special", icon: "SushiRollIcon" },
  { id: "cat-2", name: "Temakis", icon: "Flame" },
  { id: "cat-3", name: "Sashimi & Uramaki", icon: "HashiIcon" },
  { id: "cat-4", name: "Hot Rolls & Entradas", icon: "UtensilsCrossed" },
  { id: "cat-5", name: "Bebidas & Sakes", icon: "Coffee" },
  { id: "cat-6", name: "Combos IA", icon: "Sparkles" }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-combo-20",
    name: "Monte Seu Combinado (20 Peças)",
    description: "Escolha exatamente quais peças você quer! Monte 20 peças de sushi com os seus sabores favoritos (Hot Roll, Philadelphia, Califórnia, Salmão e Kani). Validação de limite automática.",
    price: 59.90,
    promoPrice: 49.90,
    categoryId: "cat-1",
    imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&h=400&fit=crop&q=80",
    isAvailable: true,
    ingredients: ["Personalizável pelo cliente", "20 Peças à sua escolha"],
    salesCount: 512,
    tags: ["Montador Inteligente", "Mais Vendido"],
    salesSuccessRate: "high",
    isComboBuilder: true,
    totalPieces: 20
  },
  {
    id: "prod-combo-30",
    name: "Monte Seu Combinado (30 Peças)",
    description: "Combinado médio customizável! Escolha livremente entre 30 peças dos sushis mais amados do Japão. Validação inteligente pelo sistema.",
    price: 84.90,
    promoPrice: 74.90,
    categoryId: "cat-1",
    imageUrl: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=500&h=400&fit=crop&q=80",
    isAvailable: true,
    ingredients: ["Personalizável pelo cliente", "30 Peças à sua escolha"],
    salesCount: 420,
    tags: ["Montador Inteligente", "Sucesso da Casa"],
    salesSuccessRate: "high",
    isComboBuilder: true,
    totalPieces: 30
  },
  {
    id: "prod-combo-50",
    name: "Festival Monte Seu Combinado (50 Peças)",
    description: "Ideal para compartilhar em grupo ou casal! Monte 50 peças distribuídas exatamente do seu jeito entre sashimis, hot rolls, uramakis e nigiris.",
    price: 139.90,
    promoPrice: 119.90,
    categoryId: "cat-1",
    imageUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=500&h=400&fit=crop&q=80",
    isAvailable: true,
    ingredients: ["Personalizável pelo cliente", "50 Peças à sua escolha"],
    salesCount: 380,
    tags: ["Montador Inteligente", "Favorito dos Grupos"],
    salesSuccessRate: "high",
    isComboBuilder: true,
    totalPieces: 50
  },
  {
    id: "prod-combo-100",
    name: "Mega Fest 100 Peças Especial",
    description: "A melhor experiência para festas e reuniões! 100 peças totalmente customizáveis pelo cliente no nosso montador inteligente de combos.",
    price: 249.90,
    promoPrice: 219.90,
    categoryId: "cat-1",
    imageUrl: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=500&h=400&fit=crop&q=80",
    isAvailable: true,
    ingredients: ["Personalizável pelo cliente", "100 Peças à sua escolha"],
    salesCount: 190,
    tags: ["Montador Inteligente", "Festa & Eventos"],
    salesSuccessRate: "high",
    isComboBuilder: true,
    totalPieces: 100
  },
  {
    id: "prod-temaki-meio",
    name: "Temaki Meio a Meio (Especialidade)",
    description: "Monte seu Temaki com 2 recheios diferentes! Ex: 50% Salmão Fresco c/ Cream Cheese e 50% Skin Crocante c/ Tarê. O preço é calculado automaticamente.",
    price: 33.90,
    categoryId: "cat-2",
    imageUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=500&h=400&fit=crop&q=80",
    isAvailable: true,
    ingredients: ["2 Recheios à Escolha (50% / 50%)", "Alga Nori Crocante", "Arroz Shari"],
    salesCount: 310,
    tags: ["Sistema Meio a Meio", "Exclusividade"],
    salesSuccessRate: "high",
    supportsHalfAndHalf: true,
    halfAndHalfFlavors: ["Salmão Completo c/ Cream Cheese", "Skin Crocante c/ Tarê", "Kani c/ Cream Cheese", "Camarão Empanado (+ R$ 3)", "Salmão Grelhado c/ Cebolinha"]
  },
  {
    id: "prod-hotroll-meio",
    name: "Hot Roll Meio a Meio (10 pçs)",
    description: "Escolha 2 sabores para a sua porção de Hot Roll (5 peças de cada sabor). Crocância imbatível e molho tarê artesanal.",
    price: 36.90,
    categoryId: "cat-4",
    imageUrl: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=500&h=400&fit=crop&q=80",
    isAvailable: true,
    ingredients: ["5x Sabor 1", "5x Sabor 2", "Massa Harumaki Crocante", "Cream Cheese"],
    salesCount: 280,
    tags: ["Sistema Meio a Meio", "Hot Roll"],
    salesSuccessRate: "high",
    supportsHalfAndHalf: true,
    halfAndHalfFlavors: ["Hot Salmão Tradicional", "Hot Ebi Camarão", "Hot Doritos Crispy", "Hot Couve Crocante", "Hot Doce de Leite c/ Banana"]
  },
  {
    id: "prod-1",
    name: "Combo Tokyo Premium (32 Peças)",
    description: "Seleção exclusiva do sushiman: 8 Sashimis de Salmão Fresco, 8 Uramakis Philadelphia, 8 Hossomakis de Salmão e 8 Hot Rolls Crocantes com Cream Cheese e molho Tarê artesanal.",
    price: 89.90,
    promoPrice: 79.90,
    categoryId: "cat-1",
    imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&h=400&fit=crop&q=80",
    isAvailable: true,
    ingredients: ["8x Sashimi Salmão", "8x Uramaki Philadelphia", "8x Hossomaki Salmão", "8x Hot Roll Crocante", "Cream Cheese", "Molho Tarê"],
    salesCount: 342,
    tags: ["Destaque do Chefe", "Campeão de Vendas"],
    salesSuccessRate: "high"
  },
  {
    id: "prod-hot-temaki",
    name: "Hot Temaki (1 unidade)",
    description: "Arroz, nori, salmão, cream cheese, cebolinha verde e molho tarê",
    price: 39.99,
    categoryId: "cat-2",
    imageUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=500&h=400&fit=crop&q=80",
    isAvailable: true,
    ingredients: ["Arroz", "Nori", "Salmão", "Cream Cheese", "Cebolinha Verde", "Molho Tarê"],
    salesCount: 450,
    tags: ["Destaque", "Mais Vendidos"],
    salesSuccessRate: "high"
  },
  {
    id: "prod-2",
    name: "Temaki Salmão Completo",
    description: "Cone de alga Nori super crocante, recheado com generosos cubos de salmão fresco temperado, cream cheese cremoso, gergelim torrado e cebolinha fatiada.",
    price: 32.90,
    promoPrice: 28.90,
    categoryId: "cat-2",
    imageUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=500&h=400&fit=crop&q=80",
    isAvailable: true,
    ingredients: ["Salmão Fresco", "Cream Cheese", "Alga Nori", "Arroz Shari", "Gergelim", "Cebolinha"],
    salesCount: 289,
    tags: ["Mais Vendidos", "Wasabi Fresh"],
    salesSuccessRate: "high"
  },
  {
    id: "prod-4",
    name: "Sashimi de Salmão Maçaricado (10 pçs)",
    description: "Lâminas nobres de salmão fresco suavemente seladas no maçarico com toque de azeite trufado, flor de sal, tarê e cebolinha fresca.",
    price: 44.90,
    promoPrice: 39.90,
    categoryId: "cat-3",
    imageUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&h=400&fit=crop&q=80",
    isAvailable: true,
    ingredients: ["10x Salmão Fresco", "Azeite Trufado", "Molho Tarê", "Flor de Sal", "Cebolinha"],
    salesCount: 412,
    tags: ["Gourmet", "Trufado"],
    salesSuccessRate: "high"
  },
  {
    id: "prod-5",
    name: "Uramaki Ebi Tempurá (8 pçs)",
    description: "Enrolado de arroz temperado com camarão empanado na farinha panko crocante, lâminas de abacate e cream cheese envolto por sementes de gergelim.",
    price: 36.90,
    categoryId: "cat-3",
    imageUrl: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=500&h=400&fit=crop&q=80",
    isAvailable: true,
    ingredients: ["Camarão Tempurá", "Abacate", "Cream Cheese", "Arroz Shari", "Gergelim"],
    salesCount: 144,
    tags: ["Camarão"],
    salesSuccessRate: "medium"
  },
  {
    id: "prod-6",
    name: "Guioza de Lombo e Legumes (6 pçs)",
    description: "Pastéis japoneses tradicionais recheados com lombo suíno temperado e legumes frescos, grelhados no vapor. Acompanha molho ponzu de gergelim.",
    price: 24.90,
    categoryId: "cat-4",
    imageUrl: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=500&h=400&fit=crop&q=80",
    isAvailable: true,
    ingredients: ["Lombo Suíno", "Gengibre", "Acelga", "Massa Guioza", "Molho Ponzu"],
    salesCount: 220,
    tags: ["Entrada Quente"],
    salesSuccessRate: "medium"
  },
  {
    id: "prod-7",
    name: "Chá Verde Matcha & Limão Gelado",
    description: "Bebida leve e refrescante produzida artesanalmente com extrato puro de chá verde japonês matcha, limão taiti e folhas de hortelã.",
    price: 13.90,
    categoryId: "cat-5",
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&h=400&fit=crop&q=80",
    isAvailable: true,
    ingredients: ["Chá Verde Matcha", "Limão Taiti", "Hortelã", "Gelo"],
    salesCount: 96,
    tags: ["Bebida Japonesa"],
    salesSuccessRate: "medium"
  }
];

export const INITIAL_COUPONS: Coupon[] = [
  { code: "SUSHI10", discountType: "percentage", value: 10, minOrderValue: 40.00, active: true },
  { code: "DESCONTO30", discountType: "fixed", value: 30, minOrderValue: 100.00, active: true },
  { code: "FRETEGRATIS", discountType: "free_delivery", value: 0, minOrderValue: 50.00, active: true },
  { code: "BOASVINDAS", discountType: "percentage", value: 15, minOrderValue: 30.00, isFirstPurchaseOnly: true, active: true }
];

export const INITIAL_CUSTOMERS: CustomerInfo[] = [
  { id: "cust-1", name: "Gabriel Menezes", phone: "(11) 99123-4567", email: "gabriel.menezes@email.com", address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP", loyaltyPoints: 80, orderCount: 8, lastOrderDate: "2026-07-04" },
  { id: "cust-2", name: "Mariana Alencar", phone: "(11) 98234-5678", email: "mariana.al@email.com", address: "Rua Augusta, 2400 - Cerqueira César, São Paulo - SP", loyaltyPoints: 120, orderCount: 14, lastOrderDate: "2026-07-05" },
  { id: "cust-3", name: "Thiago Silva", phone: "(11) 97345-6789", email: "thiago.silva@email.com", address: "Rua Pamplona, 520 - Jardim Paulista, São Paulo - SP", loyaltyPoints: 30, orderCount: 3, lastOrderDate: "2026-07-02" },
  { id: "cust-4", name: "Beatriz Oliveira", phone: "(11) 96456-7890", email: "bia.oliveira@email.com", address: "Alameda Lorena, 1500 - Jardim Paulista, São Paulo - SP", loyaltyPoints: 100, orderCount: 11, lastOrderDate: "2026-07-05" },
  { id: "cust-5", name: "Rodrigo Sato", phone: "(11) 95111-2233", email: "rodrigo.sato@email.com", address: "Rua dos Pinheiros, 850 - Pinheiros, São Paulo - SP", loyaltyPoints: 60, orderCount: 6, lastOrderDate: "2026-07-06" },
  { id: "cust-6", name: "Camila Tanaka", phone: "(11) 94222-3344", email: "camila.tanaka@email.com", address: "Rua Oscar Freire, 300 - Jardins, São Paulo - SP", loyaltyPoints: 150, orderCount: 15, lastOrderDate: "2026-07-06" }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: "LUV-4012",
    customerName: "Mariana Alencar",
    customerPhone: "(11) 98234-5678",
    customerEmail: "mariana.al@email.com",
    customerAddress: "Rua Augusta, 2400 - Cerqueira César, São Paulo - SP",
    items: [
      { product: INITIAL_PRODUCTS[0], quantity: 1, notes: "Shoyu extra e gergelim por favor" },
      { product: INITIAL_PRODUCTS[1], quantity: 2, notes: "Sem cebolinha em um dos temakis" },
      { product: INITIAL_PRODUCTS[6], quantity: 2 }
    ],
    status: "received",
    paymentMethod: "pix",
    deliveryMethod: "delivery",
    deliveryFee: 7.00,
    discountAmount: 0,
    total: 172.50,
    createdAt: "2026-07-05T10:15:00-07:00",
    pointsEarned: 17
  },
  {
    id: "LUV-4011",
    customerName: "Gabriel Menezes",
    customerPhone: "(11) 99123-4567",
    customerEmail: "gabriel.menezes@email.com",
    customerAddress: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
    items: [
      { product: INITIAL_PRODUCTS[1], quantity: 1 },
      { product: INITIAL_PRODUCTS[3], quantity: 1 }
    ],
    status: "preparing",
    paymentMethod: "credit_card",
    deliveryMethod: "delivery",
    deliveryFee: 7.00,
    discountAmount: 7.78, // 10% coupon SUSHI10
    total: 77.02,
    createdAt: "2026-07-05T09:45:00-07:00",
    pointsEarned: 7,
    couponCode: "SUSHI10"
  },
  {
    id: "LUV-4010",
    customerName: "Rodrigo Sato",
    customerPhone: "(11) 95111-2233",
    customerEmail: "rodrigo.sato@email.com",
    customerAddress: "Rua dos Pinheiros, 850 - Pinheiros, São Paulo - SP",
    items: [
      { product: INITIAL_PRODUCTS[0], quantity: 1, notes: "Wasabi à parte" }
    ],
    status: "dispatched",
    paymentMethod: "pix",
    deliveryMethod: "delivery",
    deliveryFee: 7.00,
    discountAmount: 0,
    total: 86.90,
    createdAt: "2026-07-05T09:20:00-07:00",
    pointsEarned: 8
  },
  {
    id: "LUV-4009",
    customerName: "Beatriz Oliveira",
    customerPhone: "(11) 96456-7890",
    customerEmail: "bia.oliveira@email.com",
    customerAddress: "Alameda Lorena, 1500 - Jardim Paulista, São Paulo - SP",
    items: [
      { product: INITIAL_PRODUCTS[2], quantity: 1 },
      { product: INITIAL_PRODUCTS[5], quantity: 1 },
      { product: INITIAL_PRODUCTS[6], quantity: 1 }
    ],
    status: "delivered",
    paymentMethod: "pix",
    deliveryMethod: "delivery",
    deliveryFee: 7.00,
    discountAmount: 0,
    total: 80.70,
    createdAt: "2026-07-04T21:10:00-07:00",
    pointsEarned: 8
  },
  {
    id: "LUV-4008",
    customerName: "Thiago Silva",
    customerPhone: "(11) 97345-6789",
    customerEmail: "thiago.silva@email.com",
    customerAddress: "Rua Pamplona, 520 - Jardim Paulista, São Paulo - SP",
    items: [
      { product: INITIAL_PRODUCTS[1], quantity: 2 }
    ],
    status: "delivered",
    paymentMethod: "debit_card",
    deliveryMethod: "delivery",
    deliveryFee: 7.00,
    discountAmount: 0,
    total: 72.80,
    createdAt: "2026-07-04T19:30:00-07:00",
    pointsEarned: 7
  }
];

export const INITIAL_ANALYTICS: SalesAnalytics = {
  dailyRevenue: 336.42,
  weeklyRevenue: 4820.50,
  monthlyRevenue: 21940.00,
  totalOrders: 340,
  ticketAverage: 64.53,
  activeCustomers: 198,
  repurchaseRate: 68.4,
  sushiTypeDistribution: [
    { name: 'Combinados & Combos', value: 45 },
    { name: 'Hot Rolls & Fry', value: 25 },
    { name: 'Temakis', value: 15 },
    { name: 'Sashimis & Niguiris', value: 10 },
    { name: 'Bebidas & Sobremesas', value: 5 }
  ],
  revenueHistory: [
    { date: "29 Jun", amount: 1450 },
    { date: "30 Jun", amount: 1680 },
    { date: "01 Jul", amount: 1320 },
    { date: "02 Jul", amount: 1950 },
    { date: "03 Jul", amount: 2850 },
    { date: "04 Jul", amount: 3400 },
    { date: "05 Jul", amount: 336.42 }
  ],
  ordersHistory: [
    { date: "29 Jun", count: 24 },
    { date: "30 Jun", count: 28 },
    { date: "01 Jul", count: 21 },
    { date: "02 Jul", count: 33 },
    { date: "03 Jul", count: 45 },
    { date: "04 Jul", count: 58 },
    { date: "05 Jul", count: 4 }
  ],
  paymentDistribution: [
    { name: "Pix", value: 65 },
    { name: "Cartão de Crédito", value: 25 },
    { name: "Cartão de Débito", value: 7 },
    { name: "Dinheiro", value: 3 }
  ]
};

// Blank starting state for a brand-new trial account: no demo data,
// so the customer builds their own menu/catalog from scratch.
export const BLANK_VISUAL_CONFIG: VisualConfig = {
  establishmentName: "",
  phone: "",
  address: "",
  logoUrl: "",
  bannerUrl: "",
  primaryColor: "#F97316",
  fontFamily: "display",
  themeMode: "dark",
  deliveryFee: 0,
  menuSlug: "",
  openingTime: "",
  closingTime: "",
  openingDays: "",
  operatingDaysList: [],
  deliveryTime: "",
  autoStatusByTime: false,
  isStoreOpenManual: false
};

export const BLANK_ANALYTICS: SalesAnalytics = {
  dailyRevenue: 0,
  weeklyRevenue: 0,
  monthlyRevenue: 0,
  totalOrders: 0,
  ticketAverage: 0,
  activeCustomers: 0,
  repurchaseRate: 0,
  sushiTypeDistribution: [],
  revenueHistory: [],
  ordersHistory: [],
  paymentDistribution: []
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: "Sushi Bronze (Essencial)",
    price: 69.90,
    features: [
      "Cardápio Digital para Sushi e Delivery",
      "Recebimento de Pedidos ilimitados",
      "Até 50 Pratos cadastrados",
      "QR Code de mesa gratuito",
      "Suporte básico via e-mail"
    ]
  },
  {
    id: 'pro',
    name: "Sushi Prata (Automação)",
    price: 149.90,
    features: [
      "Tudo do Essencial",
      "Integração automática com WhatsApp",
      "Controle de status do pedido em tempo real",
      "Cupom de descontos ilimitados",
      "Programa de Fidelidade por Pontos",
      "Suporte prioritário via chat"
    ]
  },
  {
    id: 'premium',
    name: "Sushi Ouro (Inteligência)",
    price: 249.90,
    features: [
      "Tudo do Automação",
      "IA para Redação de Pratos Japoneses",
      "IA para Sugestão de Combos e Descontos",
      "IA para Análise de Vendas e Faturamento",
      "Acesso completo ao Painel Financeiro",
      "Gerente de conta exclusivo",
      "Domínio próprio personalizado"
    ]
  }
];
