import { LoyaltyConfig } from '../types';

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
