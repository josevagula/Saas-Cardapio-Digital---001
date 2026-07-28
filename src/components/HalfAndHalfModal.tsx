import React, { useState } from 'react';
import { Product, SelectedHalfAndHalf } from '../types';
import { safeNumber, formatCurrency } from '../utils/formatters';
import { X, Check, Utensils, Sparkles, AlertCircle } from 'lucide-react';

interface HalfAndHalfModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, halfAndHalf: SelectedHalfAndHalf, notes: string) => void;
}

export default function HalfAndHalfModal({ product, onClose, onAddToCart }: HalfAndHalfModalProps) {
  const availableFlavors = product.halfAndHalfFlavors || [
    'Salmão Completo c/ Cream Cheese',
    'Skin Crocante c/ Tarê',
    'Kani Kama c/ Cebolinha',
    'Camarão Empanado Panko (+ R$ 3,00)',
    'Salmão Grelhado Teriyaki'
  ];

  const [flavor1, setFlavor1] = useState<string>(availableFlavors[0] || '');
  const [flavor2, setFlavor2] = useState<string>(availableFlavors[1] || availableFlavors[0] || '');
  const [notes, setNotes] = useState('');

  const isReady = flavor1.length > 0 && flavor2.length > 0;

  // Additional fee if premium flavor selected
  let extraFee = 0;
  if (flavor1.includes('Camarão') || flavor2.includes('Camarão')) extraFee += 3.00;

  const basePrice = product.promoPrice || product.price;
  const finalPrice = basePrice + extraFee;

  const handleConfirm = () => {
    if (!isReady) return;
    onAddToCart(product, { flavor1, flavor2 }, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-[#141210] border border-[#2A211A] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-100 flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-[#2A211A] flex items-center justify-between bg-[#1A1613]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#C2410C] to-[#F97316] flex items-center justify-center text-white shadow-md">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold bg-[#F97316]/20 text-[#FB923C] border border-[#F97316]/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Sistema Meio a Meio ☯
              </span>
              <h2 className="text-base font-extrabold text-[#F5F0EA] font-display">{product.name}</h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#241F1A] hover:bg-[#2A211A] text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-xs text-[#A8A29A]">
            Escolha os 2 sabores do seu pedido. O valor final é ajustado automaticamente de acordo com as suas escolhas.
          </p>

          {/* Flavor 1 (50%) */}
          <div className="bg-[#181512] p-4 rounded-xl border border-[#2A211A] space-y-2">
            <label className="block text-xs font-bold text-[#FB923C] uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Primeira Metade (50%)</span>
              <span className="text-[10px] text-slate-400 font-normal">Sabor 1</span>
            </label>
            <div className="space-y-1.5">
              {availableFlavors.map(flavor => (
                <button
                  type="button"
                  key={`f1-${flavor}`}
                  onClick={() => setFlavor1(flavor)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between border ${
                    flavor1 === flavor
                      ? 'bg-[#1F1209] text-[#FB923C] border-[#F97316] shadow-xs'
                      : 'bg-[#0C0A08] text-slate-300 border-[#2A211A] hover:border-slate-700'
                  }`}
                >
                  <span>{flavor}</span>
                  {flavor1 === flavor && <Check className="w-3.5 h-3.5 text-[#F97316]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Flavor 2 (50%) */}
          <div className="bg-[#181512] p-4 rounded-xl border border-[#2A211A] space-y-2">
            <label className="block text-xs font-bold text-[#FB923C] uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Segunda Metade (50%)</span>
              <span className="text-[10px] text-slate-400 font-normal">Sabor 2</span>
            </label>
            <div className="space-y-1.5">
              {availableFlavors.map(flavor => (
                <button
                  type="button"
                  key={`f2-${flavor}`}
                  onClick={() => setFlavor2(flavor)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between border ${
                    flavor2 === flavor
                      ? 'bg-[#1F1209] text-[#FB923C] border-[#F97316] shadow-xs'
                      : 'bg-[#0C0A08] text-slate-300 border-[#2A211A] hover:border-slate-700'
                  }`}
                >
                  <span>{flavor}</span>
                  {flavor2 === flavor && <Check className="w-3.5 h-3.5 text-[#F97316]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Summary Box */}
          <div className="bg-[#0C0A08] p-3 rounded-xl border border-[#2A211A] flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#F97316] shrink-0" />
            <div className="text-[11px] text-slate-300">
              <span className="font-bold text-[#F5F0EA]">Sua Combinação: </span>
              <span className="text-[#FB923C] font-semibold">{flavor1}</span> + <span className="text-[#FB923C] font-semibold">{flavor2}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[#A8A29A] mb-1">
              Observações (opcional):
            </label>
            <input 
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: pouco tarê em uma das metades..."
              className="w-full bg-[#0C0A08] border border-[#2A211A] rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#F97316]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2A211A] bg-[#1A1613] flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-[#A8A29A] font-mono uppercase block">Preço Calculado</span>
            <span className="text-lg font-black text-[#F97316] font-mono">
              R$ {formatCurrency(finalPrice)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#2A211A] text-xs font-bold text-[#A8A29A] hover:text-white transition-all"
            >
              Voltar
            </button>
            <button
              onClick={handleConfirm}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#C2410C] to-[#F97316] hover:opacity-90 flex items-center gap-2 transition-all shadow-md shadow-orange-500/20 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar Meio a Meio</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
