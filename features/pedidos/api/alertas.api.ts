import { apiFetch } from '@/lib/api/http-client';
import {
  boundedCursor,
  boundedPageSize,
  parseCursorPage,
  type CursorPage,
} from '@/features/pedidos/api/pagination';
import type { OrderAlert } from '@/shared/types/models';
import type { PedidosCanal } from '@/features/pedidos/api/pedidos.api';

interface AlertasPageParams {
  channel: PedidosCanal;
  search?: string;
  cursor?: string | null;
  pageSize?: number;
  signal?: AbortSignal;
}

export async function fetchAlertasPage(
  params: AlertasPageParams,
): Promise<CursorPage<OrderAlert>> {
  const query = new URLSearchParams({
    channel: params.channel,
    search: (params.search ?? '').slice(0, 120),
    pageSize: String(boundedPageSize(params.pageSize, 100)),
  });
  const cursor = boundedCursor(params.cursor);
  if (cursor) query.set('cursor', cursor);

  const data = await apiFetch<unknown>(`/api/v1/alertas?${query.toString()}`, {
    signal: params.signal,
  });
  return parseCursorPage<OrderAlert>(data, 'alertas');
}
