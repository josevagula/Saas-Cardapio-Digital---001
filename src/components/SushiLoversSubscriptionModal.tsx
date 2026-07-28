import React, { useState } from 'react';
import { X, Check, Sparkles, Crown, ShieldCheck, HeartHandshake } from 'lucide-react';

interface SushiLoversSubscriptionModalProps {
  onClose: () => void;
  onSubscribe: () => void;
  isSubscribed?: boolean;
}

export default function SushiLoversSubscriptionModal({ onClose, onSubscribe, isSubscribed = false }: SushiLoversSubscriptionModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleConfirmSubscription = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      onSubscribe();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-[#141210] border border-[#2A211A] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100 flex flex-col relative">
        
        {/* Header */}
        <div className="p-6 text-center bg-gradient-to-b from-[#1F1209] to-[#141210] border-b border-[#2A211A] relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#241F1A] text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#C2410C] via-[#EA580C] to-[#F97316] text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-500/20">
            <Crown className="w-7 h-7" />
          </div>

          <span className="inline-flex items-center gap-1 bg-[#F97316]/20 text-[#FB923C] border border-[#F97316]/30 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3 text-[#F97316]" />
            Plano Recorrente VIP
          </span>

          <h2 className="text-xl font-black text-[#F5F0EA] font-display">Clube Sushi Lovers 🍣</h2>
          <p className="text-xs text-[#A8A29A] mt-1">
            Sua dose semanal de sushi premium com benefícios astronômicos e frete grátis ilimitado.
          </p>
        </div>

        {/* Plan Body */}
        <div className="p-6 space-y-4">
          <div className="bg-[#0C0A08] p-4 rounded-xl border border-[#2A211A] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#A8A29A] font-mono uppercase font-bold block">Assinatura Mensal</span>
              <span className="text-2xl font-black text-[#F97316] font-mono">R$ 29,90 <span className="text-xs text-slate-400 font-normal">/mês</span></span>
            </div>
            <span className="text-[11px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold">
              Cancele quando quiser
            </span>
          </div>

          {/* Benefits list */}
          <div className="space-y-2.5 pt-1">
            {[
              "🚀 Frete Grátis Ilimitado em TODOS os seus pedidos no app",
              "💎 15% de Cashback acumulado direto na sua carteira de pontos",
              "🎁 1 Temaki Salmão Completo GRÁTIS no seu mês de aniversário",
              "⚡ Acesso antecipado a combos novos e cupons secretos de 20%",
              "👑 Tag de Assinante VIP no WhatsApp com atendimento prioritário"
            ].map((benefit, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-200">
                <div className="w-5 h-5 rounded-full bg-[#1F1209] text-[#FB923C] border border-[#4A2A10] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-[#F97316]" />
                </div>
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2 font-bold animate-fade-in">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span>Assinatura ativada com sucesso! Você já é membro do Clube Sushi Lovers.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#2A211A] bg-[#1A1613]">
          {isSubscribed || success ? (
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Você já é Assinante VIP! (Fechar)</span>
            </button>
          ) : (
            <button
              disabled={loading}
              onClick={handleConfirmSubscription}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C2410C] via-[#EA580C] to-[#F97316] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:opacity-90 transition-all cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Crown className="w-4 h-4 text-amber-300" />
                  <span>Quero Fazer Parte do Clube Sushi Lovers</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
