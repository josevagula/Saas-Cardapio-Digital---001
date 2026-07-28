import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SushiLogoEmblem } from './SushiIcons';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  Sparkles, 
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Check,
  Building2,
  TrendingUp,
  Zap
} from 'lucide-react';

export default function AuthPages() {
  const { setLoggedIn, setIsAdmin, setCurrentView } = useApp();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restName, setRestName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoggedIn(true);
    setIsAdmin(true);
    setCurrentView('dashboard');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0C0A08] flex flex-col lg:grid lg:grid-cols-12 min-h-screen font-sans text-slate-100" id="luvia-auth-pages">
      {/* Brand logo bar on mobile only */}
      <div className="lg:hidden p-6 flex justify-between items-center bg-[#141210] border-b border-[#2A211A]">
        <div className="flex items-center gap-2.5">
          <SushiLogoEmblem size={32} />
          <span className="font-display font-extrabold text-white tracking-tight text-sm">
            Ponto<span className="text-[#FB923C]">.japa</span>
          </span>
        </div>
      </div>

      {/* Left side Form Column */}
      <div className="lg:col-span-5 bg-[#141210] flex flex-col justify-center p-8 md:p-12 min-h-[calc(100vh-68px)] lg:min-h-screen border-r border-[#2A211A]">
        <div className="max-w-md w-full mx-auto space-y-6">
          <div className="hidden lg:flex items-center gap-2.5 mb-10">
            <SushiLogoEmblem size={34} />
            <span className="font-display font-extrabold text-white tracking-tight text-lg">
              Ponto<span className="text-[#FB923C]">.japa</span>
            </span>
          </div>

          <div>
            <span className="text-[11px] font-mono font-bold text-[#FB923C] uppercase tracking-wider block mb-1">
              {authMode === 'login' ? 'Bem-vindo de volta' : 'Crie seu cardápio hoje'}
            </span>
            <h2 className="text-2xl font-display font-extrabold text-[#F5F0EA] tracking-tight">
              {authMode === 'login' ? 'Acessar minha conta' : 'Criar minha conta Luvia'}
            </h2>
            <p className="text-xs text-[#A8A29A] mt-1">
              {authMode === 'login' ? 'Digite suas credenciais abaixo para carregar seu delivery.' : 'Inicie seu período de teste grátis de 7 dias sem compromisso.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-slate-300 block mb-1.5">Nome do Restaurante*</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Tokio Sushi Premium"
                  value={restName}
                  onChange={(e) => setRestName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs input-sushi focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] font-mono font-bold uppercase text-slate-300 block mb-1.5">E-mail Corporativo*</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#A8A29A] absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="seu.email@restaurante.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs input-sushi focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono font-bold uppercase text-slate-300 block mb-1.5">Senha de Acesso*</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#A8A29A] absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="Sua senha secreta"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs input-sushi focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full btn-sushi-primary text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <span>{authMode === 'login' ? 'Entrar no Painel' : 'Iniciar Teste Grátis'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>

          {/* Social login mock separator */}
          <div className="relative py-2 text-center text-[10px] text-[#A8A29A] uppercase font-mono">
            <span className="bg-[#141210] px-3 relative z-10 font-bold">Ou faça login com</span>
            <div className="absolute left-0 right-0 top-1/2 h-px bg-[#2A211A]"></div>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full border border-[#2A211A] bg-[#181512] hover:bg-[#2A211A] text-slate-200 font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Acessar com Google Workspace SSO</span>
          </button>

          <div className="pt-2 text-center">
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-xs text-[#FB923C] hover:text-[#F97316] font-bold cursor-pointer hover:underline"
            >
              {authMode === 'login' ? 'Não tem conta? Cadastre seu estabelecimento!' : 'Já tem uma conta cadastrada? Faça login'}
            </button>
          </div>
        </div>
      </div>

      {/* Right side Light SaaS Pitch Column */}
      <div className="hidden lg:col-span-7 bg-[#0C0A08] text-slate-100 p-12 lg:flex flex-col justify-between">
        <div className="inline-flex items-center gap-2 bg-[#1F1209] text-[#FB923C] px-3.5 py-1.5 rounded-full text-xs font-mono font-bold border border-[#4A2A10] self-start shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#FB923C]" />
          <span>Luvia AI Studio SaaS Engine</span>
        </div>

        <div className="space-y-6 max-w-lg">
          <h3 className="text-3xl font-display font-extrabold text-[#F5F0EA] tracking-tight leading-tight">
            Gestão sem atrito, vendas turbinadas.
          </h3>
          <p className="text-xs sm:text-sm text-[#A8A29A] leading-relaxed">
            Tenha em mãos as ferramentas que os maiores aplicativos de delivery usam para aumentar o faturamento. Controle estoque de produtos, altere preços instantaneamente, crie cupons e tenha suporte de nossa inteligência artificial para cópias e engenharia de combos.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 text-xs font-semibold">
            <div className="flex items-center gap-2 text-slate-200 bg-[#141210] p-3 rounded-xl border border-[#2A211A] shadow-xs">
              <Check className="w-4 h-4 text-[#FB923C] shrink-0" />
              <span>Checkout Pix Seguro</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200 bg-[#141210] p-3 rounded-xl border border-[#2A211A] shadow-xs">
              <Check className="w-4 h-4 text-[#FB923C] shrink-0" />
              <span>Envio para WhatsApp</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200 bg-[#141210] p-3 rounded-xl border border-[#2A211A] shadow-xs">
              <Check className="w-4 h-4 text-[#FB923C] shrink-0" />
              <span>SaaS Multi-tenant</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200 bg-[#141210] p-3 rounded-xl border border-[#2A211A] shadow-xs">
              <Check className="w-4 h-4 text-[#FB923C] shrink-0" />
              <span>Lighthouse Score 100</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-[#A8A29A] font-mono">
          <ShieldCheck className="w-4 h-4 text-[#FB923C]" />
          <span>Segurança em conformidade com a LGPD</span>
        </div>
      </div>
    </div>
  );
}
