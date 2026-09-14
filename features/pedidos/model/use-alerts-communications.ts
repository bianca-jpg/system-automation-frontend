"use client";

import { useCallback } from 'react';
import { useRealtime } from '@/features/realtime';
import { fetchAlertasPage } from '@/features/pedidos/api/alertas.api';
import { fetchComunicacoesPage } from '@/features/pedidos/api/comunicacoes.api';
import type { PedidosCanal } from '@/features/pedidos/api/pedidos.api';
import { useCursorResource } from '@/features/pedidos/model/use-cursor-resource';
import { useRealtimeResourceRefresh } from '@/features/pedidos/model/use-realtime-resource-refresh';
import type { Communication, OrderAlert } from '@/shared/types/models';

interface UseAlertsCommunicationsOptions {
  enabled: boolean;
  channel: PedidosCanal;
  alertsSearch?: string;
}

const alertKey = (alert: OrderAlert) => alert.id;
const communicationKey = (communication: Communication) => communication.id;

export function useAlertsCommunications({
  enabled,
  channel,
  alertsSearch = '',
}: UseAlertsCommunicationsOptions) {
  const { topicRevisions } = useRealtime();

  const fetchAlerts = useCallback(
    (cursor: string | null, signal: AbortSignal) => fetchAlertasPage({
      channel,
      search: alertsSearch,
      cursor,
      signal,
    }),
    [channel, alertsSearch],
  );
  const fetchCommunications = useCallback(
    (cursor: string | null, signal: AbortSignal) => fetchComunicacoesPage({ cursor, signal }),
    [],
  );

  const alerts = useCursorResource({
    enabled,
    queryKey: `${channel}|${alertsSearch}`,
    fetchPage: fetchAlerts,
    getRowKey: alertKey,
  });
  const communications = useCursorResource({
    enabled,
    queryKey: 'communications',
    fetchPage: fetchCommunications,
    getRowKey: communicationKey,
  });

  const reloadAlerts = useRealtimeResourceRefresh({
    enabled,
    topic: 'alerts',
    revision: topicRevisions.alerts,
    // Pedidos também podem resolver alertas. Essa invalidação atualiza a
    // projeção sem confirmar leitura nem alterar a bolinha de novos alertas.
    silentRevision: topicRevisions.orders,
    loadedOnce: alerts.loadedOnce,
    loading: alerts.loading || alerts.loadingMore || alerts.refreshing,
    error: alerts.error,
    refresh: alerts.reload,
  });
  const reloadCommunications = useRealtimeResourceRefresh({
    enabled,
    topic: 'communications',
    revision: topicRevisions.communications,
    loadedOnce: communications.loadedOnce,
    loading: communications.loading || communications.loadingMore || communications.refreshing,
    error: communications.error,
    refresh: communications.reload,
  });

  return {
    alerts: { ...alerts, reload: reloadAlerts },
    communications: { ...communications, reload: reloadCommunications },
  };
}
