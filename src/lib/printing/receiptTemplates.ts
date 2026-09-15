import { Order, OrderItem, PrintingConfig } from '../../types';
import { formatCurrency, parseCashAmount } from '../../utils/formatters';
import { EscPosBuilder, AccentMode } from './escpos';
import { LogoRaster } from './logoRaster';

export function colsForPaperWidth(paperWidth: 58 | 80): number {
  return paperWidth === 80 ? 48 : 32;
}

function printLogo(b: EscPosBuilder, logo: LogoRaster | null | undefined) {
  if (!logo) return;
  b.align('center').rasterImage(logo.widthBytes, logo.heightPx, logo.data).feed(1);
}

// Returns one builder per segment instead of a single combined one — the
// logo (when present) is its own segment so the caller can send it as a
// separate transport write with a cooldown pause after it. See the comment
// on printOrderOnPrinter in printService.ts for why: a raster image is by
// far the most current-hungry thing sent to a cheap Bluetooth thermal
// printer, and some underpowered units brown out mid-job without a recovery
// window between the image and whatever prints next.
export function buildTestReceipt(establishmentName: string, accentMode: AccentMode, cols: number, logo?: LogoRaster | null): EscPosBuilder[] {
  const segments: EscPosBuilder[] = [];
  if (logo) {
    const logoBuilder = new EscPosBuilder(accentMode);
    printLogo(logoBuilder, logo);
    segments.push(logoBuilder);
  }

  // The doubleSize+bold establishment name is its own segment (with a
  // cooldown before the rest, same as the logo) — a weak-power printer has
  // been seen browning out even on this short no-logo test print before,
  // and this large/bold line is the single heaviest burst left in it.
  const now = new Date();
  const header = new EscPosBuilder(accentMode);
  header.align('center').bold(true).doubleSize(true).line(establishmentName.toUpperCase() || 'ZUSHY');
  header.doubleSize(false).bold(false);
  header.line('Teste de Impressão');
  header.separator(cols);
  segments.push(header);

  const b = new EscPosBuilder(accentMode);
  b.align('left');
  b.line(`Data: ${now.toLocaleDateString('pt-BR')}`);
  b.line(`Hora: ${now.toLocaleTimeString('pt-BR')}`);
  b.newline();
  b.align('center').bold(true).line('Conexão OK').bold(false);
  b.newline();
  b.line('Amostra de acentos:');
  b.line('áàâãéêíóôõúüç ÁÀÂÃÉÊÍÓÔÕÚÜÇ');
  b.separator(cols);
  b.feed(3);
  b.cutPaper();
  segments.push(b);
  return segments;
}

const DELIVERY_METHOD_LABELS: Record<Order['deliveryMethod'], string> = {
  delivery: 'Delivery',
  pickup: 'Retirada no Local',
  dine_in: 'Consumo no Local'
};

// Every customization the kitchen actually needs to know about — this is
// deliberately the most detailed part of the receipt (Monte Seu Combinado's
// chosen flavors and Meio a Meio's two halves are otherwise invisible on a
// generic "2x Combo" line, and a wrong assembly means a redone order).
function printItemSpec(b: EscPosBuilder, item: OrderItem, config: PrintingConfig) {
  const unitPrice = item.product.promoPrice ?? item.product.price;
  const productTotal = unitPrice * item.quantity;
  b.bold(true).line(`${item.quantity}x ${item.product.name}`).bold(false);
  if (item.quantity > 1) {
    b.line(`  Unit.: R$ ${formatCurrency(unitPrice)}  |  Total: R$ ${formatCurrency(productTotal)}`);
  } else {
    b.line(`  Valor: R$ ${formatCurrency(unitPrice)}`);
  }

  if (item.comboFlavors && item.comboFlavors.length > 0) {
    b.line('  Sabores do Combinado:');
    item.comboFlavors.forEach(f => b.line(`    ${f.pieces}x ${f.flavorName}`));
  }

  if (item.halfAndHalf) {
    b.line(`  Meio a Meio: ${item.halfAndHalf.flavor1} / ${item.halfAndHalf.flavor2}`);
  }

  if (item.removedIngredients && item.removedIngredients.length > 0) {
    b.line(`  Sem: ${item.removedIngredients.join(', ')}`);
  }

  if (item.extras && item.extras.length > 0) {
    item.extras.forEach(ex => b.line(`  + ${ex.quantity}x ${ex.name} (R$ ${formatCurrency(ex.price * ex.quantity)})`));
  }

  if (item.hashiCount) {
    b.line(`  Hashi: ${item.hashiCount}`);
  }

  if (config.printObservacoes && item.notes) {
    b.line(`  Obs: ${item.notes}`);
  }

  b.newline();
}

// Cash needs the change ("troco") spelled out — without it, "Dinheiro" alone
// tells the kitchen/delivery nothing about how much change to bring.
function printPaymentSpec(b: EscPosBuilder, order: Order) {
  if (order.paymentMethod !== 'cash') {
    const labels: Record<string, string> = { pix: 'PIX', credit_card: 'Cartão', debit_card: 'Cartão' };
    b.bold(true).line(labels[order.paymentMethod] || order.paymentMethod).bold(false);
    return;
  }

  if (!order.needsChange) {
    b.bold(true).line('Dinheiro (Sem troco)').bold(false);
    return;
  }

  const noteVal = parseCashAmount(order.changeAmount || '');
  const changeVal = noteVal > order.total ? noteVal - order.total : 0;
  b.bold(true).line('Dinheiro').bold(false);
  if (noteVal > 0) b.line(`Cliente vai pagar com: R$ ${formatCurrency(noteVal)}`);
  if (changeVal > 0) b.bold(true).line(`Levar troco de: R$ ${formatCurrency(changeVal)}`).bold(false);
}

// How many items go in one write before a cooldown pause — same reasoning
// as splitting out the logo: a long run of bold item lines sent as a single
// uninterrupted write is itself enough sustained draw to brown out a weak
// printer's power supply partway through, independent of the logo. Chunking
// spreads that draw out with real recovery windows instead of one long burst.
const ITEMS_PER_SEGMENT = 5;

export function buildOrderReceipt(
  order: Order,
  orderCode: string,
  config: PrintingConfig,
  accentMode: AccentMode,
  cols: number,
  logo?: LogoRaster | null
): EscPosBuilder[] {
  const segments: EscPosBuilder[] = [];
  if (logo) {
    const logoBuilder = new EscPosBuilder(accentMode);
    printLogo(logoBuilder, logo);
    segments.push(logoBuilder);
  }

  // Header is its own segment (own cooldown before whatever comes next) —
  // this doubleSize+bold order code is the heaviest single burst left once
  // the logo is off, and a printer with a weak power supply has been
  // observed browning out even on a short, logo-free print before.
  const header = new EscPosBuilder(accentMode);
  header.align('center').bold(true).doubleSize(true).line(orderCode);
  header.doubleSize(false).bold(false);
  header.separator(cols);

  header.align('left');
  header.line('Cliente:');
  header.bold(true).line(order.customerName).bold(false);
  header.newline();
  header.line(`Entrega: ${DELIVERY_METHOD_LABELS[order.deliveryMethod]}`);

  if (config.printTelefone) {
    header.newline();
    header.line('Telefone:');
    header.line(order.customerPhone);
  }

  if (config.printEndereco && order.deliveryMethod === 'delivery' && order.customerAddress) {
    header.newline();
    header.line('Endereço:');
    header.line(order.customerAddress);
  }

  header.newline();
  header.separator(cols);
  segments.push(header);

  // Items, chunked so a long order also gets recovery pauses partway
  // through its list instead of only before/after it.
  for (let i = 0; i < order.items.length; i += ITEMS_PER_SEGMENT) {
    const chunk = order.items.slice(i, i + ITEMS_PER_SEGMENT);
    const itemsBuilder = new EscPosBuilder(accentMode);
    itemsBuilder.align('left');
    if (i === 0) {
      itemsBuilder.newline();
      itemsBuilder.bold(true).line(`ITENS (${order.items.reduce((s, it) => s + it.quantity, 0)})`).bold(false);
      itemsBuilder.newline();
    }
    chunk.forEach(item => printItemSpec(itemsBuilder, item, config));
    segments.push(itemsBuilder);
  }

  const footer = new EscPosBuilder(accentMode);
  footer.align('left');

  if (order.hashiCount || order.kitAutoIncluded) {
    footer.line('Kit Descartável:');
    if (order.hashiCount) footer.line(`  Hashi: ${order.hashiCount}`);
    if (order.kitAutoIncluded) {
      const k = order.kitAutoIncluded;
      if (k.shoyuSachets) footer.line(`  Shoyu: ${k.shoyuSachets}`);
      if (k.wasabiPortions) footer.line(`  Wasabi: ${k.wasabiPortions}`);
      if (k.gengibrePortions) footer.line(`  Gengibre: ${k.gengibrePortions}`);
      if (k.guardanapos) footer.line(`  Guardanapos: ${k.guardanapos}`);
    }
    footer.newline();
  }

  if (config.printObservacoes && order.notes) {
    footer.line('Observação Geral:');
    footer.line(order.notes);
    footer.newline();
  }

  footer.separator(cols);
  footer.newline();

  const subtotal = order.total + order.discountAmount - order.deliveryFee;
  const rightPad = (label: string, value: string) => {
    const spaces = Math.max(1, cols - label.length - value.length);
    return `${label}${' '.repeat(spaces)}${value}`;
  };
  footer.line(rightPad('Subtotal', `R$ ${formatCurrency(subtotal)}`));
  if (order.deliveryFee > 0) footer.line(rightPad('Taxa Entrega', `R$ ${formatCurrency(order.deliveryFee)}`));
  if (order.discountAmount > 0) {
    if (order.couponCode) footer.line(`Cupom: ${order.couponCode}`);
    footer.line(rightPad('Desconto', `-R$ ${formatCurrency(order.discountAmount)}`));
  }
  footer.bold(true).line(rightPad('TOTAL', `R$ ${formatCurrency(order.total)}`)).bold(false);

  if (config.printFormaPagamento) {
    footer.newline();
    footer.separator(cols);
    footer.newline();
    footer.line('Forma de Pagamento:');
    printPaymentSpec(footer, order);
  }

  footer.newline();
  footer.separator(cols);
  const created = new Date(order.createdAt);
  footer.line(`Data: ${created.toLocaleDateString('pt-BR')}`);
  footer.line(`Hora: ${created.toLocaleTimeString('pt-BR')}`);
  footer.separator(cols);

  footer.feed(3);
  if (config.autoCutPaper) footer.cutPaper();
  segments.push(footer);
  return segments;
}
