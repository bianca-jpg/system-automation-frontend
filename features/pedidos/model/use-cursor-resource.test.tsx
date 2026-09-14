import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CursorPage } from '@/features/pedidos/api/pagination';
import { useCursorResource } from '@/features/pedidos/model/use-cursor-resource';

interface Row { id: string }

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const page = (id: string): CursorPage<Row> => ({
  rows: [{ id }],
  total: 1,
  pageSize: 25,
  nextCursor: null,
  hasMore: false,
});
const rowKey = (row: Row) => row.id;

describe('useCursorResource', () => {
  it('aborta a anterior e deixa somente a resposta mais recente escrever', async () => {
    const first = deferred<CursorPage<Row>>();
    const second = deferred<CursorPage<Row>>();
    const fetchPage = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { result, rerender } = renderHook(
      ({ queryKey }) => useCursorResource({
        enabled: true,
        queryKey,
        fetchPage,
        getRowKey: rowKey,
      }),
      { initialProps: { queryKey: 'a' } },
    );

    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(1));
    rerender({ queryKey: 'b' });
    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(2));

    await act(async () => { second.resolve(page('novo')); });
    await waitFor(() => expect(result.current.rows).toEqual([{ id: 'novo' }]));
    await act(async () => { first.resolve(page('antigo')); });

    expect(result.current.rows).toEqual([{ id: 'novo' }]);
    expect(fetchPage.mock.calls[0]?.[1].aborted).toBe(true);
  });

  it('preserva o último dado válido quando um refresh falha', async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(page('válido'))
      .mockRejectedValueOnce(new Error('backend indisponível'));

    const { result } = renderHook(
      () => useCursorResource({
        enabled: true,
        queryKey: 'a',
        fetchPage,
        getRowKey: rowKey,
      }),
    );

    await waitFor(() => expect(result.current.rows).toEqual([{ id: 'válido' }]));
    await act(async () => { await result.current.reload(); });
    await waitFor(() => expect(result.current.error).toBe('backend indisponível'));

    expect(result.current.rows).toEqual([{ id: 'válido' }]);
  });

  it('limpa linhas de outra chave enquanto a consulta nova está pendente', async () => {
    const next = deferred<CursorPage<Row>>();
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(page('canal-a'))
      .mockReturnValueOnce(next.promise);
    const { result, rerender } = renderHook(
      ({ queryKey }) => useCursorResource({
        enabled: true,
        queryKey,
        fetchPage,
        getRowKey: rowKey,
      }),
      { initialProps: { queryKey: 'a' } },
    );
    await waitFor(() => expect(result.current.rows).toEqual([{ id: 'canal-a' }]));

    rerender({ queryKey: 'b' });
    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(2));
    expect(result.current.rows).toEqual([]);
    expect(result.current.loading).toBe(true);

    await act(async () => { next.resolve(page('canal-b')); });
    await waitFor(() => expect(result.current.rows).toEqual([{ id: 'canal-b' }]));
  });

  it('refaz toda a janela já carregada sem voltar à primeira página', async () => {
    const firstPage = (id: string): CursorPage<Row> => ({
      rows: [{ id }], total: 2, pageSize: 1, nextCursor: 'c2', hasMore: true,
    });
    const secondPage = (id: string): CursorPage<Row> => ({
      rows: [{ id }], total: 2, pageSize: 1, nextCursor: null, hasMore: false,
    });
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(firstPage('um'))
      .mockResolvedValueOnce(secondPage('dois'))
      .mockResolvedValueOnce(firstPage('um-atualizado'))
      .mockResolvedValueOnce(secondPage('dois-atualizado'));
    const { result } = renderHook(() => useCursorResource({
      enabled: true,
      queryKey: 'a',
      fetchPage,
      getRowKey: rowKey,
    }));
    await waitFor(() => expect(result.current.rows).toEqual([{ id: 'um' }]));
    await act(async () => { await result.current.loadMore(); });
    expect(result.current.rows).toEqual([{ id: 'um' }, { id: 'dois' }]);

    await act(async () => { await result.current.reload(); });
    expect(result.current.rows).toEqual([
      { id: 'um-atualizado' },
      { id: 'dois-atualizado' },
    ]);
    expect(fetchPage.mock.calls.map(call => call[0])).toEqual([null, 'c2', null, 'c2']);
  });
});
