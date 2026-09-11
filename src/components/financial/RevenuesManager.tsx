import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Revenue, RevenueCategory } from '../../types';
import { formatCurrency, parseCashAmount } from '../../utils/formatters';
import { fetchRevenues, createRevenue, updateRevenue, deleteRevenue } from '../../lib/workspaceRepo';
import { REVENUE_CATEGORY_LABELS, todayISO, startOfMonthISO, formatDateBR, CARD_CLASS } from './financeShared';
import { Plus, Trash2, Pencil, Download, Search, Link2 } from 'lucide-react';

const CATEGORY_OPTIONS = Object.entries(REVENUE_CATEGORY_LABELS) as [RevenueCategory, string][];

export default function RevenuesManager() {
  const { isDemoMode, orders } = useApp();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [start, setStart] = useState(startOfMonthISO());
  const [end, setEnd] = useState(todayISO());
  const [category, setCategory] = useState<RevenueCategory | 'todas'>('todas');
  const [search, setSearch] = useState('');

  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ description: '', category: 'outros' as RevenueCategory, amount: '', occurredAt: todayISO(), paymentMethod: '' });

  const load = () => {
    if (!userId || isDemoMode) return;
    setLoading(true);
    setError(null);
    fetchRevenues(userId, { start, end })
      .then(setRevenues)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [userId, isDemoMode, start, end]);

  // Modo demo: dados simulados a partir dos pedidos demo, só para visualização.
  const demoRevenues: Revenue[] = useMemo(() => {
    if (!isDemoMode) return [];
    return orders.filter(o => o.status !== 'cancelled').map(o => ({
      id: o.id,
      description: `Pedido #${o.orderNumber ?? o.id}`,
      category: (o.deliveryMethod === 'delivery' ? 'delivery' : o.deliveryMethod === 'dine_in' ? 'salao' : 'balcao') as RevenueCategory,
      amount: o.total,
      occurredAt: o.createdAt.slice(0, 10),
      paymentMethod: o.paymentMethod,
      origin: 'pedido_automatico' as const,
      orderId: o.id,
      isManualOverride: false,
      createdAt: o.createdAt,
      updatedAt: o.createdAt
    }));
  }, [isDemoMode, orders]);

  const list = isDemoMode ? demoRevenues : revenues;

  const filtered = useMemo(() => {
    return list.filter(r => {
      if (category !== 'todas' && r.category !== category) return false;
      if (search && !r.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [list, category, search]);

  const total = filtered.reduce((s, r) => s + r.amount, 0);

  const resetForm = () => {
    setForm({ description: '', category: 'outros', amount: '', occurredAt: todayISO(), paymentMethod: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoMode || !userId) return;
    const amount = parseCashAmount(form.amount);
    if (!form.description || amount <= 0) return;

    try {
      if (editingId) {
        const target = revenues.find(r => r.id === editingId);
        const adopt = !!target && target.origin === 'pedido_automatico';
        await updateRevenue(userId, editingId, {
          description: form.description,
          category: form.category,
          amount,
          occurredAt: form.occurredAt,
          paymentMethod: form.paymentMethod || undefined
        }, adopt);
      } else {
        await createRevenue(userId, {
          description: form.description,
          category: form.category,
          amount,
          occurredAt: form.occurredAt,
          paymentMethod: form.paymentMethod || undefined
        });
      }
      resetForm();
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startEdit = (r: Revenue) => {
    setEditingId(r.id);
    setForm({
      description: r.description,
      category: r.category,
      amount: r.amount.toString(),
      occurredAt: r.occurredAt,
      paymentMethod: r.paymentMethod || ''
    });
  };

  const handleDelete = async (r: Revenue) => {
    if (!userId || isDemoMode) return;
    if (!confirm(`Excluir a receita "${r.description}"?`)) return;
    try {
      await deleteRevenue(userId, r.id);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExportCsv = () => {
    const header = 'Descricao,Categoria,Valor,Data,Forma de Pagamento,Origem\n';
    const rows = filtered.map(r =>
      `"${r.description.replace(/"/g, '""')}",${REVENUE_CATEGORY_LABELS[r.category]},${r.amount.toFixed(2)},${r.occurredAt},${r.paymentMethod || ''},${r.origin === 'manual' ? 'Manual' : 'Pedido'}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receitas_${start}_a_${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className={`${CARD_CLASS} flex flex-col md:flex-row md:items-end gap-3`}>
        <div>
          <label className="text-[10px] font-semibold text-slate-400 block mb-1">De</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="px-3 py-2 text-xs input-sushi" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-400 block mb-1">Até</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="px-3 py-2 text-xs input-sushi" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-400 block mb-1">Categoria</label>
          <select value={category} onChange={e => setCategory(e.target.value as any)} className="px-3 py-2 text-xs input-sushi">
            <option value="todas">Todas</option>
            {CATEGORY_OPTIONS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="text-[10px] font-semibold text-slate-400 block mb-1">Buscar</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Descrição..." className="w-full pl-8 pr-3 py-2 text-xs input-sushi" />
          </div>
        </div>
        <button onClick={handleExportCsv} className="flex items-center gap-1.5 px-4 py-2 btn-sushi-primary text-white text-xs font-bold cursor-pointer">
          <Download className="w-3.5 h-3.5" /> Exportar CSV
        </button>
      </div>

      {error && <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg p-3">{error}</div>}
      {isDemoMode && <div className="text-xs text-[#A8A29A] bg-[#1F1209] border border-[#4A2A10] rounded-lg p-3">Modo demonstração: as receitas abaixo são simuladas a partir dos pedidos de exemplo (cadastro/edição desativados).</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {!isDemoMode && (
          <div className={CARD_CLASS}>
            <h3 className="text-sm font-display font-extrabold text-[#F5F0EA] mb-4 flex items-center gap-2">
              <Plus className="text-[#FB923C] w-4 h-4" /> {editingId ? 'Editar Receita' : 'Nova Receita Manual'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input required placeholder="Descrição" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 text-xs input-sushi" />
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as RevenueCategory }))} className="w-full px-3 py-2 text-xs input-sushi">
                {CATEGORY_OPTIONS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
              <input required placeholder="Valor (R$)" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2 text-xs input-sushi font-mono" />
              <input required type="date" value={form.occurredAt} onChange={e => setForm(f => ({ ...f, occurredAt: e.target.value }))} className="w-full px-3 py-2 text-xs input-sushi" />
              <input placeholder="Forma de pagamento (opcional)" value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} className="w-full px-3 py-2 text-xs input-sushi" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 btn-sushi-primary text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer">
                  {editingId ? 'Salvar' : 'Adicionar'}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className="px-4 py-2.5 rounded-xl text-xs font-bold border border-[#2A211A] text-slate-300 cursor-pointer">
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        <div className={`${isDemoMode ? 'lg:col-span-3' : 'lg:col-span-2'} ${CARD_CLASS}`}>
          <div className="flex items-center justify-between mb-4 border-b border-[#2A211A] pb-3">
            <h3 className="text-sm font-display font-extrabold text-[#F5F0EA]">Receitas ({filtered.length})</h3>
            <span className="text-sm font-mono font-extrabold text-[#F97316]">R$ {formatCurrency(total)}</span>
          </div>

          {loading ? (
            <p className="text-xs text-[#A8A29A]">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-[#A8A29A]">Nenhuma receita no período selecionado.</p>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filtered.map(r => (
                <div key={r.id} className="p-3 rounded-xl border border-[#2A211A] bg-[#181512] flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[#F5F0EA] truncate">{r.description}</p>
                      {r.origin === 'pedido_automatico' && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-[#FB923C] bg-[#1F1209] border border-[#4A2A10] px-1.5 py-0.5 rounded-full shrink-0">
                          <Link2 className="w-2.5 h-2.5" /> Pedido
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#A8A29A] mt-0.5">{REVENUE_CATEGORY_LABELS[r.category]} • {formatDateBR(r.occurredAt)}{r.paymentMethod ? ` • ${r.paymentMethod}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono font-bold text-white">R$ {r.amount.toFixed(2)}</span>
                    {!isDemoMode && (
                      <>
                        <button onClick={() => startEdit(r)} className="text-[#A8A29A] hover:text-[#FB923C] cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(r)} className="text-[#A8A29A] hover:text-red-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
