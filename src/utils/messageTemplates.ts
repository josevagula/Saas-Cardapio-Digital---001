import { MessageTemplates, VisualConfig } from '../types';

// Default texts — used for any template the establishment hasn't edited
// (or has cleared back to blank). Placeholders in {chaves} are filled by
// fillMessageTemplate.
export const DEFAULT_MESSAGE_TEMPLATES: MessageTemplates = {
  customerContact: 'Olá {nome}! Temos novidades deliciosas de sushi no {restaurante}.',
  orderReceived: 'Olá, *{nome}*! Seu pedido *{pedido}* na *{restaurante}* foi atualizado:\n\n✅ *Pedido Confirmado!* Já recebemos a sua solicitação no sistema e estamos analisando.',
  orderPreparing: 'Olá, *{nome}*! Seu pedido *{pedido}* na *{restaurante}* foi atualizado:\n\n👨‍🍳 *Em Preparação!* O chefe já está montando o seu pedido com muito capricho.',
  orderDispatched: 'Olá, *{nome}*! Seu pedido *{pedido}* na *{restaurante}* foi atualizado:\n\n🛵 *Saiu para entrega!* Nosso entregador já está a caminho com seu pedido quentinho.',
  orderDelivered: 'Olá, *{nome}*! Seu pedido *{pedido}* na *{restaurante}* foi atualizado:\n\n🎉 *Entregue!* Esperamos que aproveite a refeição. Muito obrigado pela preferência!',
  orderCancelled: 'Olá, *{nome}*! Seu pedido *{pedido}* na *{restaurante}* foi atualizado:\n\n❌ *Pedido Cancelado.* Seu pedido foi cancelado. Qualquer dúvida, fale com a gente.'
};

export const getMessageTemplates = (config: VisualConfig): MessageTemplates => {
  const saved = config.messageTemplates ?? {};
  const result = { ...DEFAULT_MESSAGE_TEMPLATES };
  (Object.keys(result) as (keyof MessageTemplates)[]).forEach(key => {
    const value = saved[key];
    if (typeof value === 'string' && value.trim()) result[key] = value;
  });
  return result;
};

// Replaces {nome}, {restaurante}, {pedido}... — unknown placeholders are
// left as typed so a typo is visible in the preview instead of vanishing.
export const fillMessageTemplate = (template: string, vars: Record<string, string>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? vars[key] : match));
