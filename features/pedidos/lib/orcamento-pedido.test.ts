import { describe, expect, it } from 'vitest';
import type { OrcamentoPedido } from '@/shared/types/models';
import {
  avaliarDeltaOrcamento,
  orcamentoExcedidoDetail,
  toneOrcamento,
} from './orcamento-pedido';

function makeOrcamento(overrides: Partial<OrcamentoPedido> = {}): OrcamentoPedido {
  return {
    nrPedido: 123,
    limiteAdicao: 10,
    consumidoAdicao: 0,
    restanteAdicao: 10,
    limiteCorte: 10,
    consumidoCorte: 0,
    restanteCorte: 10,
    ...overrides,
  };
}

describe('toneOrcamento', () => {
  it('default quando 0 de 10 usadas', () => {
    expect(toneOrcamento(0, 10)).toBe('default');
  });

  it('warning quando 8 de 10 usadas (limiar de 80%)', () => {
    expect(toneOrcamento(8, 10)).toBe('warning');
  });

  it('destructive quando 10 de 10 usadas', () => {
    expect(toneOrcamento(10, 10)).toBe('destructive');
  });

  it('destructive quando 0 de 0 usadas, sem divisão por zero', () => {
    expect(toneOrcamento(0, 0)).toBe('destructive');
  });
});

describe('avaliarDeltaOrcamento', () => {
  it('delta 0 não excede e tipo é nulo', () => {
    expect(avaliarDeltaOrcamento(makeOrcamento(), 0)).toEqual({ excede: false, tipo: null });
  });

  it('delta +3 com restanteAdicao 2 excede, tipo adicao', () => {
    const orcamento = makeOrcamento({ restanteAdicao: 2 });
    expect(avaliarDeltaOrcamento(orcamento, 3)).toEqual({ excede: true, tipo: 'adicao' });
  });

  it('delta +2 com restanteAdicao 2 não excede (teto exato cabe)', () => {
    const orcamento = makeOrcamento({ restanteAdicao: 2 });
    expect(avaliarDeltaOrcamento(orcamento, 2)).toEqual({ excede: false, tipo: 'adicao' });
  });

  it('delta -3 com restanteCorte 5 não excede, tipo corte', () => {
    const orcamento = makeOrcamento({ restanteCorte: 5 });
    expect(avaliarDeltaOrcamento(orcamento, -3)).toEqual({ excede: false, tipo: 'corte' });
  });

  it('delta -6 com restanteCorte 5 excede, tipo corte', () => {
    const orcamento = makeOrcamento({ restanteCorte: 5 });
    expect(avaliarDeltaOrcamento(orcamento, -6)).toEqual({ excede: true, tipo: 'corte' });
  });

  it('adição e corte nunca se compensam (D-08): sobra de corte não libera adição', () => {
    const orcamento = makeOrcamento({ restanteAdicao: 0, restanteCorte: 10 });
    expect(avaliarDeltaOrcamento(orcamento, 1)).toEqual({ excede: true, tipo: 'adicao' });
  });
});

describe('orcamentoExcedidoDetail', () => {
  it('erro 409 com corpo estruturado devolve o detail', () => {
    const detail = {
      code: 'orcamento_pedido_excedido',
      message: 'Restam 2 pç para adicionar.',
      nrPedido: 123,
      orcamento: 'adicao',
      restanteAdicao: 2,
      restanteCorte: 5,
    };
    const error = { status: 409, body: { detail } };
    expect(orcamentoExcedidoDetail(error)).toEqual(detail);
  });

  it('erro 409 com detail string (conflito de versão) devolve null', () => {
    const error = { status: 409, body: { detail: 'A grade mudou.' } };
    expect(orcamentoExcedidoDetail(error)).toBeNull();
  });

  it('erro 500 com o mesmo corpo devolve null', () => {
    const error = {
      status: 500,
      body: { detail: { code: 'orcamento_pedido_excedido', message: 'x' } },
    };
    expect(orcamentoExcedidoDetail(error)).toBeNull();
  });

  it('erro sem corpo devolve null', () => {
    expect(orcamentoExcedidoDetail({ status: 409 })).toBeNull();
  });

  it('erro com corpo não-objeto devolve null', () => {
    expect(orcamentoExcedidoDetail({ status: 409, body: 'texto' })).toBeNull();
  });

  it('erro com message vazia devolve null', () => {
    const error = {
      status: 409,
      body: { detail: { code: 'orcamento_pedido_excedido', message: '' } },
    };
    expect(orcamentoExcedidoDetail(error)).toBeNull();
  });

  it('valor que nem é erro devolve null, sem lançar', () => {
    expect(orcamentoExcedidoDetail(null)).toBeNull();
    expect(orcamentoExcedidoDetail('erro qualquer')).toBeNull();
  });
});
