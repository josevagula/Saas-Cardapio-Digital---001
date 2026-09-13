// Thin bridge between order lifecycle events (AppContext) and the printing
// module — kept separate so AppContext only ever makes two narrow calls
// (see updateOrderStatus and the orders realtime subscription) instead of
// reaching into printService/queue internals directly.
import { Order, PrintingConfig } from '../../types';
import { printOrderOnPrinter, wasAutoPrinted, markAutoPrinted } from './printService';

// Deliberately does NOT filter by current connection status. Any status
// check here — even one that also accepted 'reconectando' — can still catch
// a printer sitting in genuine 'desconectado' (the reconnect attempt hasn't
// even flipped its status yet, or a longer outage), which meant the job was
// never created at all while the order was still marked auto-printed below,
// permanently losing that receipt with zero trace in the print queue. Every
// configured printer now always gets a job; printService's queue (runJob)
// owns deciding connectivity — it waits for an in-flight reconnect, retries
// with backoff, and if the printer really is offline it leaves a visible,
// reprintable 'erro' entry instead of silently dropping the order.
function printOnAllConnectedPrinters(order: Order, orderCode: string, config: PrintingConfig, logoUrl: string | undefined) {
  config.printers.forEach(p => printOrderOnPrinter(p.id, p.name, order, orderCode, config, p.paperWidth, logoUrl));
}

// "Recebido" — a brand-new order just landed (realtime INSERT).
export function handleOrderReceivedForPrinting(order: Order, orderCode: string, config: PrintingConfig | undefined, logoUrl: string | undefined) {
  if (!config?.autoPrintOnReceived) return;
  if (wasAutoPrinted(order.id, 'received')) return;
  markAutoPrinted(order.id, 'received');
  printOnAllConnectedPrinters(order, orderCode, config, logoUrl);
}

// "Confirmado" — staff accepted a pending order (received -> preparing).
export function handleOrderConfirmedForPrinting(order: Order, orderCode: string, config: PrintingConfig | undefined, logoUrl: string | undefined) {
  if (!config?.autoPrintOnConfirmed) return;
  if (wasAutoPrinted(order.id, 'confirmed')) return;
  markAutoPrinted(order.id, 'confirmed');
  printOnAllConnectedPrinters(order, orderCode, config, logoUrl);
}
