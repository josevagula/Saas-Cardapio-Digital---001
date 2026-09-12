import React, { useMemo, useState } from 'react';
import { Search, UserCheck, UserX, Crown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { CustomerAggregate, InactiveCustomerRow, VipRow } from '../../utils/analyticsStats';
import { TABLE_CARD_CLASS, VIP_TIER_BADGE_CLASS, INACTIVITY_TIER_BADGE_CLASS } from './analyticsShared';
import Pagination from './Pagination';

const PAGE_SIZE = 10;

function formatDate(d: Date): string {
  return d.toLocaleDateString('pt-BR');
}

function useFilteredPage<T>(rows: T[], search: string, matches: (row: T, q: string) => boolean) {
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter(r => matches(r, q)) : rows;
  }, [rows, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  return { filtered, pageRows, page: safePage, setPage, totalPages };
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="w-3.5 h-3.5 text-[#A8A29A] absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 text-xs input-sushi focus:outline-none font-medium"
      />
    </div>
  );
}

export function ClientesAtivosTable({ rows }: { rows: CustomerAggregate[] }) {
  const [search, setSearch] = useState('');
  const { pageRows, page, setPage, totalPages, filtered } = useFilteredPage(rows, search, (r, q) =>
    r.name.toLowerCase().includes(q) || r.phone.includes(q)
  );

  return (
    <div className={TABLE_CARD_CLASS}>
      <div className="p-5 border-b border-[#2A211A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-sm font-display font-extrabold text-[#F5F0EA] flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#FB923C]" />
          Clientes Ativos
        </h3>
        <SearchBox value={search} onChange={setSearch} placeholder="Buscar por nome ou telefone..." />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#181512] border-b border-[#2A211A] text-[#A8A29A] font-mono text-[10px] uppercase tracking-wider">
              <th className="py-3 px-6 font-bold">Nome</th>
              <th className="py-3 px-6 font-bold">Telefone</th>
              <th className="py-3 px-6 font-bold text-center">Pedidos</th>
              <th className="py-3 px-6 font-bold text-right">Total Gasto</th>
              <th className="py-3 px-6 font-bold">Último Pedido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A211A]">
            {pageRows.length === 0 ? (
              <tr><td colSpan={5} className="py-10 text-center text-[#A8A29A]">Nenhum cliente ativo encontrado.</td></tr>
            ) : pageRows.map(c => (
              <tr key={c.phone} className="hover:bg-[#181512] transition-colors">
                <td className="py-3.5 px-6 font-bold text-[#F5F0EA]">{c.name}</td>
                <td className="py-3.5 px-6 font-mono text-slate-300">{c.phone}</td>
                <td className="py-3.5 px-6 text-center font-mono text-[#F5F0EA]">{c.orderCount}</td>
                <td className="py-3.5 px-6 text-right font-mono font-bold text-[#F5F0EA]">R$ {formatCurrency(c.totalSpent)}</td>
                <td className="py-3.5 px-6 font-mono text-[#A8A29A]">{formatDate(c.lastOrderAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
    </div>
  );
}

export function ClientesInativosTable({ rows }: { rows: InactiveCustomerRow[] }) {
  const [search, setSearch] = useState('');
  const { pageRows, page, setPage, totalPages, filtered } = useFilteredPage(rows, search, (r, q) =>
    r.name.toLowerCase().includes(q) || r.phone.includes(q)
  );

  return (
    <div className={TABLE_CARD_CLASS}>
      <div className="p-5 border-b border-[#2A211A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-sm font-display font-extrabold text-[#F5F0EA] flex items-center gap-2">
          <UserX className="w-4 h-4 text-[#FB923C]" />
          Clientes Inativos
        </h3>
        <SearchBox value={search} onChange={setSearch} placeholder="Buscar por nome ou telefone..." />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#181512] border-b border-[#2A211A] text-[#A8A29A] font-mono text-[10px] uppercase tracking-wider">
              <th className="py-3 px-6 font-bold">Nome</th>
              <th className="py-3 px-6 font-bold">Telefone</th>
              <th className="py-3 px-6 font-bold">Último Pedido</th>
              <th className="py-3 px-6 font-bold text-center">Dias sem comprar</th>
              <th className="py-3 px-6 font-bold text-right">Total Gasto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A211A]">
            {pageRows.length === 0 ? (
              <tr><td colSpan={5} className="py-10 text-center text-[#A8A29A]">Nenhum cliente inativo encontrado.</td></tr>
            ) : pageRows.map(c => (
              <tr key={c.phone} className="hover:bg-[#181512] transition-colors">
                <td className="py-3.5 px-6 font-bold text-[#F5F0EA]">{c.name}</td>
                <td className="py-3.5 px-6 font-mono text-slate-300">{c.phone}</td>
                <td className="py-3.5 px-6 font-mono text-[#A8A29A]">{formatDate(c.lastOrderAt)}</td>
                <td className="py-3.5 px-6 text-center">
                  <span className="font-mono font-bold text-[#F5F0EA] mr-2">{c.daysSince}d</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${INACTIVITY_TIER_BADGE_CLASS[c.tier]}`}>
                    Inativo {c.tier}
                  </span>
                </td>
                <td className="py-3.5 px-6 text-right font-mono font-bold text-[#F5F0EA]">R$ {formatCurrency(c.totalSpent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
    </div>
  );
}

export function VipRankingTable({ rows }: { rows: VipRow[] }) {
  const [search, setSearch] = useState('');
  const { pageRows, page, setPage, totalPages, filtered } = useFilteredPage(rows, search, (r, q) =>
    r.name.toLowerCase().includes(q) || r.phone.includes(q)
  );

  return (
    <div className={TABLE_CARD_CLASS}>
      <div className="p-5 border-b border-[#2A211A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-sm font-display font-extrabold text-[#F5F0EA] flex items-center gap-2">
          <Crown className="w-4 h-4 text-[#FB923C]" />
          Ranking VIP
        </h3>
        <SearchBox value={search} onChange={setSearch} placeholder="Buscar por nome ou telefone..." />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#181512] border-b border-[#2A211A] text-[#A8A29A] font-mono text-[10px] uppercase tracking-wider">
              <th className="py-3 px-6 font-bold text-center">Posição</th>
              <th className="py-3 px-6 font-bold">Cliente</th>
              <th className="py-3 px-6 font-bold text-center">Pedidos</th>
              <th className="py-3 px-6 font-bold text-right">Total Gasto</th>
              <th className="py-3 px-6 font-bold text-right">Pontos</th>
              <th className="py-3 px-6 font-bold text-center">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A211A]">
            {pageRows.length === 0 ? (
              <tr><td colSpan={6} className="py-10 text-center text-[#A8A29A]">Nenhum cliente encontrado.</td></tr>
            ) : pageRows.map(c => (
              <tr key={c.phone} className="hover:bg-[#181512] transition-colors">
                <td className="py-3.5 px-6 text-center font-mono font-bold text-[#F5F0EA]">#{c.position}</td>
                <td className="py-3.5 px-6">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#F5F0EA]">{c.name}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${VIP_TIER_BADGE_CLASS[c.tier]}`}>
                      {c.tier}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#A8A29A] font-mono">{c.phone}</span>
                </td>
                <td className="py-3.5 px-6 text-center font-mono text-[#F5F0EA]">{c.orderCount}</td>
                <td className="py-3.5 px-6 text-right font-mono font-bold text-[#F5F0EA]">R$ {formatCurrency(c.totalSpent)}</td>
                <td className="py-3.5 px-6 text-right font-mono text-[#FB923C] font-bold">{c.points} pts</td>
                <td className="py-3.5 px-6 text-center font-mono font-extrabold text-[#F97316]">{c.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
    </div>
  );
}
