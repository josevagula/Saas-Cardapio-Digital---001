import React from 'react';
import { FILTER_PRESETS } from '../utils/analyticsStats';
import { OrderDatePreset, OrderFilterState, defaultOrderFilters, hasActiveOrderFilters } from '../utils/orderFilters';
import { CalendarDays, Package, Search, X, Filter } from 'lucide-react';

interface Props {
  value: OrderFilterState;
  onChange: (next: OrderFilterState) => void;
  productOptions: { id: string; name: string }[];
  customerOptions: string[];
  // The dashboard already has its own period selector (Semanal/Mensal/
  // Personalizado) driving the chart, so it only shows product + person.
  showDate?: boolean;
  resultCount?: number;
}

const DATE_OPTIONS: { id: OrderDatePreset; label: string }[] = [
  { id: 'todos', label: 'Todas as datas' },
  ...FILTER_PRESETS
];

const FIELD_CLASS = 'w-full pl-8 pr-2.5 py-2 text-xs bg-[#0C0A08] border border-[#2A211A] rounded-lg focus:outline-none focus:border-[#FB923C] text-white';
const DATE_INPUT_CLASS = 'px-2 py-1 text-xs bg-[#0C0A08] border border-[#2A211A] rounded-md focus:outline-none focus:border-[#FB923C] text-white cursor-pointer';

export default function OrderFiltersBar({ value, onChange, productOptions, customerOptions, showDate = true, resultCount }: Props) {
  const set = (patch: Partial<OrderFilterState>) => onChange({ ...value, ...patch });
  const active = hasActiveOrderFilters(value);
  const datalistId = showDate ? 'order-filter-customers' : 'dashboard-filter-customers';

  return (
    <div className="bg-[#141210] p-3 rounded-xl border border-[#2A211A] shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A8A29A] flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-[#FB923C]" />
          Filtros
          {active && resultCount !== undefined && (
            <span className="normal-case tracking-normal text-[#FB923C]">· {resultCount} pedido{resultCount === 1 ? '' : 's'}</span>
          )}
        </span>
        {active && (
          <button
            onClick={() => onChange({ ...defaultOrderFilters(), customStart: value.customStart, customEnd: value.customEnd })}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#A8A29A] hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Limpar filtros
          </button>
        )}
      </div>

      <div className={`grid grid-cols-1 gap-2.5 ${showDate ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {showDate && (
          <div className="relative">
            <CalendarDays className="w-3.5 h-3.5 text-[#A8A29A] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={value.datePreset}
              onChange={(e) => set({ datePreset: e.target.value as OrderDatePreset })}
              style={{ colorScheme: 'dark' }}
              className={`${FIELD_CLASS} cursor-pointer`}
            >
              {DATE_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
        )}

        <div className="relative">
          <Package className="w-3.5 h-3.5 text-[#A8A29A] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={value.productId}
            onChange={(e) => set({ productId: e.target.value })}
            style={{ colorScheme: 'dark' }}
            className={`${FIELD_CLASS} cursor-pointer`}
          >
            <option value="">Todos os produtos</option>
            {productOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#A8A29A] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            list={datalistId}
            value={value.customer}
            onChange={(e) => set({ customer: e.target.value })}
            placeholder="Cliente: nome ou telefone"
            className={FIELD_CLASS}
          />
          <datalist id={datalistId}>
            {customerOptions.map(name => <option key={name} value={name} />)}
          </datalist>
        </div>
      </div>

      {showDate && value.datePreset === 'personalizado' && (
        <div className="flex flex-wrap items-center gap-3 mt-2.5 p-2.5 bg-[#181512] rounded-lg border border-[#2A211A]">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#A8A29A] uppercase font-mono font-bold">Início:</span>
            <input type="date" value={value.customStart} onChange={(e) => set({ customStart: e.target.value })} style={{ colorScheme: 'dark' }} className={DATE_INPUT_CLASS} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#A8A29A] uppercase font-mono font-bold">Fim:</span>
            <input type="date" value={value.customEnd} onChange={(e) => set({ customEnd: e.target.value })} style={{ colorScheme: 'dark' }} className={DATE_INPUT_CLASS} />
          </div>
        </div>
      )}
    </div>
  );
}
