import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Expense, ExpenseCategory } from '../../types';
import { formatCurrency, parseCashAmount } from '../../utils/formatters';
import { fetchExpenses, createExpense, updateExpense, deleteExpense, markExpensePaid, markExpenseUnpaid } from '../../lib/workspaceRepo';
import { EXPENSE_CATEGORY_LABELS, todayISO, isoDaysAgo, formatDateBR, CARD_CLASS } from './financeShared';
import { Plus, Trash2, Pencil, Search, Check, RotateCcw, AlertTriangle } from 'lucide-react';

const CATEGORY_OPTIONS = Object.entries(EXPENSE_CATEGORY_LABELS) as [ExpenseCategory, string][];

function isOverdue(e: Expense): boolean {
  return e.status === 'pendente' && e.dueDate < todayISO();
}

export default function ExpensesManager() {
  const { isDemoMode } = useApp();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [start, setStart] = useState(isoDaysAgo(60));
  const [end, setEnd] = useState(isoDaysAgo(-60));
  const [statusFilter, setStatusFilter] = useState<'todas' | 'pendente' | 'pago' | 'atrasado'>('todas');
  const [search, setSearch] = useState('');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ description: '', category: 'outros' as ExpenseCategory, amount: '', dueDate: todayISO() });

  const load = () => {
    if (!userId || isDemoMode) return;
    setLoading(true);
    setError(null);
    fetchExpenses(userId, { start, end })
      .then(setExpenses)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [userId, isDemoMode, start, end]);

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      if (statusFilter === 'atrasado' && !isOverdue(e)) return false;
      if (statusFilter === 'pendente' && (e.status !== 'pendente' || isOverdue(e))) return false;
      if (statusFilter === 'pago' && e.status !== 'pago') return false;
      if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [expenses, statusFilter, search]);

  const indicators = useMemo(() => {
    const totalAll = expenses.reduce((s, e) => s + e.amount, 0);
    const monthKey = todayISO().slice(0, 7);
    const doMes = expenses.filter(e => e.dueDate.startsWith(monthKey)).reduce((s, e) => s + e.amount, 0);
    const pendentes = expenses.filter(e => e.status === 'pendente' && !isOverdue(e)).reduce((s, e) => s + e.amount, 0);
    const vencidas = expenses.filter(isOverdue).reduce((s, e) => s + e.amount, 0);
    return { totalAll, doMes, pendentes, vencidas };
  }, [expenses]);

  const resetForm = () => {
    setForm({ description: '', category: 'outros', amount: '', dueDate: todayISO() });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoMode || !userId) return;
    const amount = parseCashAmount(form.amount);
    if (!form.description || amount <= 0) return;
    try {
      if (editingId) {
        await updateExpense(userId, editingId, { description: form.description, category: form.category, amount, dueDate: form.dueDate });
      } else {
        await createExpense(userId, { description: form.description, category: form.category, amount, dueDate: form.dueDate });
      }
      resetForm();
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startEdit = (e: Expense) => {
    setEditingId(e.id);
    setForm({ description: e.description, category: e.category, amount: e.amount.toString(), dueDate: e.dueDate });
  };

  const handleDelete = async (e: Expense) => {
    if (!userId || isDemoMode) return;
    if (!confirm(`Excluir a despesa "${e.description}"?`)) return;
    try {
      await deleteExpense(userId, e.id);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const togglePaid = async (e: Expense) => {
    if (!userId || isDemoMode) return;
    try {
      if (e.status === 'pago') await markExpenseUnpaid(userId, e.id);
      else await markExpensePaid(userId, e.id, todayISO());
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (isDemoMode) {
    return <div className="text-xs text-[#A8A29A] bg-[#1F1209] border border-[#4A2A10] rounded-lg p-4">Modo demonstração: despesas ficam disponíveis assim que você entrar com sua conta real.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de Despesas', value: indicators.totalAll, color: 'text-white' },
          { label: 'Despesas do Mês', value: indicators.doMes, color: 'text-white' },
          { label: 'Pendentes', value: indicators.pendentes, color: 'text-amber-400' },
          { label: 'Vencidas', value: indicators.vencidas, color: 'text-red-400' }
        ].map(card => (
          <div key={card.label} className={CARD_CLASS}>
            <p className="text-[10px] font-semibold text-[#A8A29A] uppercase tracking-wide">{card.label}</p>
            <p className={`text-lg font-display font-extrabold font-mono mt-1 ${card.color}`}>R$ {formatCurrency(card.value)}</p>
          </div>
        ))}
      </div>

      <div className={`${CARD_CLASS} flex flex-col md:flex-row md:items-end gap-3`}>
        <div>
          <label className="text-[10px] font-semibold text-slate-400 block mb-1">Vencimento de</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="px-3 py-2 text-xs input-sushi" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-400 block mb-1">até</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="px-3 py-2 text-xs input-sushi" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-400 block mb-1">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="px-3 py-2 text-xs input-sushi">
            <option value="todas">Todas</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="atrasado">Atrasado</option>
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="text-[10px] font-semibold text-slate-400 block mb-1">Buscar</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Descrição..." className="w-full pl-8 pr-3 py-2 text-xs input-sushi" />
          </div>
        </div>
      </div>

      {error && <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg p-3">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={CARD_CLASS}>
          <h3 className="text-sm font-display font-extrabold text-[#F5F0EA] mb-4 flex items-center gap-2">
            <Plus className="text-[#FB923C] w-4 h-4" /> {editingId ? 'Editar Despesa' : 'Nova Despesa'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input required placeholder="Descrição" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 text-xs input-sushi" />
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))} className="w-full px-3 py-2 text-xs input-sushi">
              {CATEGORY_OPTIONS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <input required placeholder="Valor (R$)" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2 text-xs input-sushi font-mono" />
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">Data de vencimento</label>
              <input required type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full px-3 py-2 text-xs input-sushi" />
            </div>
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

        <div className={`lg:col-span-2 ${CARD_CLASS}`}>
          <h3 className="text-sm font-display font-extrabold text-[#F5F0EA] mb-4 border-b border-[#2A211A] pb-3">Despesas ({filtered.length})</h3>
          {loading ? (
            <p className="text-xs text-[#A8A29A]">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-[#A8A29A]">Nenhuma despesa no período selecionado.</p>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filtered.map(e => {
                const overdue = isOverdue(e);
                return (
                  <div key={e.id} className="p-3 rounded-xl border border-[#2A211A] bg-[#181512] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-[#F5F0EA] truncate">{e.description}</p>
                        {e.status === 'pago' ? (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-1.5 py-0.5 rounded-full shrink-0">Pago</span>
                        ) : overdue ? (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-red-400 bg-red-950/40 border border-red-800/50 px-1.5 py-0.5 rounded-full shrink-0">
                            <AlertTriangle className="w-2.5 h-2.5" /> Atrasado
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-950/30 border border-amber-800/50 px-1.5 py-0.5 rounded-full shrink-0">Pendente</span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#A8A29A] mt-0.5">
                        {EXPENSE_CATEGORY_LABELS[e.category]} • Vence {formatDateBR(e.dueDate)}{e.paidDate ? ` • Pago em ${formatDateBR(e.paidDate)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono font-bold text-white">R$ {e.amount.toFixed(2)}</span>
                      <button onClick={() => togglePaid(e)} title={e.status === 'pago' ? 'Reabrir' : 'Marcar como pago'} className="text-[#A8A29A] hover:text-emerald-400 cursor-pointer">
                        {e.status === 'pago' ? <RotateCcw className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => startEdit(e)} className="text-[#A8A29A] hover:text-[#FB923C] cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(e)} className="text-[#A8A29A] hover:text-red-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
