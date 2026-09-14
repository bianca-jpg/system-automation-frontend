import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductClientsPage } from '@/features/pedidos/api/pedidos.api';
import { fetchProductClientsPage } from '@/features/pedidos/api/pedidos.api';
import { useProductClients } from '@/features/pedidos/model/use-product-clients';

const realtime = vi.hoisted(() => ({ resyncGeneration: 0 }));

vi.mock('@/features/realtime', () => ({
  useRealtime: () => ({ resyncGeneration: realtime.resyncGeneration }),
}));

vi.mock('@/features/pedidos/api/pedidos.api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/features/pedidos/api/pedidos.api')>();
  return { ...actual, fetchProductClientsPage: vi.fn() };
});

const fetchProductClientsPageMock = vi.mocked(fetchProductClientsPage);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(next => { resolve = next; });
  return { promise, resolve };
}

function page(version: string, quantity: number): ProductClientsPage {
  return {
    rows: [{
      order: {
        id: '#7',
        client: 'Loja Centro',
        value: quantity * 100,
        originalValueBeforeAdequacao: quantity * 100,
        status: 'OR com adequação',
        motivo: '',
        canal: 'Franquia',
        items: [],
        adequacaoAplicada: true,
        adequacaoValorAjustado: 0,
      },
      item: {
        code: 'COD-1',
        name: 'Produto',
        unitValue: 100,
        qty: quantity,
        cdStatus: 'Regular',
        sizes: { '36': quantity },
      },
      version,
    }],
    total: 1,
    pageSize: 25,
    nextCursor: null,
    hasMore: false,
    summary: {
      code: 'COD-1',
      name: 'Produto',
      channel: 'Franquia',
      totalClients: 1,
      totalQty: quantity,
      totalValue: quantity * 100,
      originalTotalValue: quantity * 100,
      stock: 20,
      sizeKeys: ['36'],
      sizeTotals: { '36': quantity },
    },
  };
}

describe('useProductClients', () => {
  beforeEach(() => {
    realtime.resyncGeneration = 0;
    fetchProductClientsPageMock.mockReset();
  });

  it('aceita novamente a versão autoritativa em resync no mesmo watermark', async () => {
    fetchProductClientsPageMock
      .mockResolvedValueOnce(page('opaque-v1', 2))
      .mockResolvedValueOnce(page('opaque-v2', 7));

    const { result, rerender } = renderHook(
      ({ revision }) => useProductClients({
        productCode: 'COD-1',
        stage: 'edicao',
        channel: 'Franquia',
        revision,
      }),
      { initialProps: { revision: 5 } },
    );

    await waitFor(() => expect(result.current.acceptedRevision).toBe(5));
    expect(result.current.acceptedResyncGeneration).toBe(0);
    expect(result.current.rows[0]?.version).toBe('opaque-v1');
    expect(fetchProductClientsPageMock).toHaveBeenLastCalledWith(expect.objectContaining({
      productCode: 'COD-1',
      channel: 'Franquia',
    }));

    realtime.resyncGeneration = 1;
    rerender({ revision: 5 });

    await waitFor(() => expect(result.current.acceptedResyncGeneration).toBe(1));
    expect(result.current.acceptedRevision).toBe(5);
    expect(result.current.rows[0]?.version).toBe('opaque-v2');
    expect(fetchProductClientsPageMock).toHaveBeenCalledTimes(2);
  });

  it('serializa confirmação manual pós-write com evento realtime concorrente', async () => {
    const manualPage = deferred<ProductClientsPage>();
    const finalPage = deferred<ProductClientsPage>();
    fetchProductClientsPageMock
      .mockResolvedValueOnce(page('opaque-v1', 2))
      .mockReturnValueOnce(manualPage.promise)
      .mockReturnValueOnce(finalPage.promise);
    const { result, rerender } = renderHook(
      ({ revision }) => useProductClients({
        productCode: 'COD-1',
        stage: 'edicao',
        channel: 'Franquia',
        revision,
      }),
      { initialProps: { revision: 5 } },
    );
    await waitFor(() => expect(result.current.rows[0]?.version).toBe('opaque-v1'));

    let manualResult!: Promise<boolean>;
    act(() => { manualResult = result.current.reload(); });
    await waitFor(() => expect(fetchProductClientsPageMock).toHaveBeenCalledTimes(2));
    rerender({ revision: 6 });
    expect(fetchProductClientsPageMock).toHaveBeenCalledTimes(2);

    await act(async () => { manualPage.resolve(page('opaque-v2', 3)); });
    await waitFor(() => expect(fetchProductClientsPageMock).toHaveBeenCalledTimes(3));
    await act(async () => { finalPage.resolve(page('opaque-v3', 4)); });
    await expect(manualResult).resolves.toBe(true);
    await waitFor(() => expect(result.current.rows[0]?.version).toBe('opaque-v3'));
    expect(result.current.acceptedRevision).toBe(6);
  });
});
