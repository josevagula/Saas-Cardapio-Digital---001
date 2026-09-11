import React, { useState } from 'react';
import { LayoutDashboard, Receipt, TrendingDown, Wallet, FileBarChart, Percent } from 'lucide-react';
import FinanceDashboard from './financial/FinanceDashboard';
import RevenuesManager from './financial/RevenuesManager';
import ExpensesManager from './financial/ExpensesManager';
import CashFlowView from './financial/CashFlowView';
import DreView from './financial/DreView';
import CouponsManager from './financial/CouponsManager';

type FinancialTab = 'dashboard' | 'receitas' | 'despesas' | 'fluxo_caixa' | 'dre' | 'cupons';

const TABS: { id: FinancialTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'receitas', label: 'Receitas', icon: Receipt },
  { id: 'despesas', label: 'Despesas', icon: TrendingDown },
  { id: 'fluxo_caixa', label: 'Fluxo de Caixa', icon: Wallet },
  { id: 'dre', label: 'DRE', icon: FileBarChart },
  { id: 'cupons', label: 'Cupons', icon: Percent }
];

export default function FinancialManager() {
  const [tab, setTab] = useState<FinancialTab>('dashboard');

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#0C0A08] font-sans text-slate-100" id="sushi-financial-manager">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-mono font-semibold text-[#FB923C] uppercase tracking-widest">Painel Financeiro</span>
          <h2 className="text-3xl font-display font-extrabold text-[#F5F0EA] tracking-tight mt-1">Financeiro</h2>
          <p className="text-sm text-[#A8A29A] mt-1">Receitas, despesas, fluxo de caixa e DRE — integrados aos seus pedidos, delivery e fidelidade.</p>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-8 overflow-x-auto border-b border-[#2A211A] pb-px">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 cursor-pointer transition-colors ${
              tab === t.id
                ? 'border-[#F97316] text-[#F97316]'
                : 'border-transparent text-[#A8A29A] hover:text-slate-200'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <FinanceDashboard />}
      {tab === 'receitas' && <RevenuesManager />}
      {tab === 'despesas' && <ExpensesManager />}
      {tab === 'fluxo_caixa' && <CashFlowView />}
      {tab === 'dre' && <DreView />}
      {tab === 'cupons' && <CouponsManager />}
    </div>
  );
}
