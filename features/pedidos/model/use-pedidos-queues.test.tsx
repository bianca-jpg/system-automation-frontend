import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchProductNumberedPage, type ProductProjection } from '@/features/pedidos/api/pedidos.api';
import { usePedidosQueues } from '@/features/pedidos/model/use-pedidos-queues';

const realtime = vi.hoisted(() => ({
  revisions: { orders: 0, alerts: 0, communications: 0, history: 0 },
  markTopicRead: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/realtime', () => ({
  useRealtime: () => ({
    topicRevisions: realtime.revisions,
    resyncGeneration: 0,
    markTopicRead: realtime.markTopicRead,
  }),
}));

vi.mock('@/features/pedidos/api/pedidos.api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/features/pedidos/api/pedidos.api')>();
  return { ...actual, fetchProductNumberedPage: vi.fn() };
});

const fetchProductPageMock = vi.mocked(fetchProductNumberedPage);

function editingProduct(remainingWindowMs: number): ProductProjection {
  return {
    code: 'EDIT-1',
    name: 'Produto no limite',
    channel: 'Franquia',
    totalQty: 1,
    totalValue: 100,
    originalTotalValue: 100,
    unitValue: 100,
    ordersCount: 1,
    stock: 10,
    sizes: { M: 1 },
    sizeKeys: ['M'],
    lastOrderAt: null,
    // Relógio do cliente propositalmente 1s adiantado em relação ao servidor.
    processedAt: Date.now() - 24 * 60 * 60 * 1000 - 1_000,
    remainingWindowMs,
    adequacaoAplicada: true,
  };
}

describe('usePedidosQueues', () => {
  beforeEach(() => {
    fetchProductPageMock.mockReset();
    realtime.markTopicRead.mockClear();
  });

  it('recarrega uma vez quando a janela mais próxima cruza o deadline', async () => {
    let editingReads = 0;
    fetchProductPageMock.mockImplementation(({ stage }) => {
      if (stage === 'aguardando') {
        return Promise.resolve({
          rows: [], total: 0, pageSize: 25, page: 1, totalPages: 1,
        });
      }
      editingReads += 1;
      return Promise.resolve({
        // A primeira releitura cai exatamente na borda e ainda devolve a row;
        // o hook precisa rearmar, não considerá-la concluída para sempre.
        rows: editingReads === 1
          ? [editingProduct(50)]
          : editingReads === 2
            ? [editingProduct(0)]
            : [],
        total: editingReads < 3 ? 1 : 0,
        pageSize: 25,
        page: 1,
        totalPages: 1,
      });
    });

    const { result } = renderHook(() => usePedidosQueues({
      enabled: true,
      channel: 'Franquia',
      awaitingSearch: '',
      editingSearch: '',
    }));
    await waitFor(() => expect(result.current.editing.rows).toHaveLength(1));

    await new Promise(resolve => window.setTimeout(resolve, 100));
    expect(editingReads).toBe(1);
    await waitFor(() => expect(editingReads).toBe(3), { timeout: 3_000 });
    await waitFor(() => expect(result.current.editing.rows).toHaveLength(0));
    expect(editingReads).toBe(3);
  });
});
