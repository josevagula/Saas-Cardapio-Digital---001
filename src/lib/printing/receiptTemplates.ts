import { Order, PrintingConfig } from '../../types';
import { formatCurrency } from '../../utils/formatters';
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

function paymentLabel(order: Order): string {
  const labels: Record<string, string> = {
    pix: 'PIX',
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
    cash: 'Dinheiro'
  };
  return labels[order.paymentMethod] || order.paymentMethod;
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
  b.bold(true).line('ITENS').bold(false);
  b.newline();

  order.items.forEach(item => {
    b.line(`${item.quantity}x ${item.product.name}`);
    if (item.removedIngredients && item.removedIngredients.length > 0) {
      b.line(`  Sem: ${item.removedIngredients.join(', ')}`);
    }
    if (item.extras && item.extras.length > 0) {
      item.extras.forEach(ex => b.line(`  + ${ex.quantity}x ${ex.name}`));
    }
    if (config.printObservacoes && item.notes) {
      b.line(`  Obs: ${item.notes}`);
    }
    b.newline();
  });

  if (config.printObservacoes && order.notes) {
    b.line('Observação:');
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
  if (order.discountAmount > 0) b.line(rightPad('Desconto', `-R$ ${formatCurrency(order.discountAmount)}`));
  b.bold(true).line(rightPad('TOTAL', `R$ ${formatCurrency(order.total)}`)).bold(false);

  if (config.printFormaPagamento) {
    b.newline();
    b.separator(cols);
    b.newline();
    b.line('Forma de Pagamento');
    b.bold(true).line(paymentLabel(order)).bold(false);
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
