// Thin bridge between order lifecycle events (AppContext) and the printing
// module — kept separate so AppContext only ever makes two narrow calls
// (see updateOrderStatus and the orders realtime subscription) instead of
// reaching into printService/queue internals directly.
import { Order, PrintingConfig } from '../../types';
import { getPrinterStatus, printOrderOnPrinter, wasAutoPrinted, markAutoPrinted } from './printService';

function printOnAllConnectedPrinters(order: Order, orderCode: string, config: PrintingConfig, logoUrl: string | undefined) {
  config.printers
    .filter(p => getPrinterStatus(p.id) === 'conectado')
    .forEach(p => printOrderOnPrinter(p.id, p.name, order, orderCode, config, p.paperWidth, logoUrl));
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
