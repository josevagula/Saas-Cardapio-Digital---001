import { RevenueCategory, ExpenseCategory, DrePeriodType } from '../../types';

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

// All dates are the restaurant's LOCAL calendar day — toISOString() would use
// UTC, which in Brazil turns every evening after 21h into "tomorrow".
export const localISO = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const todayISO = (): string => localISO(new Date());

export const isoDaysAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localISO(d);
};

export const startOfMonthISO = (): string => {
  const d = new Date();
  return localISO(new Date(d.getFullYear(), d.getMonth(), 1));
};

export const startOfYearISO = (): string => localISO(new Date(new Date().getFullYear(), 0, 1));

export const formatDateBR = (iso: string): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export const CARD_CLASS = 'bg-[#141210] p-6 rounded-2xl border border-[#2A211A] shadow-xs';

// index.css remaps Tailwind's emerald-* to orange, so real green (money in /
// paid) uses literal hex.
export const GREEN_TEXT = 'text-[#4ADE80]';

// --- DRE period math ---

export function periodRange(periodType: DrePeriodType, referenceISO: string): { start: string; end: string } {
  const ref = new Date(referenceISO + 'T00:00:00');
  const y = ref.getFullYear();
  if (periodType === 'mensal') {
    const m = ref.getMonth();
    return { start: localISO(new Date(y, m, 1)), end: localISO(new Date(y, m + 1, 0)) };
  }
  if (periodType === 'trimestral') {
    const q = Math.floor(ref.getMonth() / 3);
    return { start: localISO(new Date(y, q * 3, 1)), end: localISO(new Date(y, q * 3 + 3, 0)) };
  }
  return { start: localISO(new Date(y, 0, 1)), end: localISO(new Date(y, 11, 31)) };
}

export function shiftPeriod(periodType: DrePeriodType, referenceISO: string, direction: 1 | -1): string {
  const ref = new Date(referenceISO + 'T00:00:00');
  if (periodType === 'mensal') return localISO(new Date(ref.getFullYear(), ref.getMonth() + direction, 1));
  if (periodType === 'trimestral') return localISO(new Date(ref.getFullYear(), ref.getMonth() + direction * 3, 1));
  return localISO(new Date(ref.getFullYear() + direction, 0, 1));
}

export function periodLabel(periodType: DrePeriodType, referenceISO: string): string {
  const { start } = periodRange(periodType, referenceISO);
  const d = new Date(start + 'T00:00:00');
  if (periodType === 'mensal') return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  if (periodType === 'trimestral') return `${Math.floor(d.getMonth() / 3) + 1}º Trimestre ${d.getFullYear()}`;
  return `${d.getFullYear()}`;
}
