import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  TrendingUp,
  Sparkles,
  Palette,
  LogOut,
  Globe,
  Copy,
  ExternalLink,
  X,
  ShieldAlert
} from 'lucide-react';
import { HashiIcon, SushiRollIcon, SushiLogoEmblem, WasabiTag } from './SushiIcons';

interface SidebarProps {
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ isMobile, onCloseMobile }: SidebarProps = {}) {
  const { currentView, setCurrentView, visualConfig, currentPlan, planStatus, cancelPlan, setIsAdmin, setLoggedIn } = useApp();
  const [copied, setCopied] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Pedidos', icon: HashiIcon, badge: 'Ao Vivo' },
    { id: 'menu_manager', label: 'Cardápio', icon: SushiRollIcon },
    { id: 'customers', label: 'Clientes & Fidelidade', icon: Users },
    { id: 'financial', label: 'Financeiro & Cupons', icon: TrendingUp },
    { id: 'customizer', label: 'Personalização', icon: Palette },
    { id: 'ai_assistant', label: 'Luvia AI Studio', icon: Sparkles, highlight: true },
  ];

  const activeSlug = visualConfig.menuSlug || 'luvia-sushi';

  const handleNavClick = (viewId: string) => {
    setCurrentView(viewId);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside 
      className={`${
        isMobile 
          ? 'w-64 bg-[#141210] text-slate-100 flex flex-col h-full font-sans border-r border-[#2A211A]' 
          : 'hidden md:flex w-64 bg-[#141210] text-slate-100 flex-col h-screen shrink-0 font-sans border-r border-[#2A211A]'
      }`} 
      id="luvia-admin-sidebar"
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-[#2A211A] flex items-center justify-between bg-sushi-texture">
        <div className="flex items-center gap-3">
          <SushiLogoEmblem size={34} />
          <div>
            <h1 className="font-display font-extrabold text-[#F5F0EA] tracking-tight text-base sm:text-lg leading-tight">
              {visualConfig.establishmentName || 'Ponto japa'}
            </h1>
          </div>
        </div>

        {isMobile && onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg bg-[#181512] text-[#A8A29A] hover:text-[#F5F0EA] border border-[#2A211A] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 flex items-center justify-between mb-2">
          <p className="text-[10px] font-mono uppercase tracking-wider text-[#A8A29A] font-bold">GERENCIAMENTO</p>
          <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]"></span>
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-xs font-semibold relative group cursor-pointer ${
                isActive 
                  ? 'bg-[#1F1209] text-[#FB923C] border-l-4 border-[#F97316] shadow-sm' 
                  : 'text-[#A8A29A] hover:bg-[#181512] hover:text-[#F5F0EA]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-[#F97316]' : 'text-[#A8A29A] group-hover:text-[#F5F0EA]'
                } ${
                  item.highlight && !isActive ? 'text-[#FB923C]' : ''
                }`} />
                <span>{item.label}</span>
              </div>
              
              {item.badge && !isActive && (
                <span className="text-[9px] font-mono border border-[#4A2A10] text-[#FB923C] bg-[#1F1209] px-1.5 py-0.5 rounded-full font-bold">
                  {item.badge}
                </span>
              )}

              {item.highlight && !isActive && (
                <span className="w-2 h-2 rounded-full bg-[#F97316] absolute right-3 top-3.5 animate-pulse shadow-xs shadow-orange-500"></span>
              )}
            </button>
          );
        })}

        <div className="pt-4 border-t border-[#2A211A] my-3"></div>
        <p className="px-3 text-[10px] font-mono uppercase tracking-wider text-[#A8A29A] mb-2 font-bold">CARDÁPIO PÚBLICO</p>
        
        <div className="space-y-2 px-1">
          <button
            onClick={() => {
              setIsAdmin(false);
              setCurrentView('public_menu');
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#F5F0EA] hover:bg-[#181512] transition-all font-semibold text-left cursor-pointer border border-transparent hover:border-[#2A211A]"
          >
            <Globe className="w-4 h-4 text-[#FB923C]" />
            <span>Visualizar Cardápio</span>
          </button>

          <div className="bg-[#181512] rounded-xl p-3 border border-[#2A211A] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#A8A29A] uppercase tracking-wider">Link do Cardápio</span>
              <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse" title="Servidor Online"></span>
            </div>
            <div className="text-[11px] font-mono bg-[#0C0A08] p-2 rounded-lg border border-[#2A211A] text-[#FB923C] select-all truncate font-bold">
              ?menu={activeSlug}
            </div>
            <div className="flex gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}?menu=${activeSlug}`;
                  navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                  copied 
                    ? 'bg-[#1F1209] text-[#FB923C] border-[#4A2A10]' 
                    : 'bg-[#141210] text-[#A8A29A] border-[#2A211A] hover:border-slate-600 hover:text-[#F5F0EA]'
                }`}
              >
                <Copy className="w-3 h-3 text-[#A8A29A]" />
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
              <a
                href={`${window.location.origin}${window.location.pathname}?menu=${activeSlug}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold bg-gradient-to-r from-[#C2410C] to-[#F97316] text-white hover:opacity-90 transition-all shadow-sm cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Testar</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Footer Profile */}
      <div className="p-4 border-t border-[#2A211A] bg-[#0C0A08] space-y-3">
        <div className="flex items-center gap-3">
          <img 
            src={visualConfig.logoUrl || "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=100"} 
            alt="Logo" 
            className="w-9 h-9 rounded-xl object-cover border border-[#2A211A] shadow-xs"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-[#F5F0EA] truncate">{visualConfig.establishmentName}</h4>
            <p className="text-[11px] text-[#A8A29A] truncate">{visualConfig.phone}</p>
          </div>
        </div>

        <button
          onClick={() => {
            setLoggedIn(false);
            setCurrentView('home');
          }}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs text-[#A8A29A] hover:bg-[#181512] hover:text-[#F5F0EA] transition-all font-semibold border border-[#2A211A] bg-[#141210] shadow-xs cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-[#A8A29A]" />
          <span>Sair da Sessão</span>
        </button>

        {planStatus === 'active' ? (
          <button
            onClick={() => {
              if (window.confirm('Cancelar sua assinatura? O painel e o Cardápio Digital ficarão bloqueados até você renovar o plano.')) {
                cancelPlan();
              }
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] text-[#6B655C] hover:text-red-400 transition-all font-semibold cursor-pointer"
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Cancelar assinatura</span>
          </button>
        ) : (
          <div className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] text-red-400 font-bold">
            <ShieldAlert className="w-3 h-3" />
            <span>Assinatura cancelada</span>
          </div>
        )}
      </div>
    </aside>
  );
}
