import { Order } from '../types';

// The sequential number is assigned in the background shortly after
// checkout (see assignOrderNumber in AppContext), so it may briefly be
// missing on a just-placed order — falls back to the legacy random id
// (still relabelled LUV->PED) rather than showing a blank code.
export function formatOrderCode(order: Order): string {
  return order.orderNumber != null ? `PED-${String(order.orderNumber).padStart(4, '0')}` : order.id.replace('LUV', 'PED');
}

export function safeNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(num) ? fallback : num;
}

export function formatCurrency(val: any): string {
  return safeNumber(val).toFixed(2);
}

export function formatBRL(val: any): string {
  return `R$ ${formatCurrency(val)}`;
}

export function parseCashAmount(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.,]/g, '');
  if (!cleaned) return 0;

  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      const norm = cleaned.replace(/\./g, '').replace(',', '.');
      return parseFloat(norm) || 0;
    } else {
      const norm = cleaned.replace(/,/g, '');
      return parseFloat(norm) || 0;
    }
  }

  if (cleaned.includes(',')) {
    const norm = cleaned.replace(',', '.');
    return parseFloat(norm) || 0;
  }

  return parseFloat(cleaned) || 0;
}
