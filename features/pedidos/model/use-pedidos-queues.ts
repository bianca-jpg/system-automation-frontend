"use client";

import { useCallback, useEffect, useRef } from 'react';
import { useRealtime } from '@/features/realtime';
import {
  fetchProductNumberedPage,
  type PedidosCanal,
  type ProductProjection,
  type ProductSort,
  type SortOrder,
} from '@/features/pedidos/api/pedidos.api';
import { usePagedResource } from '@/shared/hooks/use-paged-resource';
import { useRealtimeResourceRefresh } from '@/features/pedidos/model/use-realtime-resource-refresh';

interface UsePedidosQueuesOptions {
  enabled: boolean;
  channel: PedidosCanal;
  awaitingSearch: string;
  editingSearch: string;
  awaitingSort?: ProductSort;
  awaitingOrder?: SortOrder;
  editingSort?: ProductSort;
  editingOrder?: SortOrder;
}

const productKey = (product: ProductProjection) => `${product.channel}|${product.code}`;
const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function usePedidosQueues({
  enabled,
  channel,
  awaitingSearch,
  editingSearch,
  awaitingSort = 'lastOrderAt',
  awaitingOrder = 'desc',
  editingSort = 'remainingWindow',
  editingOrder = 'asc',
}: UsePedidosQueuesOptions) {
  const { topicRevisions } = useRealtime();
  const ordersRevision = topicRevisions.orders;

  const fetchAwaiting = useCallback(
    (page: number, signal: AbortSignal) => fetchProductNumberedPage({
      stage: 'aguardando',
      channel,
      search: awaitingSearch,
      sort: awaitingSort,
      order: awaitingOrder,
      page,
      signal,
    }),
    [channel, awaitingSearch, awaitingSort, awaitingOrder],
  );
  const fetchEditing = useCallback(
    (page: number, signal: AbortSignal) => fetchProductNumberedPage({
      stage: 'edicao',
      channel,
      search: editingSearch,
      sort: editingSort,
      order: editingOrder,
      page,
      signal,
    }),
    [channel, editingSearch, editingSort, editingOrder],
  );

  const awaiting = usePagedResource({
    enabled,
    queryKey: `${channel}|${awaitingSearch}|${awaitingSort}|${awaitingOrder}`,
    fetchPage: fetchAwaiting,
  });
  const editing = usePagedResource({
    enabled,
    queryKey: `${channel}|${editingSearch}|${editingSort}|${editingOrder}`,
    fetchPage: fetchEditing,
  });
  const reloadAwaiting = awaiting.reload;
  const reloadEditing = editing.reload;

  const reloadAllResources = useCallback(async () => {
    if (!enabled) return false;
    const [awaitingOk, editingOk] = await Promise.all([
      reloadAwaiting(),
      reloadEditing(),
    ]);
    return awaitingOk && editingOk;
  }, [enabled, reloadAwaiting, reloadEditing]);

  const reloadAll = useRealtimeResourceRefresh({
    enabled,
    topic: 'orders',
    revision: ordersRevision,
    loadedOnce: awaiting.loadedOnce && editing.loadedOnce,
    loading: awaiting.loading
      || awaiting.refreshing
      || editing.loading
      || editing.refreshing,
    error: awaiting.error ?? editing.error,
    refresh: reloadAllResources,
  });

  // A passagem edicao -> historico ocorre pelo relógio do banco e não gera um
  // evento por si só. `remainingWindowMs` é relativo ao relógio do servidor e
  // evita antecipar o reload quando o relógio do navegador está adiantado. Se
  // a row ainda vier na borda, rearmamos com backoff em vez de marcá-la como
  // concluída para sempre.
  const deadlineRetryRef = useRef(new Map<string, number>());
  useEffect(() => {
    if (!enabled || editing.rows.length === 0) return;
    const now = Date.now();
    const activeKeys = new Set(editing.rows.map(product => (
      `${productKey(product)}|${product.processedAt ?? 'sem-data'}`
    )));
    for (const key of deadlineRetryRef.current.keys()) {
      if (!activeKeys.has(key)) deadlineRetryRef.current.delete(key);
    }

    let nextDelay = Number.POSITIVE_INFINITY;
    let scheduledKeys: string[] = [];
    let scheduledAtBoundary = false;
    for (const product of editing.rows) {
      const key = `${productKey(product)}|${product.processedAt ?? 'sem-data'}`;
      const relativeRemaining = product.remainingWindowMs;
      const atBoundary = relativeRemaining !== null && relativeRemaining <= 0;
      const retryAttempt = deadlineRetryRef.current.get(key) ?? 0;
      const delay = relativeRemaining !== null
        ? relativeRemaining > 0
          ? relativeRemaining + 250
          : Math.min(1_000 * (2 ** retryAttempt), 30_000)
        : product.processedAt !== null
          ? Math.max(0, product.processedAt + EDIT_WINDOW_MS - now) + 1_000
          : null;
      if (delay === null) continue;
      if (delay < nextDelay) {
        nextDelay = delay;
        scheduledKeys = [key];
        scheduledAtBoundary = atBoundary;
      } else if (delay === nextDelay) {
        scheduledKeys.push(key);
        scheduledAtBoundary ||= atBoundary;
      }
    }
    if (!Number.isFinite(nextDelay)) return;

    const timer = window.setTimeout(() => {
      if (scheduledAtBoundary) {
        scheduledKeys.forEach(key => {
          deadlineRetryRef.current.set(key, (deadlineRetryRef.current.get(key) ?? 0) + 1);
        });
      }
      void reloadAll();
    }, nextDelay);
    return () => window.clearTimeout(timer);
  }, [editing.rows, enabled, reloadAll]);

  return { awaiting, editing, reloadAll };
}
