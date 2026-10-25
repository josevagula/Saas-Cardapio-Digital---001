// Conteúdo da área "Vídeos Tutoriais" (estilo área de membros).
// Para trocar um vídeo: `videoUrl` aceita link do YouTube
// (youtube.com/watch?v=..., youtu.be/...) ou um arquivo .mp4 direto.
// `thumbnail` é opcional — vídeos do YouTube usam a capa do próprio vídeo.
// Os vídeos abaixo são apenas EXEMPLOS para visualizar o layout.

export interface TutorialLesson {
  id: string;
  title: string;
  description: string;
  duration: string; // ex: "4:32"
  videoUrl: string;
  thumbnail?: string;
}

export interface TutorialModule {
  id: string;
  title: string;
  subtitle: string;
  // Cores do degradê da capa do módulo
  coverFrom: string;
  coverTo: string;
  emoji: string;
  lessons: TutorialLesson[];
}

const SAMPLE = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample';

export const TUTORIAL_MODULES: TutorialModule[] = [
  {
    id: 'primeiros-passos',
    title: 'Primeiros Passos',
    subtitle: 'Configure seu delivery em minutos',
    coverFrom: '#C2410C',
    coverTo: '#F97316',
    emoji: '🚀',
    lessons: [
      { id: 'pp-1', title: 'Boas-vindas ao Zushy', description: 'Um tour rápido pelo painel e tudo o que você pode fazer com ele.', duration: '9:56', videoUrl: `${SAMPLE}/BigBuckBunny.mp4`, thumbnail: `${SAMPLE}/images/BigBuckBunny.jpg` },
      { id: 'pp-2', title: 'Configurando os dados do restaurante', description: 'Nome, telefone, endereço, horário de funcionamento e taxa de entrega.', duration: '10:53', videoUrl: `${SAMPLE}/ElephantsDream.mp4`, thumbnail: `${SAMPLE}/images/ElephantsDream.jpg` },
      { id: 'pp-3', title: 'Personalizando o visual do cardápio', description: 'Logo, banner, cores e estilo das categorias.', duration: '0:15', videoUrl: `${SAMPLE}/ForBiggerBlazes.mp4`, thumbnail: `${SAMPLE}/images/ForBiggerBlazes.jpg` }
    ]
  },
  {
    id: 'cardapio',
    title: 'Montando o Cardápio',
    subtitle: 'Categorias, produtos e adicionais',
    coverFrom: '#9A3412',
    coverTo: '#EA580C',
    emoji: '🍣',
    lessons: [
      { id: 'ca-1', title: 'Criando categorias', description: 'Organize seu cardápio em categorias e defina a ordem de exibição.', duration: '0:15', videoUrl: `${SAMPLE}/ForBiggerEscapes.mp4`, thumbnail: `${SAMPLE}/images/ForBiggerEscapes.jpg` },
      { id: 'ca-2', title: 'Cadastrando produtos com foto', description: 'Nome, descrição, preço, promoção e imagem dos seus pratos.', duration: '0:15', videoUrl: `${SAMPLE}/ForBiggerFun.mp4`, thumbnail: `${SAMPLE}/images/ForBiggerFun.jpg` },
      { id: 'ca-3', title: 'Oferta no carrinho', description: 'Aumente o ticket médio com a oferta especial no carrinho.', duration: '0:15', videoUrl: `${SAMPLE}/ForBiggerJoyrides.mp4`, thumbnail: `${SAMPLE}/images/ForBiggerJoyrides.jpg` },
      { id: 'ca-4', title: 'Lixeira de produtos', description: 'Como recuperar ou excluir de vez um produto removido.', duration: '0:15', videoUrl: `${SAMPLE}/ForBiggerMeltdowns.mp4`, thumbnail: `${SAMPLE}/images/ForBiggerMeltdowns.jpg` }
    ]
  },
  {
    id: 'pedidos',
    title: 'Gestão de Pedidos',
    subtitle: 'Do recebimento à entrega',
    coverFrom: '#7C2D12',
    coverTo: '#DC2626',
    emoji: '🛵',
    lessons: [
      { id: 'pe-1', title: 'Recebendo e aceitando pedidos', description: 'Fluxo dos status: em preparação, saiu para entrega e entregue.', duration: '14:48', videoUrl: `${SAMPLE}/Sintel.mp4`, thumbnail: `${SAMPLE}/images/Sintel.jpg` },
      { id: 'pe-2', title: 'Mensagens automáticas no WhatsApp', description: 'Como editar e enviar as mensagens de atualização para o cliente.', duration: '0:15', videoUrl: `${SAMPLE}/ForBiggerBlazes.mp4`, thumbnail: `${SAMPLE}/images/ForBiggerBlazes.jpg` },
      { id: 'pe-3', title: 'Impressão automática de pedidos', description: 'Conectando a impressora Bluetooth e configurando as vias.', duration: '12:14', videoUrl: `${SAMPLE}/TearsOfSteel.mp4`, thumbnail: `${SAMPLE}/images/TearsOfSteel.jpg` }
    ]
  },
  {
    id: 'vendas',
    title: 'Vender Mais',
    subtitle: 'Fidelidade, cupons e análises',
    coverFrom: '#B45309',
    coverTo: '#F59E0B',
    emoji: '📈',
    lessons: [
      { id: 've-1', title: 'Clube de fidelidade', description: 'Configure pontos e prêmios para fazer o cliente voltar.', duration: '0:15', videoUrl: `${SAMPLE}/ForBiggerEscapes.mp4`, thumbnail: `${SAMPLE}/images/ForBiggerEscapes.jpg` },
      { id: 've-2', title: 'Criando cupons de desconto', description: 'Desconto fixo, percentual e frete grátis.', duration: '0:15', videoUrl: `${SAMPLE}/ForBiggerFun.mp4`, thumbnail: `${SAMPLE}/images/ForBiggerFun.jpg` },
      { id: 've-3', title: 'Lendo o Dashboard e o Analytics', description: 'Entenda faturamento, ticket médio e produtos mais vendidos.', duration: '9:56', videoUrl: `${SAMPLE}/BigBuckBunny.mp4`, thumbnail: `${SAMPLE}/images/BigBuckBunny.jpg` }
    ]
  }
];
