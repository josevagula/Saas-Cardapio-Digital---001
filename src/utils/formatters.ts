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
