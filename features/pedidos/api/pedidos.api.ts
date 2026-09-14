import { apiFetch } from '@/lib/api/http-client';
import {
  boundedCursor,
  boundedPageSize,
  isRecord,
  parseCursorPage,
  type CursorPage,
} from '@/features/pedidos/api/pagination';
import {
  parseNumberedPage,
  type NumberedPage,
} from '@/shared/types/numbered-page';
import {
  INVALID_IDEMPOTENCY_KEY_MESSAGE,
  validIdempotencyKey,
} from '@/features/pedidos/api/idempotency';
import type { EvolucaoFaturamento, Order, ProductItem } from '@/shared/types/models';

export type PedidosCanal = 'Todos' | 'Franquia' | 'Multimarca';
export type ProductChannel = Exclude<PedidosCanal, 'Todos'>;
export type PedidosStage = 'aguardando' | 'edicao';
export type ProductStage = PedidosStage | 'historico';
export type ProductSort =
  | 'lastOrderAt'
  | 'code'
  | 'name'
  | 'totalQty'
  | 'ordersCount'
  | 'totalValue'
  | 'remainingWindow';
export type SortOrder = 'asc' | 'desc';

export interface ProductProjection {
  code: string;
  name: string;
  channel: ProductChannel;
  totalQty: number;
  /** Assinado no histórico para preservar devoluções e ajustes contábeis. */
  totalValue: number;
  /** Assinado no histórico para preservar devoluções e ajustes contábeis. */
  originalTotalValue: number;
  /** Assinado no histórico; aguardando/edição permanecem não negativos. */
  unitValue: number;
  ordersCount: number;
  stock: number;
  sizes: Record<string, number>;
  sizeKeys: string[];
  lastOrderAt: string | null;
  processedAt: number | null;
  remainingWindowMs: number | null;
  /** Deadline local ancorado no instante da resposta; não vem do backend. */
  remainingWindowDeadlineAt?: number | null;
  adequacaoAplicada: boolean;
}

export interface DashboardOrderStats {
  totalOrdersCount: number;
  liberadosCount: number;
  /** Pedidos distintos com OR ativa na janela de edição. */
  editingOrderCount: number;
  /** Identidades `(productCode, channel)` ativas na projeção de edição. */
  editingProductCount: number;
  orComAdequacaoCount: number;
  orSemAdequacaoCount: number;
  processadoErpCount: number;
  pecasBloqueadasCount: number;
  pecasBloqueadasPercent: number;
  bloqueadosSemCreditoCount: number;
  liberadosPercent: number;
  bloqueadosSemCreditoPercent: number;
}

// Agregados calculados no PostgreSQL. O dashboard usa `statsByChannel`; o mapa
// legado permanece opcional no contrato, mas a leitura padrão não o materializa.
// As páginas usam o `stock` direcionado que já acompanha cada item paginado.
export interface PedidosResumo {
  /** @deprecated Vazio na leitura padrão; o frontend usa `item.stock` paginado. */
  stockByCode: Record<PedidosCanal, Record<string, number>>;
  erpBilling: Record<PedidosCanal, number>;
  erpCount: Record<PedidosCanal, number>;
  statsByChannel: Record<PedidosCanal, DashboardOrderStats>;
}

interface ProductPageParams {
  stage: ProductStage;
  channel: PedidosCanal;
  status?: string;
  search?: string;
  sort: ProductSort;
  order: SortOrder;
  cursor?: string | null;
  pageSize?: number;
  signal?: AbortSignal;
}

export async function fetchProductPage(
  params: ProductPageParams,
): Promise<CursorPage<ProductProjection>> {
  const query = new URLSearchParams({
    stage: params.stage,
    channel: params.channel,
    status: (params.status ?? 'Todos').slice(0, 40),
    search: (params.search ?? '').slice(0, 120),
    sort: params.sort,
    order: params.order,
    pageSize: String(boundedPageSize(params.pageSize, 25)),
  });
  const cursor = boundedCursor(params.cursor);
  if (cursor) query.set('cursor', cursor);

  const data = await apiFetch<unknown>(
    `/api/v1/pedidos/produtos?${query.toString()}`,
    { signal: params.signal },
  );
  const page = parseCursorPage<ProductProjection>(data, 'produtos de pedidos');
  return {
    ...page,
    rows: withEditWindowDeadline(page.rows, params.stage, Date.now()),
  };
}

// A janela de 24h é ancorada no instante da RESPOSTA, não no relógio do
// navegador: `remainingWindowMs` vem relativo ao relógio do servidor e vira um
// deadline local aqui. Vale para os dois modos de paginação.
function withEditWindowDeadline(
  rows: ProductProjection[],
  stage: ProductStage,
  receivedAt: number,
): ProductProjection[] {
  return rows.map(row => ({
    ...row,
    remainingWindowDeadlineAt: stage === 'edicao' && row.remainingWindowMs !== null
      ? receivedAt + Math.max(0, row.remainingWindowMs)
      : null,
  }));
}

/**
 * Página numerada da projeção por produto. O backend expõe as duas paginações no
 * mesmo endpoint e elas são mutuamente exclusivas — mandar `cursor` junto com
 * `page` é 422. As listas com a faixa "Anterior 1 2 3 … Próxima" usam esta;
 * alertas, comunicações e o modal de clientes do produto seguem no cursor.
 */
export async function fetchProductNumberedPage(
  params: Omit<ProductPageParams, 'cursor'> & { page: number },
): Promise<NumberedPage<ProductProjection>> {
  const query = new URLSearchParams({
    stage: params.stage,
    channel: params.channel,
    status: (params.status ?? 'Todos').slice(0, 40),
    search: (params.search ?? '').slice(0, 120),
    sort: params.sort,
    order: params.order,
    page: String(Math.max(1, Math.floor(params.page))),
    pageSize: String(boundedPageSize(params.pageSize, 25)),
  });

  const data = await apiFetch<unknown>(
    `/api/v1/pedidos/produtos?${query.toString()}`,
    { signal: params.signal },
  );
  const page = parseNumberedPage<ProductProjection>(data, 'produtos de pedidos');
  return {
    ...page,
    rows: withEditWindowDeadline(page.rows, params.stage, Date.now()),
  };
}

export async function fetchPedidosResumo(signal?: AbortSignal): Promise<PedidosResumo> {
  return apiFetch<PedidosResumo>('/api/v1/pedidos/resumo', { signal });
}

export async function fetchEvolucaoFaturamento(
  signal?: AbortSignal,
): Promise<EvolucaoFaturamento[]> {
  const data = await apiFetch<unknown>('/api/v1/pedidos/evolucao-faturamento', { signal });
  if (!Array.isArray(data)) {
    throw new Error('Resposta da evolução de faturamento em formato inesperado.');
  }
  return data as EvolucaoFaturamento[];
}

interface ApproveProductResult {
  status: string;
  matchedCount: number;
  approvedCount: number;
  alreadyApprovedCount: number;
  expiredCount: number;
}

export async function approveProduct(
  productCode: string,
  channel: ProductChannel,
  signal?: AbortSignal,
): Promise<ApproveProductResult> {
  const query = new URLSearchParams({
    productCode: productCode.slice(0, 64),
    channel,
  });
  return apiFetch<ApproveProductResult>(
    `/api/v1/pedidos/produtos/aprovar?${query.toString()}`,
    { method: 'POST', signal },
  );
}

export interface ProductGradeChange {
  orderId: number;
  expectedVersion: string;
  sizes: Record<string, number>;
  /**
   * Validação local; não é serializado. Numérico: linha "com adequação", a
   * edição só redistribui a reserva e o total tem que permanecer igual à
   * baseline. `null`: linha "sem adequação", o total pode variar dentro do
   * orçamento do pedido — quem decide se cabe é o backend (D-15/D-16).
   */
  expectedTotalQty: number | null;
}

export interface UpdateProductGradesResult {
  status: string;
  updatedCount: number;
  totalQty: number;
  totalValue: number;
}

function normalizeGradeChanges(
  changes: ProductGradeChange[],
): Array<Omit<ProductGradeChange, 'expectedTotalQty'>> {
  if (changes.length < 1 || changes.length > 100) {
    throw new Error('Selecione de 1 a 100 clientes por salvamento de grade.');
  }
  return changes.map((change) => {
    if (!Number.isInteger(change.orderId) || change.orderId <= 0) {
      throw new Error('Pedido inválido na alteração de grade.');
    }
    if (
      typeof change.expectedVersion !== 'string'
      || change.expectedVersion.length < 1
      || change.expectedVersion.length > 128
    ) {
      throw new Error('A versão da grade é inválida; recarregue os dados.');
    }
    if (
      change.expectedTotalQty !== null
      && (!Number.isSafeInteger(change.expectedTotalQty) || change.expectedTotalQty <= 0)
    ) {
      throw new Error('O total reservado da grade é inválido; recarregue os dados.');
    }
    const entries = Object.entries(change.sizes);
    if (entries.length < 1 || entries.length > 100) {
      throw new Error('A grade deve conter de 1 a 100 tamanhos.');
    }
    let total = 0;
    const sizes: Record<string, number> = {};
    for (const [size, quantity] of entries) {
      const canonicalSize = size.trim().toUpperCase();
      if (canonicalSize.length < 1 || canonicalSize.length > 16) {
        throw new Error('A grade contém um tamanho inválido.');
      }
      if (canonicalSize in sizes) {
        throw new Error(`O tamanho ${canonicalSize} está duplicado na grade.`);
      }
      if (
        !Number.isSafeInteger(quantity)
        || quantity < 0
        || quantity > 1_000_000
      ) {
        throw new Error(`Quantidade inválida para o tamanho ${canonicalSize}.`);
      }
      sizes[canonicalSize] = quantity;
      total += quantity;
    }
    if (total === 0) {
      throw new Error('Não é permitido zerar toda a grade de um cliente.');
    }
    if (change.expectedTotalQty !== null && total !== change.expectedTotalQty) {
      throw new Error(`O total da grade deve permanecer em ${change.expectedTotalQty} peça(s).`);
    }
    return {
      orderId: change.orderId,
      expectedVersion: change.expectedVersion,
      sizes,
    };
  });
}

export async function updateProductGrades(
  productCode: string,
  channel: ProductChannel,
  changes: ProductGradeChange[],
  signal?: AbortSignal,
): Promise<UpdateProductGradesResult> {
  const normalizedChanges = normalizeGradeChanges(changes);
  const query = new URLSearchParams({
    productCode: productCode.slice(0, 64),
    channel,
  });
  return apiFetch<UpdateProductGradesResult>(
    `/api/v1/pedidos/produtos/grades?${query.toString()}`,
    {
      method: 'PUT',
      body: JSON.stringify({ changes: normalizedChanges }),
      signal,
    },
  );
}

// O detalhe lazy devolve uma linha por cliente; `order.items` contém apenas o
// item daquele produto para manter o payload bounded.
export type HistoricoRow = { order: Order; item: ProductItem; version?: string };

export interface ProductClientsSummary {
  code: string;
  name: string;
  channel: ProductChannel;
  totalClients: number;
  totalQty: number;
  /** Pode ser negativo quando `stage=historico`. */
  totalValue: number;
  /** Pode ser negativo quando `stage=historico`. */
  originalTotalValue: number;
  stock: number;
  sizeKeys: string[];
  sizeTotals: Record<string, number>;
}

export interface ProductClientsPage extends CursorPage<HistoricoRow> {
  summary: ProductClientsSummary;
}

interface ProductClientsPageParams {
  productCode: string;
  stage: ProductStage;
  channel: ProductChannel;
  status?: string;
  cursor?: string | null;
  pageSize?: number;
  signal?: AbortSignal;
}

export async function fetchProductClientsPage(
  params: ProductClientsPageParams,
): Promise<ProductClientsPage> {
  const query = new URLSearchParams({
    productCode: params.productCode.slice(0, 64),
    stage: params.stage,
    channel: params.channel,
    status: (params.status ?? 'Todos').slice(0, 40),
    pageSize: String(boundedPageSize(params.pageSize, 25)),
  });
  const cursor = boundedCursor(params.cursor);
  if (cursor) query.set('cursor', cursor);

  const data = await apiFetch<unknown>(
    `/api/v1/pedidos/produtos/clientes?${query.toString()}`,
    { signal: params.signal },
  );
  const page = parseCursorPage<HistoricoRow>(data, 'clientes do produto');
  if (!isRecord(data) || !isRecord(data.summary)) {
    throw new Error('Resposta de clientes do produto sem resumo autoritativo.');
  }
  return { ...page, summary: data.summary as unknown as ProductClientsSummary };
}

export interface OrderLookupRow {
  id: number;
  client: string;
  canal: Exclude<PedidosCanal, 'Todos'>;
  status: string;
  motivo: string | null;
  /** Valor contábil assinado: devoluções/ajustes históricos são negativos. */
  value: number;
}

interface OrderLookupParams {
  search?: string;
  cursor?: string | null;
  pageSize?: number;
  signal?: AbortSignal;
}

/**
 * Busca leve e deduplicada para referências de comunicação. Não reutiliza as
 * filas abertas: histórico e alertas também precisam localizar pedidos sem
 * materializar seus itens.
 */
export async function fetchOrderLookupPage(
  params: OrderLookupParams,
): Promise<CursorPage<OrderLookupRow>> {
  const query = new URLSearchParams({
    search: (params.search ?? '').slice(0, 120),
    pageSize: String(boundedPageSize(params.pageSize, 25)),
  });
  const cursor = boundedCursor(params.cursor);
  if (cursor) query.set('cursor', cursor);

  const data = await apiFetch<unknown>(
    `/api/v1/pedidos/lookup?${query.toString()}`,
    { signal: params.signal },
  );
  return parseCursorPage<OrderLookupRow>(data, 'busca de pedidos');
}

// ── Processamento de OR (job durável) ───────────────────────────────────────
export type AdequacaoMode = 'adequar' | 'sem_adequar';
export type AdequacaoJobStatus =
  | 'queued'
  | 'running'
  | 'retrying'
  | 'succeeded'
  | 'failed'
  | 'skipped';

export interface AdequacaoJobResult {
  plannedCount: number;
  appliedCount: number;
  deferredCount: number;
  blockedCreditCount: number;
}

export interface AdequacaoJobAccepted {
  jobId: string;
  status: AdequacaoJobStatus;
  replayed: boolean;
  coalesced: boolean;
  statusUrl: string;
  progressCurrent: number;
  progressTotal: number | null;
}

export interface AdequacaoJobSnapshot {
  jobId: string;
  mode: AdequacaoMode;
  channel: PedidosCanal;
  status: AdequacaoJobStatus;
  progressCurrent: number;
  progressTotal: number | null;
  attempts: number;
  maxAttempts: number;
  retryable: boolean;
  requestedAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  deadlineAt: string;
  result: AdequacaoJobResult | null;
  errorCode: string | null;
}

const JOB_ID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function submitAdequacaoJob(
  mode: AdequacaoMode,
  channel: PedidosCanal,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<AdequacaoJobAccepted> {
  if (!validIdempotencyKey(idempotencyKey)) {
    throw new Error(INVALID_IDEMPOTENCY_KEY_MESSAGE);
  }
  return apiFetch<AdequacaoJobAccepted>('/api/v1/pedidos/processamentos', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ mode, channel }),
    signal,
  });
}

export async function fetchAdequacaoJob(
  jobId: string,
  signal?: AbortSignal,
): Promise<AdequacaoJobSnapshot> {
  if (!JOB_ID_PATTERN.test(jobId)) throw new Error('Identificador de processamento inválido.');
  return apiFetch<AdequacaoJobSnapshot>(
    `/api/v1/pedidos/processamentos/${encodeURIComponent(jobId)}`,
    { signal },
  );
}
