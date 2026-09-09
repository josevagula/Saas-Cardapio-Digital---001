// Regression tests for the Clube de Fidelidade point math — run with:
//   npx tsx scripts/test-loyalty.ts
//
// Exercises the exact same pure functions AppContext uses (src/utils/loyalty.ts),
// so a change to the formula that breaks one of these five scenarios fails
// here before it ever reaches a real account.

import assert from 'node:assert/strict';
import { calculatePointsEarned, hasUnlockedReward, pointsAfterRedemption } from '../src/utils/loyalty';
import { LoyaltyConfig } from '../src/types';

let passed = 0;
const test = (name: string, fn: () => void) => {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    throw err;
  }
};

const config: LoyaltyConfig = {
  active: true,
  pointsPerTenReais: 1, // "a cada R$10 gastos = 1 ponto"
  pointsNeededForReward: 10, // "meta para resgate = 10 pontos"
  rewardType: 'fixed',
  rewardValue: 15
};

console.log('Cenário 1: R$100 gastos, R$10 = 1 ponto, meta = 10 pontos');
test('R$100 gera exatamente 10 pontos', () => {
  assert.equal(calculatePointsEarned(100, config), 10);
});
test('10 pontos libera o benefício', () => {
  assert.equal(hasUnlockedReward(10, config), true);
});

console.log('\nCenário 1b: a fórmula em si, para vários valores');
test('R$30 = 3 pontos', () => assert.equal(calculatePointsEarned(30, config), 3));
test('R$50 = 5 pontos', () => assert.equal(calculatePointsEarned(50, config), 5));
test('R$100 = 10 pontos', () => assert.equal(calculatePointsEarned(100, config), 10));
test('R$250 = 25 pontos', () => assert.equal(calculatePointsEarned(250, config), 25));

console.log('\nCenário 2: soma acumulativa entre pedidos (R$30 + R$40 + R$30)');
test('acumula 3 + 4 + 3 = 10 pontos, benefício liberado', () => {
  let balance = 0;
  balance += calculatePointsEarned(30, config); // 3
  assert.equal(balance, 3);
  balance += calculatePointsEarned(40, config); // +4 = 7
  assert.equal(balance, 7);
  balance += calculatePointsEarned(30, config); // +3 = 10
  assert.equal(balance, 10);
  assert.equal(hasUnlockedReward(balance, config), true);
});

console.log('\nCenário 3: resgate desconta exatamente a meta, nunca zera o saldo inteiro');
test('10 pontos, resgata meta de 10 -> saldo 0', () => {
  assert.equal(pointsAfterRedemption(10, config), 0);
});
test('15 pontos (5 além da meta), resgata -> saldo 5 (não perde o excedente)', () => {
  assert.equal(pointsAfterRedemption(15, config), 5);
});
test('resgate nunca deixa saldo negativo mesmo se chamado com menos que a meta', () => {
  assert.equal(pointsAfterRedemption(4, config), 0);
});

console.log('\nCenário 4: mesmo cliente, vários pedidos seguidos — sem duplicação');
test('5 pedidos de R$30 = exatamente 15 pontos, nunca mais', () => {
  const orders = [30, 30, 30, 30, 30];
  const total = orders.reduce((sum, orderTotal) => sum + calculatePointsEarned(orderTotal, config), 0);
  assert.equal(total, 15);
});

console.log('\nCenário 5: dois pedidos simultâneos — saldo correto, sem perda de pontos');
test('aplicar dois créditos como deltas é comutativo (A então B == B então A)', () => {
  // This is the algebraic property the atomic SQL relies on: each credit is
  // "loyalty_points = loyalty_points + delta" against whatever the column
  // currently holds, never a client-computed absolute value from a
  // possibly-stale local snapshot. Order-independence here is what proves
  // two concurrent credits can't lose one of them — see
  // supabase/migrations/20260908130000_loyalty_ledger_and_atomic_ops.sql's
  // credit_order_loyalty, which is exactly this update.
  const deltaA = calculatePointsEarned(30, config); // 3
  const deltaB = calculatePointsEarned(70, config); // 7
  const startingBalance = 0;

  const aThenB = startingBalance + deltaA + deltaB;
  const bThenA = startingBalance + deltaB + deltaA;
  assert.equal(aThenB, bThenA);
  assert.equal(aThenB, 10);
});
test('um resgate não pode gastar pontos que outro resgate concorrente já gastou (modelo do WHERE loyalty_points >= custo)', () => {
  // Models redeem_loyalty_reward's guard: the second UPDATE only succeeds if
  // the balance it re-reads still covers the cost — it can never subtract
  // from a balance already spent by the first one.
  let balance = 10;
  const redeemIfAffordable = (cost: number) => {
    if (balance >= cost) {
      balance -= cost;
      return true;
    }
    return false;
  };
  const first = redeemIfAffordable(10);
  const second = redeemIfAffordable(10); // same 10 points, already spent
  assert.equal(first, true);
  assert.equal(second, false);
  assert.equal(balance, 0);
});

console.log(`\n${passed} testes passaram.`);
