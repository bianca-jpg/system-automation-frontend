import type { OrcamentoPedido } from '@/shared/types/models';

export type OrcamentoTone = 'default' | 'warning' | 'destructive';

// Tom do medidor de orçamento. `destructive` cobre tanto o limite esgotado
// quanto o pedido pequeno demais para ter folga (limite 0) — 0 >= 0 já cai em
// destructive, sem ramo especial para divisão por zero.
export function toneOrcamento(consumido: number, limite: number): OrcamentoTone {
  if (limite <= 0 || consumido >= limite) return 'destructive';
  if (consumido >= limite * 0.8) return 'warning';
  return 'default';
}

export interface AvaliacaoDeltaOrcamento {
  excede: boolean;
  tipo: 'adicao' | 'corte' | null;
}

// Feedback client-side (D-16): adição e corte nunca se compensam (D-08), o
// teto exato cabe (excede é estritamente maior que o restante), e delta 0
// nunca excede. O backend permanece a fonte de verdade.
export function avaliarDeltaOrcamento(
  orcamento: OrcamentoPedido,
  delta: number,
): AvaliacaoDeltaOrcamento {
  if (delta === 0) return { excede: false, tipo: null };
  if (delta > 0) {
    return { excede: delta > orcamento.restanteAdicao, tipo: 'adicao' };
  }
  return { excede: Math.abs(delta) > orcamento.restanteCorte, tipo: 'corte' };
}

export interface OrcamentoExcedidoDetail {
  code: string;
  message: string;
  nrPedido: number;
  orcamento: 'adicao' | 'corte';
  restanteAdicao: number;
  restanteCorte: number;
}

const ORCAMENTO_EXCEDIDO_CODE = 'orcamento_pedido_excedido';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Narrowing estrutural sobre `status`/`body` — sem importar `ApiRequestError`,
// para a função continuar testável com objetos literais. Reconhece só o 409
// estruturado de orçamento excedido (D-16); qualquer outra coisa (409 de
// conflito de versão com `detail` string, outro status, erro sem corpo,
// valor que nem é erro) devolve `null` sem lançar.
export function orcamentoExcedidoDetail(error: unknown): OrcamentoExcedidoDetail | null {
  if (!isRecord(error) || error.status !== 409) return null;
  const body = (error as { body?: unknown }).body;
  if (!isRecord(body)) return null;
  const detail = body.detail;
  if (!isRecord(detail)) return null;
  if (detail.code !== ORCAMENTO_EXCEDIDO_CODE) return null;
  if (typeof detail.message !== 'string' || detail.message.length === 0) return null;
  return detail as unknown as OrcamentoExcedidoDetail;
}
