import { LoyaltyConfig, Order } from '../types';

export interface CustomerLoyaltyStats {
  points: number;
  orderCount: number;
  lastOrderDate: string;
}

// A customer's loyalty numbers derived ONLY from orders that currently sit in
// Pedidos Concluídos (status 'delivered') — never from the running
// loyalty_points/order_count columns on the customer row, which can carry
// stale values from orders that were later cancelled/reverted/deleted or
// credited twice by past bugs. Balance = points earned by those delivered
// orders minus points already spent on redemptions (redeemedByPhone, from
// the loyalty ledger's 'redeem' entries), floored at 0.
export function computeLoyaltyByPhone(
  orders: Order[],
  redeemedByPhone: Record<string, number>
): Record<string, CustomerLoyaltyStats> {
  const stats: Record<string, CustomerLoyaltyStats> = {};
  for (const order of orders) {
    if (order.status !== 'delivered') continue;
    const entry = stats[order.customerPhone] ?? (stats[order.customerPhone] = { points: 0, orderCount: 0, lastOrderDate: '' });
    entry.points += order.pointsEarned || 0;
    entry.orderCount += 1;
    const day = order.createdAt ? order.createdAt.slice(0, 10) : '';
    if (day > entry.lastOrderDate) entry.lastOrderDate = day;
  }
  for (const phone of Object.keys(stats)) {
    stats[phone].points = Math.max(0, stats[phone].points - (redeemedByPhone[phone] ?? 0));
  }
  return stats;
}

// Single source of truth for the Clube de Fidelidade math — used by order
// placement, delivery crediting, reversal and the config UI's own preview,
// so none of them can drift into computing points a different way.
//
// PONTOS = floor(VALOR_GASTO / 10) * PONTOS_POR_DEZ_REAIS — deterministic,
// no randomness, no double counting: the same order total under the same
// config always yields the same number of points.
export function calculatePointsEarned(orderTotal: number, config: LoyaltyConfig): number {
  if (!config.active || !Number.isFinite(orderTotal) || orderTotal <= 0) return 0;
  return Math.floor(orderTotal / 10) * config.pointsPerTenReais;
}

// True once a customer's balance has reached the configured redemption
// goal — a goal of 0 (misconfigured) never unlocks anything rather than
// unlocking for everyone.
export function hasUnlockedReward(currentPoints: number, config: LoyaltyConfig): boolean {
  return config.pointsNeededForReward > 0 && currentPoints >= config.pointsNeededForReward;
}

// Redemption spends exactly the goal's worth of points, never the whole
// balance — points earned beyond the goal carry over toward the next
// reward instead of being discarded.
export function pointsAfterRedemption(currentPoints: number, config: LoyaltyConfig): number {
  return Math.max(0, currentPoints - config.pointsNeededForReward);
}
