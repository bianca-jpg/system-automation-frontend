"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NumberedPage } from '@/shared/types/numbered-page';

interface PagedResourceState<T> extends NumberedPage<T> {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  loadedOnce: boolean;
}

interface UsePagedResourceOptions<T> {
  enabled?: boolean;
  queryKey: string;
  fetchPage: (page: number, signal: AbortSignal) => Promise<NumberedPage<T>>;
}

const DEFAULT_PAGE_SIZE = 25;

const EMPTY_PAGE: PagedResourceState<never> = {
  rows: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  totalPages: 1,
  loading: false,
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

/**
 * Estado de um endpoint paginado por NÚMERO de página (`?page=`).
 *
 * É o hook compartilhado de paginação por número de página: alimenta tanto as
 * filas de pedidos (aguardando/edição/histórico) quanto as telas
 * administrativas (parâmetros, usuários). É o irmão de `useCursorResource` e
 * mantém DE PROPÓSITO o mesmo contrato de retorno — `reload(): Promise<boolean>`,
 * `loadedOnce`, `refreshing`, `error`, `setRows` — trocando `loadMore`/`hasMore`
 * por `page`/`totalPages`/`setPage`. É isso que permite `useRealtimeResourceRefresh`
 * e o efeito de deadline da janela de 24h continuarem funcionando sem alteração
 * nenhuma.
 *
 * A diferença que importa para a tela: aqui a página SUBSTITUI as linhas em vez
 * de acumular. É a razão da troca — o cursor mantinha 25×N linhas em memória e
 * no DOM, e era isso que pesava com muitos dados.
 *
 * Requisições antigas são abortadas e, mesmo se o transporte ignorar o abort,
 * só a resposta com o maior id pode escrever no estado.
 */
export function usePagedResource<T>({
  enabled = true,
  queryKey,
  fetchPage,
}: UsePagedResourceOptions<T>) {
  const [state, setState] = useState<PagedResourceState<T>>(() => ({
    ...EMPTY_PAGE,
    rows: [] as T[],
    loading: enabled,
  }));
  const stateRef = useRef(state);
  stateRef.current = state;

  // A página é derivada da consulta: trocar busca, canal ou ordenação nunca
  // pode pedir a página 7 do filtro novo — ela pode nem existir.
  const [navigation, setNavigation] = useState({ queryKey, page: 1 });
  if (navigation.queryKey !== queryKey) {
    setNavigation({ queryKey, page: 1 });
  }
  const currentPage = navigation.queryKey === queryKey ? navigation.page : 1;

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
    page: number,
    mode: 'replace' | 'refresh',
  ): Promise<boolean> => {
    if (!enabled) return false;

    requestRef.current?.controller.abort();
    const controller = new AbortController();
    const id = ++nextRequestId.current;
    requestRef.current = { id, controller };

    setState((previous) => ({
      ...previous,
      loading: mode === 'replace' && !previous.loadedOnce,
      refreshing: mode === 'refresh' || (mode === 'replace' && previous.loadedOnce),
      error: null,
    }));

    try {
      const received = await fetchPage(page, controller.signal);
      if (!mountedRef.current || requestRef.current?.id !== id) return false;

      // A lista pode ter encolhido entre a navegação e a resposta (aprovação de
      // outro operador, janela de 24h expirando). Mostrar a página vazia faria
      // parecer que não há dados; voltamos para a última página que existe.
      if (received.page > received.totalPages) {
        setNavigation({ queryKey, page: received.totalPages });
        return false;
      }

      setState({
        ...received,
        loading: false,
        refreshing: false,
        error: null,
        loadedOnce: true,
      });
      return true;
    } catch (error) {
      if (!mountedRef.current || requestRef.current?.id !== id || isAbort(error)) {
        return false;
      }
      setState((previous) => ({
        ...previous,
        loading: false,
        refreshing: false,
        error: errorMessage(error),
      }));
      return false;
    }
  }, [enabled, fetchPage, queryKey]);

  const reload = useCallback(
    () => request(
      stateRef.current.page || 1,
      stateRef.current.loadedOnce ? 'refresh' : 'replace',
    ),
    [request],
  );

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
    void request(
      currentPage,
      queryChanged || !stateRef.current.loadedOnce ? 'replace' : 'refresh',
    );
  }, [currentPage, enabled, queryKey, request]);

  const setPage = useCallback((next: number | ((page: number) => number)) => {
    setNavigation((previous) => {
      const value = typeof next === 'function' ? next(previous.page) : next;
      const totalPages = Math.max(1, stateRef.current.totalPages);
      return { queryKey, page: Math.max(1, Math.min(totalPages, value)) };
    });
  }, [queryKey]);

  const setRows = useCallback((updater: React.SetStateAction<T[]>) => {
    setState((previous) => ({
      ...previous,
      rows: typeof updater === 'function'
        ? (updater as (rows: T[]) => T[])(previous.rows)
        : updater,
    }));
  }, []);

  return { ...state, page: currentPage, reload, setPage, setRows };
}
