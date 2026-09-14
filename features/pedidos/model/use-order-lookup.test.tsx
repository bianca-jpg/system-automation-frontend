import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOrderLookup } from './use-order-lookup';
import { fetchOrderLookupPage } from '@/features/pedidos/api/pedidos.api';

const realtimeState = vi.hoisted(() => ({
  topicRevisions: { orders: 0, alerts: 0, communications: 0, history: 0 },
  resyncGeneration: 0,
}));

vi.mock('@/features/realtime', () => ({
  useRealtime: () => realtimeState,
}));

vi.mock('@/features/pedidos/api/pedidos.api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/features/pedidos/api/pedidos.api')>();
  return { ...actual, fetchOrderLookupPage: vi.fn() };
});

const fetchLookupMock = vi.mocked(fetchOrderLookupPage);

describe('useOrderLookup', () => {
  beforeEach(() => {
    fetchLookupMock.mockReset();
    realtimeState.topicRevisions.orders = 0;
    realtimeState.topicRevisions.history = 0;
    realtimeState.resyncGeneration = 0;
  });

  it('e lazy e trata busca vazia como consulta valida', async () => {
    fetchLookupMock.mockResolvedValue({
      rows: [{ id: 42, client: 'Loja Centro', canal: 'Franquia', status: 'Historico', motivo: null, value: 1200 }],
      total: 1,
      pageSize: 25,
      nextCursor: null,
      hasMore: false,
    });
    const { result, rerender } = renderHook(
      ({ enabled }) => useOrderLookup({ enabled, search: '', debounceMs: 0 }),
      { initialProps: { enabled: false } },
    );

    expect(fetchLookupMock).not.toHaveBeenCalled();
    rerender({ enabled: true });

    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(fetchLookupMock).toHaveBeenCalledWith(expect.objectContaining({ search: '', cursor: null }));
  });

  it('pagina por cursor e preserva as linhas ja carregadas', async () => {
    fetchLookupMock
      .mockResolvedValueOnce({
        rows: [{ id: 1, client: 'Primeira', canal: 'Franquia', status: 'Edicao', motivo: null, value: 10 }],
        total: 2,
        pageSize: 1,
        nextCursor: 'cursor-2',
        hasMore: true,
      })
      .mockResolvedValueOnce({
        rows: [{ id: 2, client: 'Segunda', canal: 'Multimarca', status: 'Historico', motivo: null, value: 20 }],
        total: 2,
        pageSize: 1,
        nextCursor: null,
        hasMore: false,
      });

    const { result } = renderHook(() => useOrderLookup({ enabled: true, search: 'loja', debounceMs: 0 }));
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    await act(async () => { await result.current.loadMore(); });

    expect(result.current.rows.map(row => row.id)).toEqual([1, 2]);
    expect(fetchLookupMock).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 'cursor-2' }));
  });

  it('coalesce uma revisão enquanto o lookup está aberto', async () => {
    fetchLookupMock.mockResolvedValue({
      rows: [{ id: 1, client: 'Atualizada', canal: 'Franquia', status: 'Edicao', motivo: null, value: 10 }],
      total: 1,
      pageSize: 25,
      nextCursor: null,
      hasMore: false,
    });
    const { rerender } = renderHook(
      ({ renderVersion }) => {
        void renderVersion;
        return useOrderLookup({ enabled: true, search: '', debounceMs: 0 });
      },
      { initialProps: { renderVersion: 0 } },
    );
    await waitFor(() => expect(fetchLookupMock).toHaveBeenCalledTimes(1));

    realtimeState.topicRevisions.orders = 1;
    rerender({ renderVersion: 1 });
    await waitFor(() => expect(fetchLookupMock).toHaveBeenCalledTimes(2));
  });

  it('encerra o spinner após falha inicial e permite retry explícito', async () => {
    fetchLookupMock
      .mockRejectedValueOnce(new Error('lookup indisponível'))
      .mockResolvedValueOnce({
        rows: [{ id: 7, client: 'Loja Recuperada', canal: 'Franquia', status: 'Edicao', motivo: null, value: 70 }],
        total: 1,
        pageSize: 25,
        nextCursor: null,
        hasMore: false,
      });

    const { result } = renderHook(() => useOrderLookup({ enabled: true, search: '', debounceMs: 0 }));
    await waitFor(() => expect(result.current.error).toBe('lookup indisponível'));
    expect(result.current.searching).toBe(false);
    expect(result.current.rows).toEqual([]);

    await act(async () => {
      await result.current.reload();
    });
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(result.current.searching).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
