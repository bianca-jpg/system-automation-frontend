"use client";

import { useCallback, useState } from 'react';
import {
  fetchOrderLookupPage,
  type OrderLookupRow,
} from '@/features/pedidos/api/pedidos.api';
import { useCursorResource } from '@/features/pedidos/model/use-cursor-resource';
import { useCoalescedRevisionRefresh } from '@/features/pedidos/model/use-coalesced-revision-refresh';
import { useRealtime } from '@/features/realtime';
import { useDebounce } from '@/shared/hooks/useDebounce';

interface UseOrderLookupOptions {
  enabled: boolean;
  search: string;
  debounceMs?: number;
}

const rowKey = (row: OrderLookupRow) => String(row.id);

/**
 * Busca leve para associar uma comunicacao a qualquer pedido, inclusive os que
 * so existem no historico. A consulta so nasce quando o combobox e aberto.
 */
export function useOrderLookup({
  enabled,
  search,
  debounceMs = 300,
}: UseOrderLookupOptions) {
  const debouncedSearch = useDebounce(search.slice(0, 120), debounceMs);
  const queryKey = debouncedSearch;
  const [acceptedQueryKey, setAcceptedQueryKey] = useState<string | null>(null);

  const fetchPage = useCallback(
    (cursor: string | null, signal: AbortSignal) => fetchOrderLookupPage({
      search: debouncedSearch,
      cursor,
      signal,
    }),
    [debouncedSearch],
  );
  const acceptPage = useCallback((_page: unknown, append: boolean) => {
    if (!append) setAcceptedQueryKey(queryKey);
  }, [queryKey]);

  const resource = useCursorResource<OrderLookupRow>({
    enabled,
    queryKey,
    fetchPage,
    getRowKey: rowKey,
    onPageAccepted: acceptPage,
  });
  const { topicRevisions, resyncGeneration } = useRealtime();
  const lookupRevision = topicRevisions.orders + topicRevisions.history;
  const reload = useCoalescedRevisionRefresh(
    enabled,
    lookupRevision,
    resource.reload,
    resource.loadedOnce,
    resyncGeneration,
  );

  const isDebouncing = search.slice(0, 120) !== debouncedSearch;
  const isCurrentQuery = acceptedQueryKey === queryKey && !isDebouncing;

  return {
    ...resource,
    reload,
    // Uma resposta valida da consulta anterior nao deve virar uma opcao falsa
    // enquanto a nova busca ainda esta em voo.
    rows: isCurrentQuery ? resource.rows : [],
    total: isCurrentQuery ? resource.total : 0,
    hasMore: isCurrentQuery ? resource.hasMore : false,
    nextCursor: isCurrentQuery ? resource.nextCursor : null,
    debouncedSearch,
    // `acceptedQueryKey` só muda em sucesso. Portanto ele não pode, sozinho,
    // representar uma request em voo: na primeira falha ficaria diferente para
    // sempre e manteria o spinner ao lado do erro. O estado de busca vem das
    // flags efetivas do recurso; `rows` continua protegido pela chave aceita.
    searching: enabled && (isDebouncing || resource.loading || resource.refreshing),
  };
}
