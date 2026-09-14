import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  approveProduct,
  fetchAdequacaoJob,
  fetchOrderLookupPage,
  fetchProductPage,
  submitAdequacaoJob,
  updateProductGrades,
} from '@/features/pedidos/api/pedidos.api';
import { apiFetch } from '@/lib/api/http-client';

vi.mock('@/lib/api/http-client', () => ({ apiFetch: vi.fn() }));

const apiFetchMock = vi.mocked(apiFetch);

beforeEach(() => {
  apiFetchMock.mockReset();
});

describe('processamento durável de OR', () => {
  const jobId = '550e8400-e29b-41d4-a716-446655440000';

  it('submete mode/channel com chave obrigatória e consulta o UUID retornado', async () => {
    apiFetchMock
      .mockResolvedValueOnce({
        jobId,
        status: 'queued',
        replayed: false,
        coalesced: false,
        statusUrl: `/api/v1/pedidos/processamentos/${jobId}`,
        progressCurrent: 0,
        progressTotal: null,
      })
      .mockResolvedValueOnce({ jobId, status: 'running' });

    await submitAdequacaoJob('adequar', 'Multimarca', 'job-attempt:12345678');
    await fetchAdequacaoJob(jobId);

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, '/api/v1/pedidos/processamentos', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'job-attempt:12345678' },
      body: JSON.stringify({ mode: 'adequar', channel: 'Multimarca' }),
      signal: undefined,
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      2,
      `/api/v1/pedidos/processamentos/${jobId}`,
      { signal: undefined },
    );
  });

  it('rejeita chave e jobId fora do contrato antes da rede', async () => {
    await expect(submitAdequacaoJob('sem_adequar', 'Todos', 'curta')).rejects
      .toThrow(/8 a 128 caracteres ASCII seguros/i);
    await expect(submitAdequacaoJob('sem_adequar', 'Todos', 'abcdefgh\n')).rejects
      .toThrow(/8 a 128 caracteres ASCII seguros/i);
    await expect(fetchAdequacaoJob('../outro')).rejects
      .toThrow(/Identificador de processamento inválido/i);
    expect(apiFetchMock).not.toHaveBeenCalled();
  });
});

describe('contratos bounded por produto', () => {
  it('preserva valores financeiros negativos no histórico sem clamp local', async () => {
    apiFetchMock.mockResolvedValueOnce({
      rows: [{
        code: 'DEV-1',
        name: 'Devolução',
        channel: 'Multimarca',
        totalQty: 1,
        totalValue: -250,
        originalTotalValue: -300,
        unitValue: -250,
        ordersCount: 1,
        stock: 0,
        sizes: { '40': 1 },
        sizeKeys: ['40'],
        lastOrderAt: null,
        processedAt: 1,
        remainingWindowMs: null,
        adequacaoAplicada: false,
      }],
      total: 1,
      pageSize: 25,
      nextCursor: null,
      hasMore: false,
    });

    const page = await fetchProductPage({
      stage: 'historico',
      channel: 'Todos',
      status: 'Todos',
      search: '',
      sort: 'totalValue',
      order: 'asc',
    });

    expect(page.rows[0]).toMatchObject({
      totalValue: -250,
      originalTotalValue: -300,
      unitValue: -250,
      remainingWindowDeadlineAt: null,
    });
  });

  it('preserva valor assinado no lookup de pedidos', async () => {
    apiFetchMock.mockResolvedValueOnce({
      rows: [{
        id: 91,
        client: 'Loja Devolução',
        canal: 'Franquia',
        status: 'Histórico',
        motivo: null,
        value: -99.9,
      }],
      total: 1,
      pageSize: 25,
      nextCursor: null,
      hasMore: false,
    });

    const page = await fetchOrderLookupPage({ search: '91' });
    expect(page.rows[0]?.value).toBe(-99.9);
  });

  it('mantém aprovação e grade restritas ao canal autoritativo da linha', async () => {
    apiFetchMock
      .mockResolvedValueOnce({
        status: 'approved',
        matchedCount: 1,
        approvedCount: 1,
        alreadyApprovedCount: 0,
        expiredCount: 0,
      })
      .mockResolvedValueOnce({
        status: 'updated',
        updatedCount: 1,
        totalQty: 3,
        totalValue: 300,
      });

    await approveProduct('COD DUPLO', 'Multimarca');
    await updateProductGrades('COD DUPLO', 'Franquia', [{
      orderId: 7,
      expectedVersion: 'opaque-v1',
      expectedTotalQty: 3,
      sizes: { ' 36 ': 1, '37': 2 },
    }]);

    expect(apiFetchMock.mock.calls[0]?.[0]).toContain('productCode=COD+DUPLO');
    expect(apiFetchMock.mock.calls[0]?.[0]).toContain('channel=Multimarca');
    expect(apiFetchMock.mock.calls[1]?.[0]).toContain('channel=Franquia');
    expect(JSON.parse(String(apiFetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      changes: [{
        orderId: 7,
        expectedVersion: 'opaque-v1',
        sizes: { '36': 1, '37': 2 },
      }],
    });
  });

  it('rejeita grades fora dos limites antes de consumir a API', async () => {
    await expect(updateProductGrades('COD-1', 'Franquia', [{
      orderId: 7,
      expectedVersion: 'opaque-v1',
      expectedTotalQty: 1_000_001,
      sizes: { M: 1_000_001 },
    }])).rejects.toThrow(/Quantidade inválida/i);

    await expect(updateProductGrades(
      'COD-1',
      'Franquia',
      Array.from({ length: 101 }, (_, index) => ({
        orderId: index + 1,
        expectedVersion: `opaque-v${index + 1}`,
        expectedTotalQty: 1,
        sizes: { M: 1 },
      })),
    )).rejects.toThrow(/1 a 100 clientes/i);

    await expect(updateProductGrades('COD-1', 'Franquia', [{
      orderId: 7,
      expectedVersion: 'opaque-v1',
      expectedTotalQty: 2,
      sizes: { M: 3 },
    }])).rejects.toThrow(/deve permanecer em 2 peça/i);
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it('libera variação de total quando expectedTotalQty é null ("sem adequação"), mas continua barrando grade zerada', async () => {
    apiFetchMock.mockResolvedValueOnce({
      status: 'updated',
      updatedCount: 1,
      totalQty: 8,
      totalValue: 800,
    });

    await updateProductGrades('COD-1', 'Franquia', [{
      orderId: 7,
      expectedVersion: 'opaque-v1',
      expectedTotalQty: null,
      sizes: { M: 3, G: 5 },
    }]);

    expect(JSON.parse(String(apiFetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      changes: [{
        orderId: 7,
        expectedVersion: 'opaque-v1',
        sizes: { M: 3, G: 5 },
      }],
    });

    await expect(updateProductGrades('COD-1', 'Franquia', [{
      orderId: 7,
      expectedVersion: 'opaque-v1',
      expectedTotalQty: null,
      sizes: { M: 0 },
    }])).rejects.toThrow(/não pode ficar totalmente zerada|zerar toda a grade/i);
  });
});
