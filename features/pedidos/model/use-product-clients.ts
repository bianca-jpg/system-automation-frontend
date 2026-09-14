"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchProductClientsPage,
  type HistoricoRow,
  type ProductChannel,
  type ProductStage,
  type ProductClientsPage,
  type ProductClientsSummary,
} from '@/features/pedidos/api/pedidos.api';
import { useCursorResource } from '@/features/pedidos/model/use-cursor-resource';
import { useCoalescedRevisionRefresh } from '@/features/pedidos/model/use-coalesced-revision-refresh';
import { useRealtime } from '@/features/realtime';

interface UseProductClientsOptions {
  productCode: string | null;
  stage: ProductStage;
  channel: ProductChannel;
  status?: string;
  revision?: number;
  enabled?: boolean;
}

const rowKey = (row: HistoricoRow) => `${row.order.id}|${row.item.code}`;

export function useProductClients({
  productCode,
  stage,
  channel,
  status = 'Todos',
  revision = 0,
  enabled = true,
}: UseProductClientsOptions) {
  const { resyncGeneration } = useRealtime();
  const queryKey = `${productCode ?? ''}|${stage}|${channel}|${status}`;
  const revisionRef = useRef(revision);
  const resyncGenerationRef = useRef(resyncGeneration);
  const requestWatermarksRef = useRef(new WeakMap<AbortSignal, {
    revision: number;
    resyncGeneration: number;
  }>());
  useEffect(() => {
    revisionRef.current = revision;
    resyncGenerationRef.current = resyncGeneration;
  }, [resyncGeneration, revision]);
  const [summaryState, setSummaryState] = useState<{
    queryKey: string;
    value: ProductClientsSummary;
    revision: number;
    resyncGeneration: number;
  } | null>(null);
  const fetchPage = useCallback(
    async (cursor: string | null, signal: AbortSignal) => {
      if (!productCode) {
        throw new Error('Selecione um produto para carregar os clientes.');
      }
      let watermarks = requestWatermarksRef.current.get(signal);
      if (!watermarks) {
        watermarks = {
          revision: revisionRef.current,
          resyncGeneration: resyncGenerationRef.current,
        };
        requestWatermarksRef.current.set(signal, watermarks);
      }
      const page = await fetchProductClientsPage({
        productCode,
        stage,
        channel,
        status,
        cursor,
        signal,
      });
      return {
        ...page,
        acceptedRevision: watermarks.revision,
        acceptedResyncGeneration: watermarks.resyncGeneration,
      };
    },
    [productCode, stage, channel, status],
  );
  const acceptPage = useCallback((page: ProductClientsPage & {
    acceptedRevision: number;
    acceptedResyncGeneration: number;
  }) => {
    setSummaryState({
      queryKey,
      value: page.summary,
      revision: page.acceptedRevision,
      resyncGeneration: page.acceptedResyncGeneration,
    });
  }, [queryKey]);
  const resource = useCursorResource<HistoricoRow, ProductClientsPage & {
    acceptedRevision: number;
    acceptedResyncGeneration: number;
  }>({
    enabled: enabled && productCode !== null,
    queryKey,
    fetchPage,
    getRowKey: rowKey,
    onPageAccepted: acceptPage,
  });
  const reload = useCoalescedRevisionRefresh(
    enabled && productCode !== null,
    revision,
    resource.reload,
    resource.loadedOnce,
    resyncGeneration,
  );

  return {
    ...resource,
    reload,
    summary: summaryState?.queryKey === queryKey ? summaryState.value : null,
    acceptedRevision: summaryState?.queryKey === queryKey ? summaryState.revision : null,
    acceptedResyncGeneration: summaryState?.queryKey === queryKey
      ? summaryState.resyncGeneration
      : null,
  };
}
