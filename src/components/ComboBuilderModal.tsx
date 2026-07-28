import React, { useState } from 'react';
import { Product, SelectedComboPiece } from '../types';
import { safeNumber, formatCurrency } from '../utils/formatters';
import { X, Plus, Minus, Check, Sparkles } from 'lucide-react';

interface ComboBuilderModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, comboFlavors: SelectedComboPiece[], notes: string) => void;
}

const AVAILABLE_FLAVORS = [
  { id: 'fl-1', name: 'Uramaki Philadelphia (Salmão & Cream Cheese)', category: 'Uramaki', step: 5, icon: '🍣' },
  { id: 'fl-2', name: 'Hot Roll Harumaki Crocante c/ Tarê', category: 'Hot Roll', step: 5, icon: '🔥' },
  { id: 'fl-3', name: 'Sashimi Salmão Fresco', category: 'Sashimi', step: 5, icon: '🥢' },
  { id: 'fl-4', name: 'Uramaki Califórnia (Kani, Pepino, Manga)', category: 'Uramaki', step: 5, icon: '🥑' },
  { id: 'fl-5', name: 'Hossomaki Salmão Tradicional', category: 'Hossomaki', step: 5, icon: '🍙' },
  { id: 'fl-6', name: 'Nigiri Salmão Maçaricado c/ Tarê', category: 'Nigiri', step: 5, icon: '🍢' },
  { id: 'fl-7', name: 'Uramaki Skin Crocante c/ Gergelim', category: 'Uramaki', step: 5, icon: '🌾' },
  { id: 'fl-8', name: 'Hossomaki Kani Kama', category: 'Hossomaki', step: 5, icon: '🦀' },
];

export default function ComboBuilderModal({ product, onClose, onAddToCart }: ComboBuilderModalProps) {
  const targetPieces = product.totalPieces || 30;
  const [selections, setSelections] = useState<{ [flavorName: string]: number }>({});
  const [notes, setNotes] = useState('');

  const currentTotal: number = (Object.values(selections) as number[]).reduce((acc: number, val: number) => acc + val, 0);
  const remainingPieces = targetPieces - currentTotal;
  const isComplete = currentTotal === targetPieces;

  const handleAddFlavor = (flavorName: string, step = 5) => {
    if (currentTotal + step > targetPieces) return;
    setSelections(prev => ({
      ...prev,
      [flavorName]: (prev[flavorName] || 0) + step
    }));
  };

  const handleRemoveFlavor = (flavorName: string, step = 5) => {
    setSelections(prev => {
      const current = prev[flavorName] || 0;
      if (current <= step) {
        const copy = { ...prev };
        delete copy[flavorName];
        return copy;
      }
      return { ...prev, [flavorName]: current - step };
    });
  };

  const handleConfirm = () => {
    if (!isComplete) return;
    const comboPieces: SelectedComboPiece[] = Object.entries(selections).map(([flavorName, pieces]) => ({
      flavorName,
      pieces: Number(pieces)
    }));
    onAddToCart(product, comboPieces, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-[#141210] border border-[#2A211A] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-5 border-b border-[#2A211A] flex items-center justify-between bg-[#1A1613]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#C2410C] to-[#F97316] flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-[#F97316]/20 text-[#FB923C] border border-[#F97316]/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Montador Inteligente
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {targetPieces} peças
                </span>
              </div>
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

        {/* Live Pieces Progress Bar */}
        <div className="bg-[#0C0A08] px-5 py-3 border-b border-[#2A211A]">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-[#A8A29A] flex items-center gap-1.5">
              <span>Status da Seleção:</span>
              <strong className="text-[#F5F0EA] font-mono">{currentTotal} / {targetPieces} peças</strong>
            </span>
            <span className={`font-mono text-xs px-2 py-0.5 rounded-md ${
              isComplete 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                : 'bg-[#F97316]/20 text-[#FB923C] border border-[#F97316]/30 animate-pulse'
            }`}>
              {isComplete ? '✓ Combo Completo!' : `Faltam ${remainingPieces} peças`}
            </span>
          </div>
          <div className="w-full bg-[#1F1914] h-2.5 rounded-full overflow-hidden p-0.5 border border-[#2A211A]">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                isComplete ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-[#C2410C] to-[#F97316]'
              }`}
              style={{ width: `${Math.min(100, (currentTotal / targetPieces) * 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Flavors Selector Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <p className="text-xs text-[#A8A29A] font-medium">
            Escolha as porções de 5 em 5 peças até atingir o limite de <strong className="text-[#F5F0EA]">{targetPieces} peças</strong>:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {AVAILABLE_FLAVORS.map(flavor => {
              const qty = selections[flavor.name] || 0;
              const canAdd = !isComplete && (currentTotal + flavor.step <= targetPieces);

              return (
                <div 
                  key={flavor.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                    qty > 0 
                      ? 'bg-[#1F1209] border-[#F97316]/60 shadow-sm' 
                      : 'bg-[#181512] border-[#2A211A] hover:border-[#3D3126]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="text-lg shrink-0">{flavor.icon}</span>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[#F5F0EA] truncate">{flavor.name}</h4>
                      <span className="text-[10px] text-[#A8A29A] font-mono">Porção de {flavor.step} pçs</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 bg-[#0C0A08] p-1 rounded-lg border border-[#2A211A]">
                    <button
                      type="button"
                      disabled={qty === 0}
                      onClick={() => handleRemoveFlavor(flavor.name, flavor.step)}
                      className="w-6 h-6 rounded-md bg-[#1F1914] text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-mono font-bold text-[#FB923C]">
                      {qty}
                    </span>
                    <button
                      type="button"
                      disabled={!canAdd}
                      onClick={() => handleAddFlavor(flavor.name, flavor.step)}
                      className="w-6 h-6 rounded-md bg-[#F97316] text-white hover:bg-[#EA580C] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Special Notes */}
          <div className="pt-3 border-t border-[#2A211A]">
            <label className="block text-xs font-bold text-[#A8A29A] mb-1">
              Observações do Combo (Ex: Sem cream cheese em um item, wasabi à parte):
            </label>
            <input 
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: sem gergelim no uramaki..."
              className="w-full bg-[#0C0A08] border border-[#2A211A] rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#F97316]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2A211A] bg-[#1A1613] flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-[#A8A29A] font-mono uppercase block">Valor Total do Combo</span>
            <span className="text-lg font-black text-[#F97316] font-mono">
              R$ {formatCurrency(product.promoPrice || product.price)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#2A211A] text-xs font-bold text-[#A8A29A] hover:text-white transition-all"
            >
              Cancelar
            </button>
            <button
              disabled={!isComplete}
              onClick={handleConfirm}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all shadow-md ${
                isComplete 
                  ? 'bg-gradient-to-r from-[#C2410C] to-[#F97316] hover:opacity-90 cursor-pointer shadow-orange-500/20' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isComplete ? 'Adicionar ao Carrinho' : `Faltam ${remainingPieces} pçs`}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
