import { VipTierComputed, InactivityTier } from '../../utils/analyticsStats';

// Mirrors financeShared.ts's CARD_CLASS so every new block here matches the
// exact card look already used across Financeiro/Dashboard.
export const CARD_CLASS = 'bg-[#141210] p-6 rounded-2xl border border-[#2A211A] shadow-xs';
export const TABLE_CARD_CLASS = 'bg-[#141210] rounded-2xl border border-[#2A211A] shadow-xs overflow-hidden';

export const VIP_TIER_BADGE_CLASS: Record<VipTierComputed, string> = {
  Diamante: 'bg-sky-950/50 text-sky-300 border border-sky-800/50',
  Ouro: 'bg-amber-950/40 text-amber-300 border border-amber-800/40',
  Prata: 'bg-slate-800/50 text-slate-300 border border-slate-600/40',
  Bronze: 'bg-orange-950/40 text-orange-300 border border-orange-800/40'
};

export const INACTIVITY_TIER_BADGE_CLASS: Record<InactivityTier, string> = {
  Leve: 'bg-amber-950/40 text-amber-300 border border-amber-800/40',
  'Médio': 'bg-orange-950/40 text-orange-300 border border-orange-800/40',
  Grave: 'bg-red-950/40 text-red-300 border border-red-800/40'
};

export function formatChangePercent(value: number | null): string {
  if (value === null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}%`;
}

export function changeColorClass(value: number | null, invert = false): string {
  if (value === null) return 'text-[#A8A29A]';
  const positive = invert ? value < 0 : value > 0;
  if (value === 0) return 'text-[#A8A29A]';
  return positive ? 'text-emerald-400' : 'text-red-400';
}
