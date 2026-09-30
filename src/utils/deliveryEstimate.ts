// Turns the free-text "Tempo de Entrega Estimado" from Personalização
// ("30-45 min", "40 minutos", "1h", "1 a 2 horas") into a clock-time window
// counted from when the order was placed. Shared by the WhatsApp order
// message (PublicMenuPage) and the Planilha in Pedidos so both always agree.

export const DEFAULT_DELIVERY_TIME = '30-45 min';

export interface DeliveryEstimate {
  // Text as configured, e.g. "30-45 min".
  raw: string;
  // Clock times (HH:mm); null when the text can't be read as minutes/hours.
  from: string | null;
  to: string | null;
}

export function computeDeliveryEstimate(placedAt: Date, deliveryTime?: string): DeliveryEstimate | null {
  const raw = (deliveryTime || DEFAULT_DELIVERY_TIME).trim();
  if (!raw) return null;
  const numbers = (raw.match(/\d+/g) || []).map(Number);
  const inHours = /\d\s*(h|hr|hora)/i.test(raw) && !/min/i.test(raw);
  const toMinutes = (n: number) => (inHours ? n * 60 : n);
  const minMinutes = numbers.length > 0 ? toMinutes(numbers[0]) : NaN;
  const maxMinutes = numbers.length > 1 ? toMinutes(numbers[1]) : minMinutes;
  if (!Number.isFinite(minMinutes) || minMinutes <= 0 || maxMinutes < minMinutes || maxMinutes > 24 * 60) {
    return { raw, from: null, to: null };
  }
  const clock = (minutes: number) =>
    new Date(placedAt.getTime() + minutes * 60 * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return { raw, from: clock(minMinutes), to: clock(maxMinutes) };
}
