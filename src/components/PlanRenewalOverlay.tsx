import React, { useState } from 'react';
import { Lock, RefreshCw, ShieldCheck, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { SushiLogoEmblem } from './SushiIcons';

export default function PlanRenewalOverlay() {
  const { renewPlan, setLoggedIn, setCurrentView } = useApp();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleRenew = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      renewPlan();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-[#141210] border border-[#2A211A] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100 flex flex-col relative">

        <div className="p-6 text-center bg-gradient-to-b from-[#1F1209] to-[#141210] border-b border-[#2A211A]">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#C2410C] via-[#EA580C] to-[#F97316] text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-500/20">
            <Lock className="w-7 h-7" />
          </div>

          <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
            Assinatura Cancelada
          </span>

          <div className="flex items-center justify-center gap-2 mb-1">
            <SushiLogoEmblem size={20} />
            <h2 className="text-lg font-black text-[#F5F0EA] font-display">Seu plano precisa ser renovado</h2>
          </div>
          <p className="text-xs text-[#A8A29A] mt-1">
            O acesso ao painel e ao seu Cardápio Digital fica bloqueado enquanto a assinatura estiver cancelada. Renove agora para liberar tudo de novo.
          </p>
        </div>

        <div className="p-6 space-y-2.5">
          {[
            'Cardápio Digital voltará a ficar visível para seus clientes',
            'Pedidos, financeiro e personalização liberados imediatamente',
            'Sem perda de dados: tudo que você configurou continua salvo'
          ].map((benefit, idx) => (
            <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-200">
              <div className="w-5 h-5 rounded-full bg-[#1F1209] text-[#FB923C] border border-[#4A2A10] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3 h-3 text-[#F97316]" />
              </div>
              <span>{benefit}</span>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-[#2A211A] bg-[#1A1613] space-y-2">
          <button
            disabled={loading}
            onClick={handleRenew}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C2410C] via-[#EA580C] to-[#F97316] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:opacity-90 transition-all cursor-pointer disabled:opacity-70"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Renovar Plano Agora</span>
              </>
            )}
          </button>

          <button
            onClick={async () => {
              await logout();
              setLoggedIn(false);
              setCurrentView('home');
            }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] text-[#A8A29A] hover:text-[#F5F0EA] transition-all font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair da Sessão</span>
          </button>
        </div>

      </div>
    </div>
  );
}
