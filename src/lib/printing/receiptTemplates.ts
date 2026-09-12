import { Order, OrderItem, PrintingConfig } from '../../types';
import { formatCurrency, parseCashAmount } from '../../utils/formatters';
import { EscPosBuilder, AccentMode } from './escpos';

export function colsForPaperWidth(paperWidth: 58 | 80): number {
  return paperWidth === 80 ? 48 : 32;
}

export function buildTestReceipt(establishmentName: string, accentMode: AccentMode, cols: number): EscPosBuilder {
  const now = new Date();
  const b = new EscPosBuilder(accentMode);
  b.align('center').bold(true).doubleSize(true).line(establishmentName.toUpperCase() || 'ZUSHY');
  b.doubleSize(false).bold(false);
  b.line('Teste de Impressão');
  b.separator(cols);
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
  return b;
}

const DELIVERY_METHOD_LABELS: Record<Order['deliveryMethod'], string> = {
  delivery: 'Delivery',
  pickup: 'Retirada no Balcão',
  dine_in: 'Consumo no Local'
};

function lineItemTotal(item: OrderItem): number {
  const unit = item.product.promoPrice ?? item.product.price;
  const extrasTotal = (item.extras || []).reduce((s, ex) => s + ex.price * ex.quantity, 0);
  return unit * item.quantity + extrasTotal;
}

// Every customization the kitchen actually needs to know about — this is
// deliberately the most detailed part of the receipt (Monte Seu Combinado's
// chosen flavors and Meio a Meio's two halves are otherwise invisible on a
// generic "2x Combo" line, and a wrong assembly means a redone order).
function printItemSpec(b: EscPosBuilder, item: OrderItem, config: PrintingConfig) {
  const unitPrice = item.product.promoPrice ?? item.product.price;
  const total = lineItemTotal(item);
  b.bold(true).line(`${item.quantity}x ${item.product.name}`).bold(false);
  if (item.quantity > 1) {
    b.line(`  Unit.: R$ ${formatCurrency(unitPrice)}  |  Total: R$ ${formatCurrency(total)}`);
  } else {
    b.line(`  Valor: R$ ${formatCurrency(total)}`);
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
    const labels: Record<string, string> = { pix: 'PIX', credit_card: 'Cartão de Crédito', debit_card: 'Cartão de Débito' };
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

export function buildOrderReceipt(
  order: Order,
  orderCode: string,
  config: PrintingConfig,
  accentMode: AccentMode,
  cols: number
): EscPosBuilder {
  const b = new EscPosBuilder(accentMode);

  b.align('center').bold(true).doubleSize(true).line(orderCode);
  b.doubleSize(false).bold(false);
  b.separator(cols);

  b.align('left');
  b.line('Cliente:');
  b.bold(true).line(order.customerName).bold(false);
  b.newline();
  b.line(`Tipo: ${DELIVERY_METHOD_LABELS[order.deliveryMethod]}`);

  if (config.printTelefone) {
    b.newline();
    b.line('Telefone:');
    b.line(order.customerPhone);
  }

  if (config.printEndereco && order.deliveryMethod === 'delivery' && order.customerAddress) {
    b.newline();
    b.line('Endereço:');
    b.line(order.customerAddress);
  }

  b.newline();
  b.separator(cols);
  b.newline();
  b.bold(true).line(`ITENS (${order.items.reduce((s, i) => s + i.quantity, 0)})`).bold(false);
  b.newline();

  order.items.forEach(item => printItemSpec(b, item, config));

  if (order.hashiCount || order.kitAutoIncluded) {
    b.line('Kit Descartável:');
    if (order.hashiCount) b.line(`  Hashi: ${order.hashiCount}`);
    if (order.kitAutoIncluded) {
      const k = order.kitAutoIncluded;
      if (k.shoyuSachets) b.line(`  Shoyu: ${k.shoyuSachets}`);
      if (k.wasabiPortions) b.line(`  Wasabi: ${k.wasabiPortions}`);
      if (k.gengibrePortions) b.line(`  Gengibre: ${k.gengibrePortions}`);
      if (k.guardanapos) b.line(`  Guardanapos: ${k.guardanapos}`);
    }
    b.newline();
  }

  if (config.printObservacoes && order.notes) {
    b.line('Observação Geral:');
    b.line(order.notes);
    b.newline();
  }

  b.separator(cols);
  b.newline();

  const subtotal = order.total + order.discountAmount - order.deliveryFee;
  const rightPad = (label: string, value: string) => {
    const spaces = Math.max(1, cols - label.length - value.length);
    return `${label}${' '.repeat(spaces)}${value}`;
  };
  b.line(rightPad('Subtotal', `R$ ${formatCurrency(subtotal)}`));
  if (order.deliveryFee > 0) b.line(rightPad('Taxa Entrega', `R$ ${formatCurrency(order.deliveryFee)}`));
  if (order.discountAmount > 0) {
    if (order.couponCode) b.line(`Cupom: ${order.couponCode}`);
    b.line(rightPad('Desconto', `-R$ ${formatCurrency(order.discountAmount)}`));
  }
  b.bold(true).line(rightPad('TOTAL', `R$ ${formatCurrency(order.total)}`)).bold(false);

  if (config.printFormaPagamento) {
    b.newline();
    b.separator(cols);
    b.newline();
    b.line('Forma de Pagamento:');
    printPaymentSpec(b, order);
  }

  b.newline();
  b.separator(cols);
  const created = new Date(order.createdAt);
  b.line(`Data: ${created.toLocaleDateString('pt-BR')}`);
  b.line(`Hora: ${created.toLocaleTimeString('pt-BR')}`);
  b.separator(cols);

  b.feed(3);
  if (config.autoCutPaper) b.cutPaper();
  return b;
}
