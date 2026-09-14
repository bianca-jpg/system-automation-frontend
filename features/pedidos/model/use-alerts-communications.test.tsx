import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CursorPage } from '@/features/pedidos/api/pagination';
import type { Communication, OrderAlert } from '@/shared/types/models';
import { useAlertsCommunications } from './use-alerts-communications';

const mocks = vi.hoisted(() => ({
  topicRevisions: {
    orders: 0,
    alerts: 0,
    communications: 0,
    history: 0,
  },
  markTopicRead: vi.fn().mockResolvedValue(undefined),
  fetchAlertasPage: vi.fn(),
  fetchComunicacoesPage: vi.fn(),
}));

vi.mock('@/features/realtime', () => ({
  useRealtime: () => ({
    topicRevisions: mocks.topicRevisions,
    markTopicRead: mocks.markTopicRead,
    resyncGeneration: 0,
  }),
}));

vi.mock('@/features/pedidos/api/alertas.api', () => ({
  fetchAlertasPage: mocks.fetchAlertasPage,
}));

vi.mock('@/features/pedidos/api/comunicacoes.api', () => ({
  fetchComunicacoesPage: mocks.fetchComunicacoesPage,
}));

const alertsPage: CursorPage<OrderAlert> = {
  rows: [{
    id: 'alert-1',
    orderId: '123',
    type: 'warning',
    message: 'Pedido requer atenção',
    time: 'agora',
  }],
  total: 1,
  pageSize: 25,
  nextCursor: null,
  hasMore: false,
};

const communicationsPage: CursorPage<Communication> = {
  rows: [],
  total: 0,
  pageSize: 25,
  nextCursor: null,
  hasMore: false,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

describe('useAlertsCommunications', () => {
  beforeEach(() => {
    mocks.topicRevisions.orders = 0;
    mocks.topicRevisions.alerts = 0;
    mocks.topicRevisions.communications = 0;
    mocks.topicRevisions.history = 0;
    mocks.markTopicRead.mockReset().mockResolvedValue(undefined);
    mocks.fetchAlertasPage.mockReset().mockResolvedValue(alertsPage);
    mocks.fetchComunicacoesPage.mockReset().mockResolvedValue(communicationsPage);
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  });

  it('coalesce revisões de pedidos ao atualizar alertas sem alterar seu unseen', async () => {
    const firstSilentRefresh = deferred<CursorPage<OrderAlert>>();
    const { rerender } = renderHook(() => useAlertsCommunications({
      enabled: true,
      channel: 'Todos',
    }));

    await waitFor(() => expect(mocks.fetchAlertasPage).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.markTopicRead).toHaveBeenCalledWith('alerts', 0));
    await waitFor(() => expect(mocks.markTopicRead).toHaveBeenCalledWith('communications', 0));
    mocks.markTopicRead.mockClear();
    mocks.fetchAlertasPage
      .mockReturnValueOnce(firstSilentRefresh.promise)
      .mockResolvedValueOnce(alertsPage);

    mocks.topicRevisions.orders = 1;
    rerender();
    await waitFor(() => expect(mocks.fetchAlertasPage).toHaveBeenCalledTimes(2));

    mocks.topicRevisions.orders = 2;
    rerender();
    mocks.topicRevisions.orders = 3;
    rerender();
    expect(mocks.fetchAlertasPage).toHaveBeenCalledTimes(2);

    await act(async () => { firstSilentRefresh.resolve(alertsPage); });
    await waitFor(() => expect(mocks.fetchAlertasPage).toHaveBeenCalledTimes(3));
    expect(mocks.fetchComunicacoesPage).toHaveBeenCalledTimes(1);
    expect(mocks.markTopicRead).not.toHaveBeenCalled();
  });
});
