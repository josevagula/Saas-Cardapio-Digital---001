import { RevenueCategory, ExpenseCategory } from '../../types';

export const REVENUE_CATEGORY_LABELS: Record<RevenueCategory, string> = {
  pedidos_online: 'Pedidos Online',
  delivery: 'Delivery',
  balcao: 'Balcão',
  salao: 'Salão',
  outros: 'Outros'
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  aluguel: 'Aluguel',
  fornecedores: 'Fornecedores',
  funcionarios: 'Funcionários',
  marketing: 'Marketing',
  energia: 'Energia',
  agua: 'Água',
  internet: 'Internet',
  impostos: 'Impostos',
  equipamentos: 'Equipamentos',
  outros: 'Outros'
};

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

export const isoDaysAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

export const startOfMonthISO = (): string => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

export const startOfYearISO = (): string => {
  const d = new Date();
  return new Date(d.getFullYear(), 0, 1).toISOString().slice(0, 10);
};

export const formatDateBR = (iso: string): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export const CARD_CLASS = 'bg-[#141210] p-6 rounded-2xl border border-[#2A211A] shadow-xs';

// --- DRE period math ---
import { DrePeriodType } from '../../types';

const toISO = (d: Date): string => d.toISOString().slice(0, 10);

export function periodRange(periodType: DrePeriodType, referenceISO: string): { start: string; end: string } {
  const ref = new Date(referenceISO + 'T00:00:00');
  const y = ref.getFullYear();
  if (periodType === 'mensal') {
    const m = ref.getMonth();
    return { start: toISO(new Date(y, m, 1)), end: toISO(new Date(y, m + 1, 0)) };
  }
  if (periodType === 'trimestral') {
    const q = Math.floor(ref.getMonth() / 3);
    return { start: toISO(new Date(y, q * 3, 1)), end: toISO(new Date(y, q * 3 + 3, 0)) };
  }
  return { start: toISO(new Date(y, 0, 1)), end: toISO(new Date(y, 11, 31)) };
}

export function shiftPeriod(periodType: DrePeriodType, referenceISO: string, direction: 1 | -1): string {
  const ref = new Date(referenceISO + 'T00:00:00');
  if (periodType === 'mensal') return toISO(new Date(ref.getFullYear(), ref.getMonth() + direction, 1));
  if (periodType === 'trimestral') return toISO(new Date(ref.getFullYear(), ref.getMonth() + direction * 3, 1));
  return toISO(new Date(ref.getFullYear() + direction, 0, 1));
}

export function periodLabel(periodType: DrePeriodType, referenceISO: string): string {
  const { start } = periodRange(periodType, referenceISO);
  const d = new Date(start + 'T00:00:00');
  if (periodType === 'mensal') return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  if (periodType === 'trimestral') return `${Math.floor(d.getMonth() / 3) + 1}º Trimestre ${d.getFullYear()}`;
  return `${d.getFullYear()}`;
}
