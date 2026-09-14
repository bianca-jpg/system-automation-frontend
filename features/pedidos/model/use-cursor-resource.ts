"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_CURSOR_PAGE_SIZE,
  type CursorPage,
} from '@/features/pedidos/api/pagination';

interface CursorResourceState<T> extends CursorPage<T> {
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  error: string | null;
  loadedOnce: boolean;
}

interface UseCursorResourceOptions<
  T,
  TPage extends CursorPage<T> = CursorPage<T>,
> {
  enabled: boolean;
  queryKey: string;
  fetchPage: (cursor: string | null, signal: AbortSignal) => Promise<TPage>;
  getRowKey: (row: T) => string;
  onPageAccepted?: (page: TPage, append: boolean) => void;
}

const EMPTY_PAGE: CursorResourceState<never> = {
  rows: [],
  total: 0,
  pageSize: DEFAULT_CURSOR_PAGE_SIZE,
  nextCursor: null,
  hasMore: false,
  loading: false,
  loadingMore: false,
  refreshing: false,
  error: null,
  loadedOnce: false,
};

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Não foi possível carregar os dados.';
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function mergeUnique<T>(
  current: T[],
  incoming: T[],
  getRowKey: (row: T) => string,
): T[] {
  const seen = new Set(current.map(getRowKey));
  const merged = [...current];
  for (const row of incoming) {
    const key = getRowKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }
  return merged;
}

/**
 * Estado de um endpoint keyset/cursor. Requisições antigas são abortadas e,
 * mesmo se o transporte ignorar o abort, somente a resposta com o maior id
 * pode escrever no estado. Reloads preservam as linhas válidas já exibidas.
 */
export function useCursorResource<
  T,
  TPage extends CursorPage<T> = CursorPage<T>,
>({
  enabled,
  queryKey,
  fetchPage,
  getRowKey,
  onPageAccepted,
}: UseCursorResourceOptions<T, TPage>) {
  const [state, setState] = useState<CursorResourceState<T>>(() => ({
    ...EMPTY_PAGE,
    rows: [] as T[],
    loading: enabled,
  }));
  const stateRef = useRef(state);
  stateRef.current = state;

  const requestRef = useRef<{ id: number; controller: AbortController } | null>(null);
  const nextRequestId = useRef(0);
  const mountedRef = useRef(true);
  const activeQueryKeyRef = useRef(queryKey);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current?.controller.abort();
    };
  }, []);

  const request = useCallback(async (
    mode: 'replace' | 'append' | 'refresh',
  ): Promise<boolean> => {
    if (!enabled) return false;

    const current = stateRef.current;
    if (
      mode === 'append'
      && (current.loading || current.loadingMore || current.refreshing || !current.hasMore)
    ) {
      return false;
    }

    requestRef.current?.controller.abort();
    const controller = new AbortController();
    const id = ++nextRequestId.current;
    requestRef.current = { id, controller };

    setState((previous) => ({
      ...previous,
      loading: mode === 'replace' && !previous.loadedOnce,
      loadingMore: mode === 'append',
      refreshing: mode === 'refresh' || (mode === 'replace' && previous.loadedOnce),
      error: null,
    }));

    try {
      let page: TPage;
      let rows: T[];

      if (mode === 'refresh') {
        const pagesToRefresh = Math.max(
          1,
          Math.ceil(current.rows.length / Math.max(1, current.pageSize)),
        );
        let cursor: string | null = null;
        let lastPage: TPage | null = null;
        let refreshedRows: T[] = [];

        for (let pageIndex = 0; pageIndex < pagesToRefresh; pageIndex += 1) {
          const nextPage = await fetchPage(cursor, controller.signal);
          refreshedRows = mergeUnique(refreshedRows, nextPage.rows, getRowKey);
          lastPage = nextPage;
          cursor = nextPage.nextCursor;
          if (!nextPage.hasMore || !cursor) break;
        }
        if (!lastPage) return false;
        page = lastPage;
        rows = refreshedRows;
      } else {
        const cursor = mode === 'append' ? current.nextCursor : null;
        page = await fetchPage(cursor, controller.signal);
        rows = mode === 'append'
          ? mergeUnique(current.rows, page.rows, getRowKey)
          : page.rows;
      }

      if (!mountedRef.current || requestRef.current?.id !== id) return false;

      setState(() => ({
        ...page,
        rows,
        loading: false,
        loadingMore: false,
        refreshing: false,
        error: null,
        loadedOnce: true,
      }));
      onPageAccepted?.(page, mode === 'append');
      return true;
    } catch (error) {
      if (!mountedRef.current || requestRef.current?.id !== id || isAbort(error)) {
        return false;
      }
      setState((previous) => ({
        ...previous,
        loading: false,
        loadingMore: false,
        refreshing: false,
        error: errorMessage(error),
      }));
      return false;
    }
  }, [enabled, fetchPage, getRowKey, onPageAccepted]);

  const reload = useCallback(
    () => request(stateRef.current.loadedOnce ? 'refresh' : 'replace'),
    [request],
  );
  const loadMore = useCallback(() => request('append'), [request]);

  // A chave inclui todos os filtros vinculados ao cursor. Trocar qualquer um
  // invalida o cursor anterior e inicia uma página 1 nova.
  useEffect(() => {
    if (!enabled) {
      requestRef.current?.controller.abort();
      return;
    }
    const queryChanged = activeQueryKeyRef.current !== queryKey;
    activeQueryKeyRef.current = queryKey;
    if (queryChanged) {
      // Dados de outro canal/filtro não são "last-good" para esta chave: além
      // de enganarem visualmente, poderiam permanecer para sempre se a nova
      // consulta falhasse. Last-good vale apenas para refresh da mesma chave.
      setState({
        ...EMPTY_PAGE,
        rows: [] as T[],
        loading: true,
      });
    }
    void request(queryChanged ? 'replace' : (stateRef.current.loadedOnce ? 'refresh' : 'replace'));
  }, [enabled, queryKey, request]);

  const setRows = useCallback((updater: React.SetStateAction<T[]>) => {
    setState((previous) => ({
      ...previous,
      rows: typeof updater === 'function'
        ? (updater as (rows: T[]) => T[])(previous.rows)
        : updater,
    }));
  }, []);

  return { ...state, reload, loadMore, setRows };
}
