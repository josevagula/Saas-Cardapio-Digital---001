import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { SushiLogoEmblem } from './SushiIcons';
import { 
  Sparkles, 
  Check, 
  MessageSquare, 
  ArrowRight, 
  ChevronRight
} from 'lucide-react';

export default function LandingPages() {
  const { setLoggedIn, setIsAdmin, setCurrentView, setPublicView } = useApp();

  const handleEnterDemo = () => {
    sessionStorage.setItem('just_entered_from_plans', 'true');
    setLoggedIn(true);
    setIsAdmin(true);
    setCurrentView('dashboard');
  };

  const handleGoToLogin = () => setPublicView('login');
  const handleGoToTrial = () => setPublicView('trial');

  const plans = [
    {
      name: 'Plano Profissional',
      desc: 'Ideal para temakerias, restaurantes japoneses e deliveries de sushi.',
      priceMonthly: 129,
      features: [
        'Cardápio Customizável (Branding)',
        'Produtos Ilimitados',
        'Painel Operacional Avançado (Kanban)',
        'Cupons de Desconto Dinâmicos',
        'Estúdio IA (Redação de Pratos)',
        'Relatórios de Faturamento',
        'Suporte WhatsApp 24h'
      ],
      cta: 'Experimente 7 dias Grátis',
      popular: true
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#0C0A08] font-sans text-slate-100 overflow-x-hidden" id="sushi-landing-page">
      {/* Header / Navbar Marketing */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="bg-[#0C0A08]/90 border-b border-[#2A211A] sticky top-0 z-50 backdrop-blur-md"
      >
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          {/* Logo Left */}
          <div className="flex items-center gap-2.5">
            <SushiLogoEmblem size={34} />
            <span className="font-display font-extrabold text-[#F5F0EA] tracking-tight text-lg">
              Ponto<span className="text-[#FB923C]">Sushi</span>
            </span>
          </div>

          {/* Central Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#A8A29A]">
            <a href="#recursos" className="hover:text-[#FB923C] transition-colors">Recursos</a>
            <a href="#precos" className="hover:text-[#FB923C] transition-colors">Preços</a>
          </nav>

          {/* CTA Right */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleGoToLogin}
              className="px-5 py-2.5 btn-sushi-primary text-white text-xs font-bold flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform"
            >
              <span>Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-sushi-hero pt-16 pb-20 lg:pt-24 lg:pb-28 border-b border-[#2A211A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Text & CTA - Slide from Left */}
            <motion.div 
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="lg:col-span-6 space-y-6 text-left"
            >
              <div className="inline-flex items-center gap-2 badge-sushi px-3.5 py-1.5 rounded-full text-xs font-bold shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#FB923C]" />
                <span>Engenharia de Cardápio com Inteligência Artificial</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-[#F5F0EA] tracking-tight leading-[1.1]">
                Aumente suas vendas de sushi com um cardápio <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F97316] to-[#FB923C]">exclusivo</span>
              </h1>

              <p className="text-base text-[#A8A29A] leading-relaxed font-normal max-w-xl">
                Exemplo de site de cardapio digital
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleGoToTrial}
                  className="px-6 py-3.5 btn-sushi-primary text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:scale-105 transition-transform"
                >
                  <span>Experimente 7 dias Grátis</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={handleEnterDemo}
                  className="px-6 py-3.5 border border-[#2A211A] text-[#F5F0EA] text-xs font-bold flex items-center justify-center gap-2 rounded-lg hover:border-[#FB923C] transition-colors cursor-pointer"
                >
                  <span>Demonstração</span>
                </button>
              </div>
            </motion.div>

            {/* Right Column: Interactive SaaS Dashboard Mockup - Slide from Right */}
            <motion.div 
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="lg:col-span-6 relative"
            >
              <div className="bg-[#141210] p-2.5 rounded-2xl border border-[#2A211A] shadow-2xl relative overflow-hidden">
                {/* Mockup Window Top Bar */}
                <div className="bg-[#181512] px-4 py-2.5 rounded-xl border border-[#2A211A] flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500/80"></span>
                    <span className="text-[10px] font-mono text-[#A8A29A] ml-2">app.pontosushi.com/dashboard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold bg-[#1F1209] text-[#FB923C] px-2 py-0.5 rounded-full border border-[#4A2A10]">
                      ON-LINE
                    </span>
                  </div>
                </div>

                {/* Dashboard Inner Body Mockup */}
                <div className="bg-[#0C0A08] p-5 rounded-xl border border-[#2A211A] space-y-4">
                  {/* KPI Row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#141210] p-3 rounded-xl border border-[#2A211A]">
                      <span className="text-[9px] font-mono uppercase text-[#A8A29A] font-bold">Faturamento Hoje</span>
                      <p className="text-sm font-extrabold font-display text-[#F5F0EA] mt-0.5">R$ 2.480,00</p>
                      <span className="text-[9px] text-[#F97316] font-bold">+18.4% vs ontem</span>
                    </div>
                    <div className="bg-[#141210] p-3 rounded-xl border border-[#2A211A]">
                      <span className="text-[9px] font-mono uppercase text-[#A8A29A] font-bold">Pedidos Ativos</span>
                      <p className="text-sm font-extrabold font-display text-[#FB923C] mt-0.5">14 em preparo</p>
                      <span className="text-[9px] text-[#A8A29A] font-medium">Tempo méd. 18 min</span>
                    </div>
                    <div className="bg-[#141210] p-3 rounded-xl border border-[#2A211A]">
                      <span className="text-[9px] font-mono uppercase text-[#A8A29A] font-bold">Ticket Médio</span>
                      <p className="text-sm font-extrabold font-display text-[#F5F0EA] mt-0.5">R$ 68,50</p>
                      <span className="text-[9px] text-[#FB923C] font-bold">IA Otimizado</span>
                    </div>
                  </div>

                  {/* Chart Mockup Bar */}
                  <div className="bg-[#141210] p-4 rounded-xl border border-[#2A211A] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">Evolução do Faturamento Semanal</span>
                      <span className="text-[10px] font-mono text-[#FB923C] font-bold">+28% do esperado</span>
                    </div>
                    <div className="h-20 flex items-end justify-between gap-2 pt-2 px-1">
                      {[40, 65, 55, 80, 95, 85, 100].map((h, i) => (
                        <div key={i} className="flex-1 bg-[#2A211A] rounded-t-lg relative group overflow-hidden" style={{ height: `${h}%` }}>
                          <div className="absolute inset-0 bg-gradient-to-t from-[#C2410C] to-[#F97316] rounded-t-lg transition-all" style={{ height: i >= 4 ? '100%' : '70%' }}></div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-[#A8A29A] pt-1">
                      <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
                    </div>
                  </div>

                  {/* Live Order Card */}
                  <div className="bg-[#1F1209] p-3 rounded-xl border border-[#4A2A10] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#C2410C] to-[#F97316] text-white flex items-center justify-center font-bold text-xs">
                        #42
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-[#F5F0EA]">Combo Sashimi Premium + Coca 2L</h5>
                        <p className="text-[10px] text-[#A8A29A]">Cliente: Marcos Silva • Entrega Via WhatsApp</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-[#F97316] text-white px-2.5 py-1 rounded-lg">
                      Em Cozinha
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Product Highlights Grid - Recursos Premium with Scroll Animations */}
      <section className="max-w-6xl mx-auto px-6 py-20 overflow-hidden" id="recursos">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center space-y-3 mb-14"
        >
          <span className="text-xs font-mono uppercase tracking-widest text-[#FB923C] font-bold">RECURSOS PREMIUM</span>
          <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-[#F5F0EA] tracking-tight">Tudo o que seu negócio precisa para crescer</h2>
          <p className="text-sm text-[#A8A29A] max-w-lg mx-auto">Ferramentas desenhadas com foco em conversão e velocidade de atendimento.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1 - Slides in smoothly from the LEFT */}
          <motion.div 
            initial={{ opacity: 0, x: -80 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="bg-[#141210] p-8 rounded-2xl border border-[#2A211A] hover:border-[#C2410C]/50 transition-all space-y-4 hover:shadow-xl hover:shadow-orange-950/20 group"
          >
            <div className="w-12 h-12 bg-[#1F1209] text-[#FB923C] rounded-xl flex items-center justify-center border border-[#4A2A10] group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-[#F5F0EA] text-xl">Copywriter IA Integrado</h3>
            <p className="text-xs sm:text-sm text-[#A8A29A] leading-relaxed">
              Crie descrições altamente persuasivas para seus pratos e combos de sushi. A inteligência artificial estuda seus ingredientes e gera textos atraentes instantaneamente.
            </p>
          </motion.div>

          {/* Card 2 - Slides in smoothly from the RIGHT */}
          <motion.div 
            initial={{ opacity: 0, x: 80 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="bg-[#141210] p-8 rounded-2xl border border-[#2A211A] hover:border-[#C2410C]/50 transition-all space-y-4 hover:shadow-xl hover:shadow-orange-950/20 group"
          >
            <div className="w-12 h-12 bg-[#1F1209] text-[#FB923C] rounded-xl flex items-center justify-center border border-[#4A2A10] group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-[#F5F0EA] text-xl">Notificação Automática WhatsApp</h3>
            <p className="text-xs sm:text-sm text-[#A8A29A] leading-relaxed">
              Notifique seus clientes a cada mudança de status do pedido direto no WhatsApp, reduzindo chamados e garantindo a melhor experiência.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Plans Section with Scroll Animations */}
      <section className="bg-[#141210] border-y border-[#2A211A] py-24 overflow-hidden" id="precos">
        <div className="max-w-6xl mx-auto px-6 space-y-14">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-center space-y-3"
          >
            <span className="text-xs font-mono uppercase tracking-widest text-[#FB923C] font-bold">PLANOS E PREÇOS</span>
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-[#F5F0EA] tracking-tight">Investimento transparente e sem surpresas</h2>
          </motion.div>

          <div className="grid grid-cols-1 max-w-md mx-auto gap-8 items-stretch">
            {plans.map((p, idx) => {
              return (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, y: 50, scale: 0.92 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.7, delay: 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
                  className="bg-[#141210] p-8 sm:p-10 rounded-2xl border border-[#F97316] ring-1 ring-[#F97316]/40 shadow-2xl shadow-orange-950/50 flex flex-col justify-between relative transition-all"
                >
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xl font-display font-bold text-[#F5F0EA]">{p.name}</h4>
                      <p className="text-xs text-[#A8A29A] mt-1.5 leading-relaxed">{p.desc}</p>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-[#A8A29A] font-semibold">R$</span>
                      <span className="text-4xl sm:text-5xl font-display font-extrabold text-[#F5F0EA] tracking-tight">{p.priceMonthly}</span>
                      <span className="text-xs text-[#A8A29A]">/mês</span>
                    </div>

                    {/* Features list */}
                    <div className="space-y-3.5 border-t border-[#2A211A] pt-6">
                      {p.features.map((feat, fIdx) => (
                        <motion.div 
                          key={fIdx} 
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.4, delay: 0.2 + (fIdx * 0.08) }}
                          className="flex gap-2.5 text-xs sm:text-sm items-start"
                        >
                          <Check className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
                          <span className="text-slate-300 font-medium">{feat}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleGoToTrial}
                    className="mt-8 w-full py-3.5 text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer btn-sushi-primary text-white hover:scale-[1.02]"
                  >
                    {p.cta}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

