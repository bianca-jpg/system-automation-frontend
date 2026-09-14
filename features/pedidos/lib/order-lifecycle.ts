import { Order } from '@/shared/types/models';

export const DAY_MS = 24 * 3600 * 1000;

// Núcleo da contagem regressiva da janela de 24h de edição (Estágio 2). Cada
// chamador formata a saída de um jeito diferente (badge vs. célula de tabela),
// por isso só a aritmética é compartilhada aqui.
export const getRemainingEditMs = (processedAt: number, now: number) => {
  return DAY_MS - (now - processedAt);
};

export const getRemainingHoursAndMinutes = (remainingMs: number) => {
  const hours = Math.floor(remainingMs / (3600 * 1000));
  const minutes = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));
  return { hours, minutes };
};

// Máquina de estados do faturamento (front-end). Ver comentário em Order
// (shared/types/models.ts). Os estágios são derivados dinamicamente de
// status + processedAt + aprovado + "now".

// Estágio 1 — Recebido: aguardando faturamento. Só os botões de OR agem; sem
// edição manual. Pedido 'Liberados para faturamento' que ainda não foi
// processado por nenhum botão.
export const isAwaitingFaturamento = (order: Order): boolean => {
  return order.status === 'Liberados para faturamento' && !order.processedAt && !order.aprovado;
};

// Estágio 2 — Em edição: processado por um botão de OR, dentro das 24h e ainda
// não aprovado. Único estágio em que a edição manual de grade é permitida.
export const isInEditWindow = (order: Order, now: number): boolean => {
  return !!order.processedAt && !order.aprovado && (now - order.processedAt) <= DAY_MS;
};

export const getFormattedRemainingTime = (order: Order, now: number): string => {
  if (!order.processedAt) return '';
  const remainingMs = getRemainingEditMs(order.processedAt, now);
  if (remainingMs <= 0) return 'Expirado (>24h)';

  const { hours, minutes } = getRemainingHoursAndMinutes(remainingMs);
  return `Restam ${hours}h ${minutes}m`;
};
