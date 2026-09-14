import { apiFetch } from '@/lib/api/http-client';
import {
  boundedCursor,
  boundedPageSize,
  parseCursorPage,
  type CursorPage,
} from '@/features/pedidos/api/pagination';
import {
  INVALID_IDEMPOTENCY_KEY_MESSAGE,
  validIdempotencyKey,
} from '@/features/pedidos/api/idempotency';
import type { Communication } from '@/shared/types/models';

interface ComunicacoesPageParams {
  cursor?: string | null;
  pageSize?: number;
  signal?: AbortSignal;
}

export async function fetchComunicacoesPage(
  params: ComunicacoesPageParams = {},
): Promise<CursorPage<Communication>> {
  const query = new URLSearchParams({
    pageSize: String(boundedPageSize(params.pageSize, 100)),
  });
  const cursor = boundedCursor(params.cursor);
  if (cursor) query.set('cursor', cursor);
  const data = await apiFetch<unknown>(`/api/v1/comunicacoes?${query.toString()}`, {
    signal: params.signal,
  });
  return parseCursorPage<Communication>(data, 'comunicações');
}

// Payload do POST /api/v1/comunicacoes. Os nomes seguem o
// `EnviarComunicacaoRequest` do backend — `order_ref` em snake_case é do
// contrato da API, não do estilo do front.
interface NovaComunicacaoInput {
  recipient: string;
  content: string;
  orderRef?: string | null;
  subject?: string | null;
  idempotencyKey: string;
}

/**
 * Agenda o e-mail na outbox durável e devolve o estado persistido. O HTTP 202
 * confirma o agendamento, não a entrega; `Location` aponta para o recurso e
 * replays com a mesma chave devolvem o mesmo registro, que pode já refletir um
 * estado terminal.
 */
export async function criarComunicacao(
  input: NovaComunicacaoInput,
): Promise<Communication> {
  if (!validIdempotencyKey(input.idempotencyKey)) {
    throw new Error(INVALID_IDEMPOTENCY_KEY_MESSAGE);
  }
  return apiFetch<Communication>('/api/v1/comunicacoes', {
    method: 'POST',
    headers: { 'Idempotency-Key': input.idempotencyKey },
    body: JSON.stringify({
      recipient: input.recipient,
      content: input.content,
      order_ref: input.orderRef ?? null,
      subject: input.subject ?? null,
    }),
  });
}
