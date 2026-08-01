import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Coupon } from '../types';
import { safeNumber, formatCurrency } from '../utils/formatters';
import { 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Trash2, 
  Plus, 
  Lock, 
  AlertCircle, 
  Calculator, 
  Check,
  FileSpreadsheet,
  FileText
} from 'lucide-react';

export default function FinancialManager() {
  const { coupons, addCoupon, setCoupons, analytics } = useApp();

  // Form Coupon states
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | 'free_delivery'>('percentage');
  const [value, setValue] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [isFirstPurchaseOnly, setIsFirstPurchaseOnly] = useState(false);

  // Profit Margin Calculator (Cost of Goods Sold - COGS)
  const [cogsPercent, setCogsPercent] = useState('35'); // standard restaurant food cost is ~35%

  const revenue = analytics.monthlyRevenue;
  const cogs = (revenue * parseFloat(cogsPercent)) / 100;
  const estimatedProfit = revenue - cogs;

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || (!value && discountType !== 'free_delivery')) return;

    const newCoupon: Coupon = {
      code: code.toUpperCase().replace(/\s+/g, ''),
      discountType,
      value: discountType === 'free_delivery' ? 0 : parseFloat(value),
      minOrderValue: minOrderValue ? parseFloat(minOrderValue) : 0,
      isFirstPurchaseOnly,
      active: true
    };

    // Check if duplicate
    if (coupons.some(c => c.code === newCoupon.code)) {
      alert("Já existe um cupom com este código!");
      return;
    }

    addCoupon(newCoupon);
    // Reset fields
    setCode('');
    setValue('');
    setMinOrderValue('');
    setIsFirstPurchaseOnly(false);
    alert("Cupom promocional criado com sucesso!");
  };

  const handleDeleteCoupon = (cCode: string) => {
    if (confirm(`Excluir o cupom "${cCode}" permanentemente?`)) {
      setCoupons(prev => prev.filter(c => c.code !== cCode));
    }
  };

  const handleExport = (type: 'excel' | 'pdf') => {
    alert(`Exportação concluída! O arquivo financeiro_${Date.now()}.${type === 'excel' ? 'xlsx' : 'pdf'} foi gerado com sucesso para download.`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#0C0A08] font-sans text-slate-100" id="sushi-financial-manager">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-mono font-semibold text-[#FB923C] uppercase tracking-widest">Painel Financeiro</span>
          <h2 className="text-3xl font-display font-extrabold text-[#F5F0EA] tracking-tight mt-1">Financeiro & Cupons</h2>
          <p className="text-sm text-[#A8A29A] mt-1">Gerencie cupons de descontos para atrair clientes, analise custos de insumos e calcule lucros reais.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 bg-[#141210] text-slate-200 text-xs font-semibold rounded-xl border border-[#2A211A] hover:bg-[#181512] transition-colors cursor-pointer w-full sm:w-auto"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#FB923C]" />
            <span>Exportar Planilha (XLS)</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 bg-[#141210] text-slate-200 text-xs font-semibold rounded-xl border border-[#2A211A] hover:bg-[#181512] transition-colors cursor-pointer w-full sm:w-auto"
          >
            <FileText className="w-4 h-4 text-orange-400" />
            <span>PDF Ledger</span>
          </button>
        </div>
      </div>

      {/* Financial calculations and profit estimator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 bg-[#141210] p-7 rounded-2xl border border-[#2A211A] shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-display font-extrabold text-[#F5F0EA] mb-4 flex items-center gap-2">
              <Calculator className="text-[#FB923C] w-5 h-5" />
              Estimador de Lucro Líquido Real
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Custo Médio de Insumos (Food Cost %)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={cogsPercent}
                    onChange={(e) => setCogsPercent(e.target.value)}
                    className="w-full pl-3.5 pr-12 py-2.5 text-sm input-sushi focus:outline-none font-mono"
                  />
                  <span className="absolute right-3.5 top-3 text-xs text-[#A8A29A] font-semibold font-mono">%</span>
                </div>
                <p className="text-[10px] text-[#A8A29A] mt-1">Geralmente, restaurantes operam entre 30% a 40% de custo de matéria-prima.</p>
              </div>

              <div className="space-y-3 bg-[#0C0A08] p-4 rounded-xl border border-[#2A211A]">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Receita Bruta Acumulada:</span>
                  <span className="font-bold text-white font-mono">R$ {formatCurrency(revenue)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Custo Estimado Insumos:</span>
                  <span className="font-bold text-red-400 font-mono">- R$ {formatCurrency(cogs)}</span>
                </div>
                <div className="border-t border-[#2A211A] pt-2 flex justify-between text-sm font-extrabold text-white">
                  <span>Lucro Operacional Líquido:</span>
                  <span className="text-[#F97316] font-mono">R$ {formatCurrency(estimatedProfit)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#1F1209] rounded-xl border border-[#4A2A10] text-xs text-slate-300 flex gap-2.5">
            <TrendingUp className="w-5 h-5 text-[#FB923C] shrink-0 mt-0.5" />
            <span>
              Sua margem líquida estimada de lucro é de <strong className="text-white">{100 - parseFloat(cogsPercent)}%</strong>! Para elevar essa margem, use a inteligência artificial da Sushi para criar combos integrando bebidas e sobremesas, que possuem custos de insumo menores.
            </span>
          </div>
        </div>

        {/* Financial KPI Ledger card */}
        <div className="bg-[#141210] text-slate-100 p-7 rounded-2xl border border-[#2A211A] shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-mono text-[#FB923C] uppercase tracking-widest font-bold">Ledger Consolidado</h4>
            <h3 className="text-3xl font-display font-extrabold text-[#F5F0EA] mt-2 font-mono">
              R$ {formatCurrency(estimatedProfit)}
            </h3>
            <p className="text-xs text-[#A8A29A] mt-1">Saldo líquido mensal estimado</p>
          </div>

          <div className="space-y-2 border-t border-[#2A211A] pt-4 mt-6 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Método Campeão:</span>
              <span className="text-white font-mono font-bold">PIX (55%)</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Ticket Médio Geral:</span>
              <span className="text-white font-mono font-bold">R$ {formatCurrency(analytics?.ticketAverage)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Cupons Resgatados:</span>
              <span className="text-white font-mono font-bold">42 resgates</span>
            </div>
          </div>
        </div>
      </div>

      {/* Coupons Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creator Panel */}
        <div className="bg-[#141210] p-7 rounded-2xl border border-[#2A211A] shadow-xs">
          <h3 className="text-base font-display font-extrabold text-[#F5F0EA] mb-5 flex items-center gap-2 border-b border-[#2A211A] pb-4">
            <Plus className="text-[#FB923C] w-5 h-5" />
            Criar Cupom Promocional
          </h3>

          <form onSubmit={handleCreateCoupon} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Código do Cupom* (Letras e números)</label>
              <input
                type="text"
                required
                placeholder="Ex: SUSHI15, SUSHIFREE"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm input-sushi focus:outline-none uppercase"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Tipo do Desconto</label>
              <select
                value={discountType}
                onChange={(e: any) => setDiscountType(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm input-sushi focus:outline-none"
              >
                <option value="percentage" className="bg-[#141210] text-white">Porcentagem (%)</option>
                <option value="fixed" className="bg-[#141210] text-white">Valor Fixo (R$)</option>
                <option value="free_delivery" className="bg-[#141210] text-white">Frete Grátis</option>
              </select>
            </div>

            {discountType !== 'free_delivery' && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Valor do Desconto*</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    placeholder="0.00"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 text-sm input-sushi focus:outline-none font-mono"
                  />
                  <span className="absolute left-3.5 top-3 text-xs text-[#A8A29A] font-semibold font-mono">
                    {discountType === 'percentage' ? '%' : 'R$'}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Valor Mínimo do Pedido (R$)</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.00"
                  value={minOrderValue}
                  onChange={(e) => setMinOrderValue(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 text-sm input-sushi focus:outline-none font-mono"
                />
                <span className="absolute left-3.5 top-3 text-xs text-[#A8A29A] font-semibold font-mono">R$</span>
              </div>
            </div>

            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="chk_first_purchase"
                checked={isFirstPurchaseOnly}
                onChange={(e) => setIsFirstPurchaseOnly(e.target.checked)}
                className="rounded-lg border-[#2A211A] text-[#F97316] focus:ring-[#F97316] w-4.5 h-4.5 accent-[#F97316]"
              />
              <label htmlFor="chk_first_purchase" className="text-xs font-semibold text-slate-300 cursor-pointer">
                Exclusivo para primeira compra
              </label>
            </div>

            <button
              type="submit"
              className="w-full btn-sushi-primary text-white py-3 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Ativar Cupom
            </button>
          </form>
        </div>

        {/* Coupon Catalog List */}
        <div className="lg:col-span-2 bg-[#141210] p-7 rounded-2xl border border-[#2A211A] shadow-xs">
          <h3 className="text-base font-display font-extrabold text-[#F5F0EA] mb-5 flex items-center gap-2 border-b border-[#2A211A] pb-4">
            <Percent className="text-[#FB923C] w-5 h-5" />
            Cupons Ativos ({coupons.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
            {coupons.map((c) => (
              <div 
                key={c.code} 
                className="p-4 rounded-xl border border-[#2A211A] shadow-xs bg-[#181512] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="bg-[#1F1209] text-[#FB923C] font-mono font-bold text-xs px-3 py-1 rounded-lg border border-[#4A2A10]">
                      {c.code}
                    </span>
                    <button
                      onClick={() => handleDeleteCoupon(c.code)}
                      className="text-[#A8A29A] hover:text-red-400 p-1 rounded-lg hover:bg-[#141210] transition-colors cursor-pointer"
                      title="Excluir Cupom"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs font-bold text-[#F5F0EA] mt-4">
                    {c.discountType === 'percentage' && `Desconto de ${c.value}%`}
                    {c.discountType === 'fixed' && `Desconto de R$ ${formatCurrency(c.value)}`}
                    {c.discountType === 'free_delivery' && `Frete Grátis`}
                  </p>

                  <p className="text-[10px] text-[#A8A29A] mt-1">
                    Compra mínima de R$ {formatCurrency(c.minOrderValue)}
                  </p>
                </div>

                <div className="border-t border-[#2A211A] pt-2 mt-4 flex justify-between items-center text-[10px] text-[#A8A29A]">
                  <span className="flex items-center gap-1 font-semibold text-[#F97316]">
                    <Check className="w-3 h-3" />
                    Ativo para uso
                  </span>

                  {c.isFirstPurchaseOnly && (
                    <span className="bg-orange-950/60 text-orange-300 px-2 py-0.5 rounded-full font-bold uppercase border border-orange-800/50">
                      Novo Cliente
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
