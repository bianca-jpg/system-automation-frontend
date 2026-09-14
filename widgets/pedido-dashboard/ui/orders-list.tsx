"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { formatCurrency } from '@/shared/lib/format/currency';
import { CheckCircle, Clock, Sparkles, Scale, Edit3, Info, Mail, Filter, ChevronDown, ChevronUp, Eye, FileClock, FileEdit, Pencil, RotateCcw } from '@/shared/ui/icons';
import { Order, Communication, OrderAlert } from '@/shared/types/models';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/primitives/badge';
import { Pressable } from '@/shared/ui/primitives/pressable';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/primitives/radio-group';
import {
  DynamicTable,
  type Action,
  type ColumnConfig,
  type DynamicTableSortingState,
} from '@/shared/ui/primitives/dynamic-table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/primitives/tooltip';
import { Typography } from '@/shared/ui/primitives/Typography';
import { Subtitle } from '@/shared/ui/composite/Subtitle';
import { LoadMoreFooter } from '@/shared/ui/composite/LoadMoreFooter';
import { PaginationControls } from '@/shared/ui/composite/PaginationControls';
import { LOAD_MORE_STEP, useLoadMore } from '@/shared/hooks/useLoadMore';
import type { ApiError } from '@/lib/api/http-client';
import { useRealtime } from '@/features/realtime';
import { usePedidosQueues } from '@/features/pedidos/model/use-pedidos-queues';
import { useAlertsCommunications } from '@/features/pedidos/model/use-alerts-communications';
import {
  approveProduct,
  fetchProductNumberedPage,
  type ProductProjection,
  type ProductSort,
  type SortOrder,
} from '@/features/pedidos/api/pedidos.api';
import { criarComunicacao } from '@/features/pedidos/api/comunicacoes.api';
import {
  DAY_MS,
  getFormattedRemainingTime as formatRemainingTime,
  isAwaitingFaturamento,
  isInEditWindow as isOrderInEditWindow,
} from '@/features/pedidos/lib/order-lifecycle';
import { usePermissions } from '@/shared/config/auth/permissions';
import { ConfirmAlertModal, ConfirmModalState } from '@/features/pedidos/ui/modals/confirm-alert-modal';
import { NewMessageModal } from '@/features/pedidos/ui/modals/new-message-modal';
import { ProductGradeDetailModal, GroupedProduct } from '@/features/pedidos/ui/modals/product-grade-detail-modal';
import { EmptyState } from '@/shared/ui/primitives/empty-state';
import { PriorityAlertsCard } from '@/features/pedidos/ui/priority-alerts-card';
import { RecentCommunicationsCard } from '@/features/pedidos/ui/recent-communications-card';
import { ErrorState } from '@/shared/ui/composite/DataState';
import { OrdersListSkeleton } from '@/widgets/pedido-dashboard/ui/orders-list-skeleton';
import {
  buildBasketSignature,
  getGroupedItems,
  parseOrderDate,
} from '@/widgets/pedido-dashboard/lib/orders-list-helpers';
import { usePagedResource } from '@/shared/hooks/use-paged-resource';
import { useRealtimeResourceRefresh } from '@/features/pedidos/model/use-realtime-resource-refresh';
import { useAdequacaoProcessing } from '@/widgets/pedido-dashboard/model/use-adequacao-processing';
import { useToleranciaAdequacaoFator } from '@/features/pedidos/model/use-tolerancia-adequacao';

function groupOrdersByProduct(ordersList: Order[]): GroupedProduct[] {
  const map = new Map<string, GroupedProduct>();

  for (const order of ordersList) {
    const items = getGroupedItems(order);
    for (const item of items) {
      const productKey = `${order.canal}|${item.code}`;
      if (!map.has(productKey)) {
        map.set(productKey, {
          code: item.code,
          name: item.name,
          unitValue: item.unitValue,
          totalQty: 0,
          totalValue: 0,
          orders: [],
          stock: item.stock ?? 0,
          channel: order.canal,
        });
      }

      const entry = map.get(productKey)!;
      entry.totalQty += item.qty;
      entry.totalValue += item.qty * item.unitValue;
      entry.orders.push({ order, item });
    }
  }

  return Array.from(map.values());
}

function projectionToGroupedProduct(
  product: ProductProjection,
  stage: 'aguardando' | 'edicao' | 'historico',
): GroupedProduct {
  return {
    code: product.code,
    name: product.name,
    unitValue: product.unitValue,
    totalQty: product.totalQty,
    totalValue: product.totalValue,
    orders: [],
    ordersCount: product.ordersCount,
    stock: product.stock,
    sizes: product.sizes,
    sizeKeys: product.sizeKeys,
    lastOrderAt: product.lastOrderAt,
    processedAt: product.processedAt,
    remainingWindowMs: product.remainingWindowMs,
    remainingWindowDeadlineAt: product.remainingWindowDeadlineAt,
    channel: product.channel,
    stage,
  };
}

// Pedido mais recente que contém o produto. É o que dá destino à antiga pílula
// "Mais Recentes / Mais Antigo": ela ordenava os PEDIDOS por data e a lista de
// produtos saía na ordem de primeira aparição — agora isso é a coluna
// "Últ. Pedido", ordenável pelo cabeçalho.
function latestOrder(prod: GroupedProduct): { ts: number; label: string } {
  if (prod.lastOrderAt) {
    const parsed = new Date(prod.lastOrderAt);
    return {
      ts: parseOrderDate(prod.lastOrderAt),
      label: Number.isNaN(parsed.getTime())
        ? prod.lastOrderAt
        : new Intl.DateTimeFormat('pt-BR').format(parsed),
    };
  }
  let ts = 0;
  let label = '';
  for (const { order } of prod.orders) {
    const candidate = parseOrderDate(order.date);
    if (candidate >= ts) {
      ts = candidate;
      label = order.date ?? '';
    }
  }
  return { ts, label };
}

// Colunas comuns às duas listas por produto da aba "abertos". Todas ordenáveis:
// é isto que substitui as pílulas segmentadas — "Cliente" ordenava os produtos
// por `name` (ver o memo antigo), "Maior/Menor Valor" por `totalValue`.
const COLUNAS_PRODUTO: ColumnConfig<GroupedProduct>[] = [
  {
    key: 'code',
    label: 'Código Produto',
    width: '150px',
    minWidth: '120px',
    sortable: true,
    render: (prod) => (
      <span className="font-mono font-bold text-foreground">{prod.code}</span>
    ),
  },
  {
    key: 'name',
    label: 'Produto',
    width: '320px',
    minWidth: '180px',
    sortable: true,
    render: (prod) => (
      <span className="block truncate font-medium text-foreground" title={prod.name}>
        {prod.name}
      </span>
    ),
  },
  {
    key: 'totalQty',
    label: 'Qtd. Total',
    width: '130px',
    minWidth: '110px',
    align: 'center',
    sortable: true,
    render: (prod) => (
      <span className="whitespace-nowrap font-mono font-bold text-foreground">{prod.totalQty} un.</span>
    ),
  },
  {
    // Coluna computada: `orders` não é um campo ordenável na linha, então o
    // `sortAccessor` é obrigatório — sem ele o TanStack compararia o array.
    key: 'lojas',
    label: 'Qtd. Lojas',
    width: '130px',
    minWidth: '110px',
    align: 'center',
    sortable: true,
    sortAccessor: (prod) => prod.ordersCount ?? prod.orders.length,
    filterAccessor: (prod) => `${prod.ordersCount ?? prod.orders.length} loja(s)`,
    render: (prod) => (
      <span className="whitespace-nowrap font-medium text-muted-foreground">
        {prod.ordersCount ?? prod.orders.length} loja(s)
      </span>
    ),
  },
  {
    // `totalValue` é numérico na linha, mas o texto exibido é "R$ 1.234,56" —
    // o `sortAccessor` explícito documenta que a ordem é pelo número, não pela
    // string formatada.
    key: 'totalValue',
    label: 'Valor Total',
    width: '160px',
    minWidth: '130px',
    align: 'right',
    sortable: true,
    sortAccessor: (prod) => prod.totalValue,
    filterAccessor: (prod) => formatCurrency(prod.totalValue),
    render: (prod) => (
      <span className="whitespace-nowrap font-mono font-bold text-foreground">
        {formatCurrency(prod.totalValue)}
      </span>
    ),
  },
];

// "Aguardando Faturamento" acrescenta a data do pedido mais recente do produto.
const COLUNAS_AGUARDANDO: ColumnConfig<GroupedProduct>[] = [
  ...COLUNAS_PRODUTO,
  {
    key: 'ultimoPedido',
    label: 'Últ. Pedido',
    width: '150px',
    minWidth: '120px',
    align: 'center',
    sortable: true,
    sortAccessor: (prod) => latestOrder(prod).ts,
    filterAccessor: (prod) => latestOrder(prod).label,
    render: (prod) => {
      const { label } = latestOrder(prod);
      return (
        <span className="whitespace-nowrap text-muted-foreground">{label || '—'}</span>
      );
    },
  },
];

// O Histórico usa o mesmo contrato visual do `DynamicTable`, mas mantém a
// ordenação global no painel server-side logo acima. Desabilitar o sort local
// evita reordenar apenas o lote já carregado e fabricar uma ordem parcial.
const COLUNAS_HISTORICO: ColumnConfig<GroupedProduct>[] = COLUNAS_PRODUTO.map(
  (column) => ({ ...column, sortable: false }),
);

const PRODUCT_SORT_BY_COLUMN: Record<string, ProductSort> = {
  code: 'code',
  name: 'name',
  totalQty: 'totalQty',
  lojas: 'ordersCount',
  totalValue: 'totalValue',
  ultimoPedido: 'lastOrderAt',
  tempoRestante: 'remainingWindow',
};

function resolveProductSorting(
  sorting: DynamicTableSortingState,
  fallbackSort: ProductSort,
  fallbackOrder: SortOrder,
): { sort: ProductSort; order: SortOrder } {
  const first = sorting[0];
  const sort = first ? PRODUCT_SORT_BY_COLUMN[first.id] : undefined;
  return sort
    ? { sort, order: first.desc ? 'desc' : 'asc' }
    : { sort: fallbackSort, order: fallbackOrder };
}

interface OrdersListProps {
  /** Fixtures opcionais para testes isolados; a aplicação usa os endpoints paginados. */
  orders?: Order[];
  communications?: Communication[];
  setCommunications?: React.Dispatch<React.SetStateAction<Communication[]>>;
  alerts?: OrderAlert[];
  setAlerts?: React.Dispatch<React.SetStateAction<OrderAlert[]>>;
  selectedChannel: 'Todos' | 'Franquia' | 'Multimarca';
  // Refaz o fetch dos pedidos após uma escrita. O backend é a fonte de verdade
  // do resultado da OR e do ciclo de vida das 24h, então relemos em vez de
  // reconstruir o estado no cliente.
  refetchOrders?: () => boolean | Promise<boolean>;
  isAdequacaoActive: boolean;
  activeTab: 'abertos' | 'historico' | 'alertas';
  /** Total agregado do canal, independente da busca da tabela. */
  awaitingChannelTotal?: number;
  /** Total autoritativo de pedidos em edição, quando o backend o disponibilizar. */
  editingChannelTotal?: number;
  channelTotalsLoading?: boolean;
  channelTotalsError?: string | null;
  onRetryChannelTotals?: () => void;
}

// Constantes fora do componente — não são recriadas em cada render.
const STATUS_FILTER_OPTIONS = ['Todos', 'Com Adequação', 'Sem Adequação', 'Bloqueado Estoque', 'Bloqueado Crédito'] as const;
const SORT_FILTER_OPTIONS = ['Mais recente', 'Maior valor'] as const;
type HistorySortOption = (typeof SORT_FILTER_OPTIONS)[number];

// Alternador "Pedidos similares" no toolbar do `DynamicTable`. As demais
// pílulas segmentadas viraram ordenação por cabeçalho; esta NÃO é ordenação de
// coluna: ela reordena os PEDIDOS por assinatura de cesta antes do agrupamento,
// então produtos de pedidos com peças/quantidades equivalentes ficam vizinhos.
// Por isso continua um controle do toolbar, não um `<th>` clicável.
//
// Só o que a base do `Pressable` NÃO entrega fica aqui: o anel de foco
// (`ds-focus-ring`), a transição e o `active:translate-y-px` já vêm do
// componente. `cursor-pointer` permanece porque o preflight do Tailwind 4 dá
// `cursor: default` a <button> e o `Pressable` — ao contrário do `Button` — não
// repõe o ponteiro. Altura e raio acompanham o botão de filtro do DS ao lado.
const toolbarToggleClass = (isActive: boolean) =>
  `h-10 shrink-0 rounded-[var(--radius-pill)] border px-4 text-xs font-bold shadow-control cursor-pointer duration-[var(--motion-duration-fast)] ${
    isActive
      ? 'bg-info/10 text-info-text ds-border-info'
      : 'bg-card text-muted-foreground ds-border-card hover:text-foreground'
  }`;

// O design system não tem variante `success` no Button (só default | destructive
// | outline | secondary | ghost | link — ver design-system/components/ui/button/
// variants.ts), e "com adequação" é a família cromática que o painel inteiro usa
// para essa ação. Então a cor entra por className, mas 100% em token — incluindo
// `hover:ds-border-success-strong`, que anula o `hover:ds-border-emphasis-strong`
// herdado do variant `default` (o tailwind-merge não reconhece as `ds-border-*`,
// que são @utility, então sem isto a borda de hover sairia com tinta primária).
const OR_COM_ADEQUACAO_BUTTON_CLASS =
  'bg-success text-success-foreground-strong hover:bg-success/90 hover:ds-border-success-strong';

export function OrdersList({
  orders: injectedOrders,
  communications: injectedCommunications,
  setCommunications: injectedSetCommunications,
  alerts: injectedAlerts,
  setAlerts: injectedSetAlerts,
  selectedChannel,
  refetchOrders: injectedRefetchOrders,
  activeTab,
  awaitingChannelTotal,
  editingChannelTotal,
  channelTotalsLoading = false,
  channelTotalsError = null,
  onRetryChannelTotals,
}: OrdersListProps) {
  // Cada fila tem busca e cursor próprios. As props opcionais só existem para
  // fixtures dos testes; nas páginas reais nenhum array completo é injetado.
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [searchTermLiberados, setSearchTermLiberados] = useState('');
  const debouncedSearchTermLiberados = useDebounce(searchTermLiberados, 300);
  const usingServerOrders = injectedOrders === undefined;
  const [awaitingSorting, setAwaitingSorting] = useState<DynamicTableSortingState>([
    { id: 'ultimoPedido', desc: true },
  ]);
  const [editingSorting, setEditingSorting] = useState<DynamicTableSortingState>([
    { id: 'tempoRestante', desc: false },
  ]);
  const awaitingServerSorting = resolveProductSorting(
    awaitingSorting,
    'lastOrderAt',
    'desc',
  );
  const editingServerSorting = resolveProductSorting(
    editingSorting,
    'remainingWindow',
    'asc',
  );

  const queues = usePedidosQueues({
    enabled: activeTab === 'abertos' && injectedOrders === undefined,
    channel: selectedChannel,
    awaitingSearch: debouncedSearchTermLiberados,
    editingSearch: debouncedSearchTerm,
    awaitingSort: awaitingServerSorting.sort,
    awaitingOrder: awaitingServerSorting.order,
    editingSort: editingServerSorting.sort,
    editingOrder: editingServerSorting.order,
  });
  const feeds = useAlertsCommunications({
    enabled: activeTab === 'alertas'
      && injectedAlerts === undefined
      && injectedCommunications === undefined,
    channel: selectedChannel,
  });

  const orders = useMemo(
    () => injectedOrders ?? [],
    [injectedOrders],
  );
  const communications = injectedCommunications ?? feeds.communications.rows;
  const alerts = injectedAlerts ?? feeds.alerts.rows;
  const reloadAllOrders = queues.reloadAll;
  const setCommunications = injectedSetCommunications ?? feeds.communications.setRows;
  const setAlerts = injectedSetAlerts ?? feeds.alerts.setRows;
  const refetchOrders = useCallback(() => {
    void injectedRefetchOrders?.();
    if (injectedOrders === undefined) {
      void reloadAllOrders();
    }
  }, [injectedRefetchOrders, injectedOrders, reloadAllOrders]);

  // Timer inteligente: só atualiza "now" quando há pedidos em Stage 2 (janela de
  // 24h). Sem Stage 2 o timer não dispara re-renders desnecessários no componente.
  const [now, setNow] = useState(() => Date.now());
  const hasStage2Orders = usingServerOrders
    ? queues.editing.rows.length > 0
    : orders.some(o => !!o.processedAt && !o.aprovado);
  useEffect(() => {
    if (!hasStage2Orders) return;
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, [hasStage2Orders]);

  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [tempStatusFilter, setTempStatusFilter] = useState<'Todos' | 'Com Adequação' | 'Sem Adequação' | 'Bloqueado Estoque' | 'Bloqueado Crédito'>('Todos');
  const [tempSortFilter, setTempSortFilter] = useState<HistorySortOption>('Mais recente');
  const [activeStatusFilter, setActiveStatusFilter] = useState<'Todos' | 'Com Adequação' | 'Sem Adequação' | 'Bloqueado Estoque' | 'Bloqueado Crédito'>('Todos');
  const [activeSortFilter, setActiveSortFilter] = useState<HistorySortOption>('Mais recente');
  // Resto da antiga pílula "Pedidos Similares" — as outras (Cliente, Maior
  // Valor, Mais Recentes) viraram ordenação por cabeçalho no `DynamicTable`.
  const [agruparSimilares, setAgruparSimilares] = useState(false);
  const [isAguardandoExpanded, setIsAguardandoExpanded] = useState(true);
  const [isEmEdicaoExpanded, setIsEmEdicaoExpanded] = useState(true);
  const [showNewMsgModal, setShowNewMsgModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const { hasMinLevel } = usePermissions();
  // Booleano estável para as deps dos memos de ação — `hasMinLevel` é recriada
  // a cada render pelo hook.
  const podeAgir = hasMinLevel(20);
  const [selectedGroupedProduct, setSelectedGroupedProduct] = useState<GroupedProduct | null>(null);
  const [approvingProductKey, setApprovingProductKey] = useState<string | null>(null);

  // ── Máquina de estados do faturamento (front-end) ──────────────────────────
  // A regra vive em `features/pedidos/lib/order-lifecycle.ts` (unidade testável).
  // `isAwaitingFaturamento` entra direto do módulo (não depende de `now`); os
  // dois abaixo só amarram o `now` do relógio do componente.
  const isInEditWindow = useCallback(
    (order: Order): boolean => isOrderInEditWindow(order, now),
    [now],
  );

  const getFormattedRemainingTime = useCallback(
    (order: Order): string => formatRemainingTime(order, now),
    [now],
  );

  const getProductRemainingTime = useCallback((product: GroupedProduct): string => {
    const remainingMs = product.remainingWindowDeadlineAt != null
      ? product.remainingWindowDeadlineAt - now
      : product.remainingWindowMs != null
        ? product.remainingWindowMs
        : product.processedAt
          ? DAY_MS - (now - product.processedAt)
          : null;
    if (remainingMs === null) return '';
    if (remainingMs <= 0) return 'Expirado (>24h)';
    const hours = Math.floor(remainingMs / (3600 * 1000));
    const minutes = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));
    return `Restam ${hours}h ${minutes}m`;
  }, [now]);

  const isProductWindowExpired = useCallback((product: GroupedProduct): boolean => {
    if (product.remainingWindowDeadlineAt != null) {
      return now >= product.remainingWindowDeadlineAt;
    }
    if (product.remainingWindowMs !== null && product.remainingWindowMs !== undefined) {
      return product.remainingWindowMs <= 0;
    }
    return Boolean(product.processedAt && now >= product.processedAt + DAY_MS);
  }, [now]);
  const canEditSelectedProduct = Boolean(
    podeAgir
    && selectedGroupedProduct?.stage === 'edicao'
    && !isProductWindowExpired(selectedGroupedProduct),
  );

  // A aprovação automática por 24h é AUTORITATIVA do back-end: ao recarregar,
  // a OR com mais de 24h volta com `aprovado=true` (derivado de created_at).
  // Aqui não mutamos mais o estado (evita o cliente fabricar estado divergente);
  // a transição visual para o Histórico é derivada do `aprovado` do envelope.

  // Estados do rascunho de comunicação.
  const [draftRecipient, setDraftRecipient] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [selectedOrderRefForDraft, setSelectedOrderRefForDraft] = useState('');
  const [isSendingDraft, setIsSendingDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  // A mesma chave sobrevive a retries do MESMO payload. Se o operador editar o
  // rascunho após uma falha, a impressão muda e a próxima submissão recebe uma
  // chave nova — reutilizar a antiga com outro payload causaria 409 no backend.
  const draftIdempotencyKeyRef = useRef<{
    fingerprint: string;
    key: string;
  } | null>(null);

  // Histórico também usa a projeção autoritativa por produto. Assim totais,
  // lojas e detalhes nunca são uma redução parcial da página de itens.
  const { topicRevisions } = useRealtime();

  const { isProcessingOr, startAdequacaoAttempt, handleRetryAdequacao } = useAdequacaoProcessing({
    selectedChannel,
    ordersRevision: topicRevisions.orders,
    usingServerOrders,
    reloadAllOrders,
    refetchSummary: injectedRefetchOrders,
    setConfirmModal,
  });

  const historySorting = useMemo<{ sort: ProductSort; order: SortOrder }>(() => {
    if (activeSortFilter === 'Maior valor') return { sort: 'totalValue', order: 'desc' };
    return { sort: 'lastOrderAt', order: 'desc' };
  }, [activeSortFilter]);
  const fetchHistoryProducts = useCallback(
    (page: number, signal: AbortSignal) => fetchProductNumberedPage({
      stage: 'historico',
      channel: selectedChannel,
      search: debouncedSearchTerm,
      status: activeStatusFilter,
      sort: historySorting.sort,
      order: historySorting.order,
      page,
      signal,
    }),
    [activeStatusFilter, debouncedSearchTerm, historySorting, selectedChannel],
  );
  const historyProducts = usePagedResource({
    enabled: activeTab === 'historico',
    queryKey: `${selectedChannel}|${debouncedSearchTerm}|${activeStatusFilter}|${historySorting.sort}|${historySorting.order}`,
    fetchPage: fetchHistoryProducts,
  });
  const reloadHistoryProducts = useRealtimeResourceRefresh({
    enabled: activeTab === 'historico',
    topic: 'history',
    revision: topicRevisions.history,
    loadedOnce: historyProducts.loadedOnce,
    loading: historyProducts.loading || historyProducts.refreshing,
    error: historyProducts.error,
    refresh: historyProducts.reload,
  });

  // Submit communication — o 202 confirma a persistência na outbox, não a
  // entrega SMTP. A mesma chave identifica todos os retries desta tentativa.
  const handleSendDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftRecipient || !draftBody || isSendingDraft) return;
    if (draftRecipient.length > 254 || draftBody.length > 10_000) {
      setDraftError('A comunicação excede os limites permitidos: 254 caracteres no destinatário e 10.000 no conteúdo.');
      return;
    }

    setIsSendingDraft(true);
    setDraftError(null);

    try {
      const fingerprint = JSON.stringify({
        recipient: draftRecipient,
        content: draftBody,
        orderRef: selectedOrderRefForDraft || null,
      });
      if (draftIdempotencyKeyRef.current?.fingerprint !== fingerprint) {
        draftIdempotencyKeyRef.current = {
          fingerprint,
          key: crypto.randomUUID(),
        };
      }
      const created = await criarComunicacao({
        recipient: draftRecipient,
        content: draftBody,
        orderRef: selectedOrderRefForDraft || null,
        idempotencyKey: draftIdempotencyKeyRef.current.key,
      });

      let refreshed = true;
      if (injectedCommunications !== undefined) {
        setCommunications(prev => [created, ...prev]);
      } else {
        refreshed = await feeds.communications.reload();
      }
      draftIdempotencyKeyRef.current = null;
      setShowNewMsgModal(false);
      const deliveryCopy = created.status === 'Pendente'
        ? 'Comunicação agendada para envio.'
        : created.status === 'Falhou'
          ? 'Não foi possível entregar após novas tentativas.'
          : created.status === 'Incerto'
            ? 'O provedor não confirmou o resultado. Não reenvie; solicite verificação.'
            : 'Comunicação registrada; o status atualizado está disponível no histórico.';
      setConfirmModal({
        isOpen: true,
        type: created.status === 'Falhou' || created.status === 'Incerto' || !refreshed ? 'alert' : 'success',
        title: refreshed
          ? deliveryCopy
          : `${deliveryCopy} A lista de comunicações não pôde ser atualizada agora.`,
      });

    } catch (err) {
      const status = (err as ApiError)?.status;
      let msg = 'Não foi possível confirmar o agendamento. Tente novamente; a mesma tentativa será reutilizada com segurança.';
      if (status === 503) {
        msg = 'O serviço de agendamento está temporariamente indisponível. Tente novamente.';
      } else if (status === 429) {
        msg = 'Muitas tentativas em pouco tempo. Aguarde antes de tentar novamente.';
      } else if (status === 409) {
        msg = 'Esta tentativa conflitou com outro conteúdo. Revise a mensagem e tente novamente.';
      } else if (status === 422) {
        msg = 'Dados inválidos. Confira o destinatário e o limite de 10.000 caracteres da mensagem.';
      }
      if (status === 409 || status === 422) draftIdempotencyKeyRef.current = null;
      setDraftError(msg);
    } finally {
      setIsSendingDraft(false);
    }
  };

  const matchesChannelAndSearch = useCallback((o: Order): boolean => {
    const matchesChannel = selectedChannel === 'Todos' || o.canal === selectedChannel;
    const term = (debouncedSearchTerm || '').toLowerCase();
    const matchesSearch =
      (o.id || '').toLowerCase().includes(term) ||
      (o.client || '').toLowerCase().includes(term);
    return matchesChannel && matchesSearch;
  }, [selectedChannel, debouncedSearchTerm]);

  // Estágio 1 SEM o termo de busca. É esta contagem que decide se o painel
  // inteiro aparece: antes a moldura sumia junto com o resultado da busca,
  // levando embora a própria caixa de busca — quem digitasse algo sem resultado
  // ficava sem como limpar o termo.
  const awaitingBase = useMemo(
    () => orders.filter(o => isAwaitingFaturamento(o) && (selectedChannel === 'Todos' || o.canal === selectedChannel)),
    [orders, selectedChannel],
  );

  // Estágio 1 — Recebidos aguardando faturamento. Alvo dos botões de OR e base da
  // previsão de faturamento.
  //
  // A ordenação saiu daqui: Cliente/Maior Valor/Mais Recentes agora são clique
  // no cabeçalho do `DynamicTable`. O que sobra é "Pedidos similares", que NÃO é
  // ordenação de coluna — ordena os PEDIDOS por assinatura de cesta para que os
  // produtos de pedidos equivalentes saiam vizinhos no agrupamento.
  const awaitingList = useMemo(() => {
    const term = (debouncedSearchTermLiberados || '').toLowerCase();
    const list = awaitingBase.filter(o =>
      (o.id || '').toLowerCase().includes(term) ||
      (o.client || '').toLowerCase().includes(term) ||
      (o.items || []).some(item =>
        (item.name || '').toLowerCase().includes(term) ||
        (item.code || '').toLowerCase().includes(term)
      )
    );

    if (agruparSimilares) {
      list.sort((a, b) => buildBasketSignature(a.items).localeCompare(buildBasketSignature(b.items)));
    }

    return list;
  }, [awaitingBase, debouncedSearchTermLiberados, agruparSimilares]);

  const liberadosList = awaitingList;

  const allGroupedLiberadosProducts = useMemo(
    () => usingServerOrders
      ? queues.awaiting.rows.map((product) => projectionToGroupedProduct(product, 'aguardando'))
      : groupOrdersByProduct(liberadosList),
    [liberadosList, queues.awaiting.rows, usingServerOrders],
  );

  // Estágio 2 — Processados por um botão de OR, editáveis por 24h, aguardando
  // aprovação manual (ou automática ao expirar as 24h).
  const emEdicaoListBase = useMemo(
    () => orders.filter(o => isInEditWindow(o) && (selectedChannel === 'Todos' || o.canal === selectedChannel)),
    [orders, isInEditWindow, selectedChannel],
  );

  const emEdicaoList = useMemo(
    () => emEdicaoListBase.filter(o => matchesChannelAndSearch(o)),
    [emEdicaoListBase, matchesChannelAndSearch],
  );

  const allGroupedEmEdicaoProducts = useMemo(
    () => usingServerOrders
      ? queues.editing.rows.map((product) => projectionToGroupedProduct(product, 'edicao'))
      : groupOrdersByProduct(emEdicaoList),
    [emEdicaoList, queues.editing.rows, usingServerOrders],
  );

  const allGroupedHistoricoProducts = useMemo(() => {
    return historyProducts.rows.map((product) =>
      projectionToGroupedProduct(product, 'historico'));
  }, [historyProducts.rows]);

  // O backend já devolve exatamente a página solicitada. Recortar novamente no
  // cliente fazia a página 2 ser tratada como uma segunda fatia da própria
  // página 2 e podia produzir uma tabela vazia.
  const groupedHistoricoList = allGroupedHistoricoProducts;

  // Fixtures antigas continuam usando uma janela local. Na aplicação, cada
  // clique avança o cursor do backend e acrescenta somente a página recebida.
  const janelaAguardandoLocal = useLoadMore(allGroupedLiberadosProducts, {
    resetKey: `${selectedChannel}|${debouncedSearchTermLiberados}|${agruparSimilares}`,
  });
  const janelaEmEdicaoLocal = useLoadMore(allGroupedEmEdicaoProducts, {
    resetKey: `${selectedChannel}|${debouncedSearchTerm}`,
  });
  // No caminho servidor `visiveis` é a PÁGINA corrente, não um acumulado: é
  // exatamente essa troca que tira as 25×N linhas da memória e do DOM. As
  // fixtures continuam na janela local — os testes que injetam `orders` dependem
  // do rodapé de "carregar mais".
  const janelaAguardando = usingServerOrders ? {
    visiveis: allGroupedLiberadosProducts,
    carregados: queues.awaiting.rows.length,
    total: queues.awaiting.total,
  } : janelaAguardandoLocal;
  const janelaEmEdicao = usingServerOrders ? {
    visiveis: allGroupedEmEdicaoProducts,
    carregados: queues.editing.rows.length,
    total: queues.editing.total,
  } : janelaEmEdicaoLocal;

  const awaitingStageTotal = usingServerOrders
    ? (awaitingChannelTotal ?? null)
    : awaitingBase.length;
  const editingStageTotal = usingServerOrders
    ? (editingChannelTotal ?? null)
    : emEdicaoListBase.length;
  const channelTotalsUnavailable = usingServerOrders
    && (channelTotalsLoading || Boolean(channelTotalsError) || awaitingStageTotal === null);
  const hasAwaitingProducts = usingServerOrders
    ? queues.awaiting.total > 0
    : (awaitingStageTotal ?? 0) > 0;
  const hasEditingProducts = usingServerOrders
    ? queues.editing.total > 0
    : (editingStageTotal ?? 0) > 0;

  // A previsão soma o que está NA TELA, não o canal inteiro — o backend não
  // expõe esse agregado. Com o cursor a soma era do lote acumulado; com página
  // numerada é da página. `previsaoParcial` liga a ressalva no rótulo sempre que
  // existe produto fora da soma, para o número não passar por total do canal.
  const previsaoParcial = usingServerOrders
    && queues.awaiting.total > queues.awaiting.rows.length;

  const fatorAdequacao = useToleranciaAdequacaoFator();
  const [faturamentoSemAdequacaoLiberados, faturamentoComAdequacaoLiberados] = useMemo(() => {
    if (usingServerOrders) {
      const sem = queues.awaiting.rows.reduce((sum, product) => sum + product.totalValue, 0);
      return [sem, sem * fatorAdequacao];
    }
    let sem = 0, com = 0;
    for (const o of awaitingList) {
      const base = o.items.reduce((sum, item) => sum + item.qty * item.unitValue, 0);
      sem += base;
      com += base * fatorAdequacao;
    }
    return [sem, com];
  }, [awaitingList, queues.awaiting.rows, usingServerOrders, fatorAdequacao]);

  // Os dois botões que disparam estes handlers já ficam `disabled` quando o
  // total é nulo/zero ou falta permissão — aqui só resta o narrowing que o TS
  // exige para `awaitingStageTotal`.
  const triggerConfirmOrSemAdequacao = () => {
    if (awaitingStageTotal === null) return;
    setConfirmModal({
      isOpen: true,
      type: 'sem',
      title: `Deseja agendar o processamento sem adequação de ${awaitingStageTotal} pedido${awaitingStageTotal !== 1 ? 's' : ''} em aberto? A aplicação será feita em checkpoints retomáveis.`,
    });
  };

  const triggerConfirmOrComAdequacao = () => {
    if (awaitingStageTotal === null) return;
    setConfirmModal({
      isOpen: true,
      type: 'com',
      title: `Deseja agendar o processamento com adequação de ${awaitingStageTotal} pedido${awaitingStageTotal !== 1 ? 's' : ''} em aberto? A aplicação será feita em checkpoints retomáveis.`,
    });
  };

  const handleEfetuarOrSemAdequacao = () => startAdequacaoAttempt('sem_adequar');

  const handleEfetuarOrComAdequacao = () => startAdequacaoAttempt('adequar');

  // Ação por linha de produto. Não existe endpoint para gerar a OR de UM produto
  // isoladamente — o processamento é em lote, porque o estoque de um produto é
  // disputado entre todos os clientes que o pediram e a alocação depende da
  // prioridade global. As duas funções que existiam aqui não chamavam API
  // nenhuma: mexiam no estado local e diziam "processado", e no fetch seguinte o
  // pedido reaparecia como aberto.
  const avisarOrIndividualIndisponivel = useCallback(() =>
    setConfirmModal({
      isOpen: true,
      type: 'alert',
      title: 'A geração de OR de um produto isolado ainda não existe no servidor. '
        + 'O estoque é disputado entre os clientes do produto, então use os botões '
        + 'de processamento em lote acima.',
    }), [setConfirmModal]);

  // Aprovação autoritativa por produto. O endpoint aplica todas as ORs sob uma
  // única transação e devolve contagens bounded; a tela só confirma depois do
  // POST e da releitura REST terminarem.
  const aprovarProduto = useCallback(async (prod: GroupedProduct) => {
    const channel = prod.channel;
    if (!channel) {
      setConfirmModal({
        isOpen: true,
        type: 'alert',
        title: 'O canal autoritativo do produto não foi informado. Recarregue a lista antes de aprovar.',
      });
      return false;
    }
    if (isProductWindowExpired(prod)) {
      setConfirmModal({
        isOpen: true,
        type: 'alert',
        title: 'A janela deste produto expirou. A lista será recarregada para confirmar o histórico.',
      });
      if (usingServerOrders) void reloadAllOrders();
      return false;
    }
    const operationKey = `${channel}|${prod.code}`;
    if (approvingProductKey !== null) return false;
    setApprovingProductKey(operationKey);
    try {
      const result = await approveProduct(prod.code, channel);
      let refreshed = true;
      if (usingServerOrders) {
        refreshed = await reloadAllOrders();
      } else {
        injectedRefetchOrders?.();
      }
      if (!refreshed) {
        setConfirmModal({
          isOpen: true,
          type: 'alert',
          title: `O produto ${prod.code} foi processado, mas a lista não pôde ser atualizada. Recarregue para confirmar o estado.`,
        });
        return false;
      }
      const approved = result.approvedCount + result.alreadyApprovedCount;
      if (result.matchedCount === 0 || approved === 0) {
        setConfirmModal({
          isOpen: true,
          type: 'alert',
          title: result.expiredCount > 0
            ? `Nenhuma OR do produto ${prod.code} pôde ser aprovada; ${result.expiredCount} já haviam expirado.`
            : `Nenhuma OR elegível foi encontrada para o produto ${prod.code}. Recarregue a lista.`,
        });
        return false;
      }
      setConfirmModal({
        isOpen: true,
        type: result.expiredCount > 0 ? 'alert' : 'success',
        title: result.expiredCount > 0
          ? `${approved} OR(s) do produto ${prod.code} estão aprovadas; ${result.expiredCount} já haviam expirado.`
          : `${approved} OR(s) do produto ${prod.code} confirmadas no servidor.`,
      });
      return true;
    } catch {
      setConfirmModal({
        isOpen: true,
        type: 'alert',
        title: `Não foi possível aprovar o produto ${prod.code}. Nada foi alterado na tela.`,
      });
      return false;
    } finally {
      setApprovingProductKey(null);
    }
  }, [
    approvingProductKey,
    injectedRefetchOrders,
    isProductWindowExpired,
    reloadAllOrders,
    usingServerOrders,
  ]);

  // ── Ações por linha (menu "..." do DynamicTable) ───────────────────────────
  // Sem permissão o array vai vazio de propósito: o `DynamicTable` só desenha a
  // coluna "Ações" quando há ao menos uma ação, que é exatamente o
  // `hasMinLevel(20)` que envolvia a antiga <TableCell> de botões.
  //
  // As duas ações de OR por produto continuam HABILITADAS, chamando o mesmo
  // aviso de antes. Desabilitar com `disabledReason` esconderia a explicação
  // dentro de um `title` (só hover — não chega a teclado nem a toque), e é a
  // explicação que diz o que fazer no lugar ("use os botões de processamento em
  // lote acima"). Quando o endpoint por produto existir, só o `onClick` muda.
  const acoesAguardando = useMemo<Action<GroupedProduct>[]>(() => {
    if (!podeAgir) return [];
    return [
      {
        label: 'Efetuar OR sem adequação',
        icon: Scale,
        onClick: avisarOrIndividualIndisponivel,
      },
      {
        label: 'Efetuar OR com adequação',
        icon: Sparkles,
        onClick: avisarOrIndividualIndisponivel,
      },
    ];
  }, [podeAgir, avisarOrIndividualIndisponivel]);

  const acoesEmEdicao = useMemo<Action<GroupedProduct>[]>(() => {
    if (!podeAgir) return [];
    return [
      {
        label: 'Editar grade por cliente',
        icon: Pencil,
        onClick: (prod) => setSelectedGroupedProduct(prod),
        disabled: isProductWindowExpired,
        disabledReason: () => 'A janela de edição expirou; aguarde a atualização do histórico.',
      },
      {
        label: 'Aprovar OR imediatamente',
        icon: CheckCircle,
        onClick: aprovarProduto,
        disabled: (prod) => isProductWindowExpired(prod)
          || approvingProductKey === `${prod.channel ?? 'sem-canal'}|${prod.code}`,
        disabledReason: (prod) => isProductWindowExpired(prod)
          ? 'A janela de aprovação expirou; aguarde a atualização do histórico.'
          : 'Aprovação em andamento.',
      },
    ];
  }, [podeAgir, aprovarProduto, approvingProductKey, isProductWindowExpired]);

  const acoesHistorico = useMemo<Action<GroupedProduct>[]>(() => [
    {
      label: 'Ver grade por cliente',
      icon: Eye,
      onClick: (prod) => setSelectedGroupedProduct(prod),
    },
  ], []);

  // "Tempo Restante" depende de `now` (o timer de 1 min), então esta coluna —
  // ao contrário das demais — é construída dentro do componente. É ela que dá
  // destino à pílula "Mais Tempo / Menos Tempo", que existia no toolbar mas
  // NUNCA era aplicada: nenhum memo lia esse estado, então clicar nela não
  // reordenava nada. Agora a ordenação por prazo funciona de fato.
  const colunasEmEdicao = useMemo<ColumnConfig<GroupedProduct>[]>(() => [
    ...COLUNAS_PRODUTO,
    {
      key: 'tempoRestante',
      label: 'Tempo Restante',
      width: '180px',
      minWidth: '150px',
      align: 'center',
      sortable: true,
      sortAccessor: (prod) => {
        if (prod.remainingWindowDeadlineAt != null) {
          return prod.remainingWindowDeadlineAt - now;
        }
        if (prod.remainingWindowMs !== null && prod.remainingWindowMs !== undefined) {
          return prod.remainingWindowMs;
        }
        if (prod.processedAt) return DAY_MS - (now - prod.processedAt);
        const processedAt = prod.orders[0]?.order.processedAt;
        return processedAt ? DAY_MS - (now - processedAt) : Number.NEGATIVE_INFINITY;
      },
      filterAccessor: (prod) => {
        const authoritative = getProductRemainingTime(prod);
        if (authoritative) return authoritative;
        const firstOrder = prod.orders[0]?.order;
        return firstOrder ? getFormattedRemainingTime(firstOrder) : '';
      },
      render: (prod) => {
        const firstOrder = prod.orders[0]?.order;
        const timeStr = getProductRemainingTime(prod)
          || (firstOrder ? getFormattedRemainingTime(firstOrder) : '');
        return timeStr ? (
          <Badge variant="warning" size="label" className="font-mono">
            <Clock className="h-3 w-3 animate-pulse" />
            {timeStr}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
  ], [now, getFormattedRemainingTime, getProductRemainingTime]);

  const openError = queues.awaiting.error ?? queues.editing.error;
  const feedsError = feeds.alerts.error ?? feeds.communications.error;
  const initialOpenLoading = usingServerOrders
    && (!queues.awaiting.loadedOnce || !queues.editing.loadedOnce)
    && (queues.awaiting.loading || queues.editing.loading)
    && !openError;
  const initialFeedsLoading = activeTab === 'alertas'
    && injectedAlerts === undefined
    && injectedCommunications === undefined
    && (!feeds.alerts.loadedOnce || !feeds.communications.loadedOnce)
    && (feeds.alerts.loading || feeds.communications.loading)
    && !feedsError;
  if (activeTab === 'abertos' && initialOpenLoading) {
    return <OrdersListSkeleton activeTab="abertos" />;
  }
  if (activeTab === 'alertas' && initialFeedsLoading) {
    return <OrdersListSkeleton activeTab="alertas" label="Carregando alertas do servidor..." />;
  }
  if (
    activeTab === 'historico'
    && !historyProducts.loadedOnce
    && historyProducts.loading
  ) {
    return <OrdersListSkeleton activeTab="historico" label="Carregando histórico do servidor..." />;
  }
  if (
    activeTab === 'abertos'
    && usingServerOrders
    && openError
    && queues.awaiting.rows.length === 0
    && queues.editing.rows.length === 0
    && (!queues.awaiting.loadedOnce || !queues.editing.loadedOnce)
  ) {
    return <ErrorState message={openError} onRetry={refetchOrders} />;
  }
  if (activeTab === 'alertas' && feedsError && alerts.length === 0 && communications.length === 0) {
    return <ErrorState
      message={feedsError}
      onRetry={() => { void Promise.all([feeds.alerts.reload(), feeds.communications.reload()]); }}
    />;
  }
  if (activeTab === 'historico' && historyProducts.error && historyProducts.rows.length === 0) {
    return <ErrorState message={historyProducts.error} onRetry={() => { void reloadHistoryProducts(); }} />;
  }

  const backgroundError = activeTab === 'abertos'
    ? openError
    : activeTab === 'alertas'
      ? feedsError
      : historyProducts.error;

  return (
    <div className="flex flex-col gap-6">
      {backgroundError ? (
        <div role="alert" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-card border ds-border-warning bg-warning/5 p-4 text-sm text-foreground shadow-card">
          <span className="font-medium">Não foi possível atualizar os dados. Exibindo a última versão carregada.</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              if (activeTab === 'abertos') refetchOrders();
              else if (activeTab === 'alertas') void Promise.all([feeds.alerts.reload(), feeds.communications.reload()]);
              else void reloadHistoryProducts();
            }}
            className="shrink-0 sm:w-auto w-full font-medium"
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}
      

      {/* SEÇÃO 1: PEDIDOS RECEBIDOS — AGUARDANDO FATURAMENTO (somente botões) */}
      {activeTab === 'abertos' && (
        <div className="space-y-6">

          <div className="rounded-card border ds-border-card bg-card p-6 shadow-card" id="status-dos-pedidos-dashboard">
            <div className="mb-5">
              <Typography as="h2" variant="h4" className="text-foreground">Status dos Pedidos</Typography>
              <p className="text-sm text-muted-foreground mt-1">Acompanhe a quantidade de pedidos em cada etapa do processo de faturamento.</p>
            </div>

            {channelTotalsError && (
              <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-control border ds-border-destructive bg-destructive/10 p-3 text-sm text-destructive-text">
                <span>Não foi possível carregar as contagens autoritativas de pedidos. As ações em lote permanecem bloqueadas.</span>
                {onRetryChannelTotals && (
                  <Button type="button" size="sm" variant="outline" onClick={onRetryChannelTotals}>
                    Tentar novamente
                  </Button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Aguardando Faturamento */}
              <div className="rounded-card border ds-border-info bg-info/5 p-5 flex flex-col">
                <div className="flex items-start gap-4 mb-2">
                  <div className="h-16 w-16 rounded-pill bg-info/15 flex items-center justify-center shrink-0 mt-1">
                    <FileClock className="h-8 w-8 text-info-text" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-foreground text-base">Pedidos Aguardando Faturamento</h3>
                      <Badge variant="info" size="content">Pré-edição</Badge>
                    </div>
                    <div className="mt-1">
                      <span
                        className="text-5xl leading-none font-bold text-info-text tracking-tight"
                        aria-busy={channelTotalsLoading || undefined}
                      >
                        {awaitingStageTotal ?? '—'}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                  Pedidos que aguardam o processamento diário de faturamento. Às <strong className="font-bold text-foreground">19h</strong>, esses pedidos são automaticamente disponibilizados para edição, iniciando uma janela de alteração com duração de <strong className="font-bold text-foreground">24 horas</strong>.
                </p>
              </div>

              {/* Card 2: Liberados para Edição */}
              <div className="rounded-card border ds-border-success bg-success/5 p-5 flex flex-col">
                <div className="flex items-start gap-4 mb-2">
                  <div className="h-16 w-16 rounded-pill bg-success/15 flex items-center justify-center shrink-0 mt-1">
                    <FileEdit className="h-8 w-8 text-success-text" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-foreground text-base">Pedidos Liberados para Edição</h3>
                      <Badge variant="success" size="content">Em edição</Badge>
                    </div>
                    <div className="mt-1">
                      <span
                        className="text-5xl leading-none font-bold text-success-text tracking-tight"
                        aria-busy={channelTotalsLoading || undefined}
                      >
                        {editingStageTotal ?? '—'}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                  Pedidos que estão dentro da janela de edição. As alterações podem ser realizadas até as <strong className="font-bold text-foreground">19h do dia seguinte</strong>, quando a edição é encerrada e o pedido retorna ao fluxo de faturamento.
                </p>
              </div>
            </div>

            {/* Bottom Info Bar */}
            <div className="mt-4 rounded-control bg-info/5 border ds-border-info p-3.5 flex items-center gap-3">
              <Info className="h-5 w-5 text-info" />
              <p className="text-sm text-muted-foreground">
                <strong className="font-bold text-foreground">Fluxo:</strong> Aguardar processamento (até 19h) → Liberado para edição (por 24 horas) → Faturamento
              </p>
            </div>
          </div>

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Button 1: Efetuar OR sem adequação - BLUE */}
            <div className="rounded-card border ds-border-card bg-card p-6 hover:shadow-card transition-all duration-[var(--motion-duration-standard)] ease-standard flex flex-col items-center justify-center text-center">
              <div
                className={`w-full ${
                  channelTotalsUnavailable || awaitingStageTotal === 0 || !hasMinLevel(30) ? "cursor-not-allowed" : ""
                }`}
                title={!hasMinLevel(30) ? "Sem permissão para efetuar adequação" : channelTotalsUnavailable ? "Contagem autoritativa indisponível" : awaitingStageTotal === 0 ? "Nenhum pedido aguardando" : ""}
              >
                <Button
                  variant="secondary"
                  onClick={triggerConfirmOrSemAdequacao}
                  disabled={channelTotalsUnavailable || awaitingStageTotal === 0 || !hasMinLevel(30)}
                  className="w-full py-6 font-bold text-sm uppercase tracking-wider gap-3"
                >
                  <Scale className="h-5 w-5" />
                  <span>Efetuar OR sem adequação</span>
                </Button>
              </div>
              <div className="mt-4 flex flex-col items-center">
                <Subtitle as="span">
                  Previsão Sem Adequação{previsaoParcial ? ' · página atual' : ''}
                </Subtitle>
                <span className="font-bold text-foreground font-mono text-xl mt-1.5">{formatCurrency(faturamentoSemAdequacaoLiberados)}</span>
              </div>
            </div>

            {/* Button 2: Efetuar OR com adequação - GREEN */}
            <div className="relative rounded-card border ds-border-success bg-success/5 p-6 hover:shadow-card transition-all duration-[var(--motion-duration-standard)] ease-standard flex flex-col items-center justify-center text-center">
              <div
                className={`w-full ${
                  channelTotalsUnavailable || awaitingStageTotal === 0 || !hasMinLevel(30) ? "cursor-not-allowed" : ""
                }`}
                title={!hasMinLevel(30) ? "Sem permissão para efetuar adequação" : channelTotalsUnavailable ? "Contagem autoritativa indisponível" : awaitingStageTotal === 0 ? "Nenhum pedido aguardando" : ""}
              >
                <Button
                  onClick={triggerConfirmOrComAdequacao}
                  disabled={channelTotalsUnavailable || awaitingStageTotal === 0 || !hasMinLevel(30)}
                  className={`w-full ${OR_COM_ADEQUACAO_BUTTON_CLASS} py-6 font-bold text-sm uppercase tracking-wider gap-3`}
                >
                  <Sparkles className="h-5 w-5" />
                  <span>Efetuar OR com adequação</span>
                </Button>
              </div>
              {/* Rótulo e valor em neutro, espelhando o cartão gêmeo "Sem
                  Adequação": uma previsão de faturamento não é um estado de
                  sucesso, e `text-success` (#34c759) sobre `bg-success/5` fica em
                  ~2,1:1 de contraste — ilegível a 12px. A identidade cromática do
                  cartão continua na borda, no fundo e no botão. */}
              <div className="mt-4 flex flex-col items-center">
                <Subtitle as="span">
                  Previsão Com Adequação (+5%){previsaoParcial ? ' · página atual' : ''}
                </Subtitle>
                <span className="font-bold text-foreground font-mono text-xl mt-1.5">{formatCurrency(faturamentoComAdequacaoLiberados)}</span>
              </div>

              {/* Ícone de Informação com Tooltip — mesmo botão de ajuda do
                  `ChartCardHeader` (Pressable + ícone em text-muted-foreground):
                  é um "?" decorativo, não sinaliza estado nenhum. */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Pressable
                    variant="plain"
                    size="content"
                    aria-label="O que é Adequação?"
                    className="absolute bottom-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground cursor-help transition-colors hover:bg-surface-hover hover:text-foreground"
                  >
                    <Info className="h-5 w-5" />
                  </Pressable>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end" variant="info" className="w-64 text-left">
                  <p className="font-bold text-sm mb-1.5">O que é Adequação?</p>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-normal">
                    Ajuste automático das quantidades e tamanhos dos produtos conforme a disponibilidade de estoque do CD.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>


        {/* Lista de pedidos aguardando faturamento — SEM ações de edição/aprovação.
            A condição é a contagem SEM busca (`awaitingBase`): o resultado vazio
            de uma busca é responsabilidade do `emptyMessage` da tabela, que
            mantém a caixa de busca na tela para o usuário corrigir o termo. */}
        {hasAwaitingProducts ? (
          <div className="rounded-card border ds-border-card bg-card p-6 shadow-card mt-3">
            {/* Cabeçalho recolhível. O <h3>/<p> ficam FORA do controle (conteúdo
                de fluxo dentro de <button> é markup inválido — mesma correção já
                feita em features/pedidos/ui/order-detail-modal.tsx); o gatilho é
                um `Pressable` do DS, que já traz type="button", raio em token,
                `focus-visible:ds-focus-ring` e `active:translate-y-px`. */}
            <div className={`flex items-center justify-between gap-3 ${isAguardandoExpanded ? 'border-b ds-border-divider pb-4' : ''}`}>
              {/* Padrão de accordion do WAI-ARIA: o BOTÃO fica DENTRO do
                  heading, não o contrário. Assim o leitor de tela continua
                  anunciando o nível do título e o alvo de clique volta a ser a
                  frase inteira, em vez de só o chevron. */}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider font-heading">
                  <Pressable
                    variant="plain"
                    size="content"
                    onClick={() => setIsAguardandoExpanded(!isAguardandoExpanded)}
                    aria-expanded={isAguardandoExpanded}
                    aria-controls="awaiting-orders-list-content"
                    className="flex w-full items-center gap-1.5 text-left cursor-pointer rounded-[var(--radius-control)] hover:text-foreground focus-visible:ds-focus-ring"
                  >
                    <FileClock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    Relação de Pedidos Aguardando Faturamento
                  </Pressable>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Pedidos pendentes de adequação para liberação de faturamento.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="default" size="label" className="font-mono">
                  {awaitingStageTotal ?? '—'} Aguardando
                </Badge>
                {/* Indicador, não controle: quem alterna é o botão dentro do
                    heading. Dois controles para a mesma ação dariam duas
                    paradas de tabulação para o mesmo destino. */}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground" aria-hidden>
                  {isAguardandoExpanded ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </span>
              </div>
            </div>

            {isAguardandoExpanded && (
              <div className="pt-4" id="awaiting-orders-list-content">
                {/* A busca continua FORA da tabela em termos de semântica: ela
                    filtra os PEDIDOS (id, cliente, nome/código de peça) antes do
                    agrupamento por produto, e uma linha de produto não carrega o
                    nome do cliente. Por isso `searchValue`/`onSearchChange`
                    controlados, sem `searchKeys` — a caixa é a do design system,
                    o filtro continua sendo o do widget. */}
                <DynamicTable
                  data={janelaAguardando.visiveis}
                  columns={COLUNAS_AGUARDANDO}
                  actions={acoesAguardando}
                  stickyActions
                  rowKey={(prod) => `${prod.channel ?? selectedChannel}|${prod.code}`}
                  getRowLabel={(prod) => `${prod.code} — ${prod.name}`}
                  onRowClick={setSelectedGroupedProduct}
                  tableLabel="Pedidos aguardando faturamento, agrupados por produto"
                  searchLabel="Buscar pedidos aguardando faturamento"
                  searchPlaceholder="Buscar por pedido, cliente ou produto..."
                  searchValue={searchTermLiberados}
                  onSearchChange={(value) => setSearchTermLiberados(value.slice(0, 120))}
                  isSearching={searchTermLiberados !== debouncedSearchTermLiberados}
                  sorting={usingServerOrders ? awaitingSorting : undefined}
                  onSortingChange={usingServerOrders ? setAwaitingSorting : undefined}
                  manualSorting={usingServerOrders}
                  emptyMessage="Nenhum produto condizente com a busca."
                  itemsPerPage={LOAD_MORE_STEP}
                  // O rodapé de contagem genérico do DS ("N registros") sai de
                  // cena: ele contaria só o lote e mentiria sobre o conjunto.
                  // Quem informa "N de M" é o `footerRow` abaixo.
                  hideEndMessage
                  hideResultsCount
                  hideLoadingMessage
                  footerRow={
                    janelaAguardando.total === 0 ? null : usingServerOrders ? (
                      <PaginationControls
                        page={queues.awaiting.page}
                        pageSize={queues.awaiting.pageSize}
                        totalItems={queues.awaiting.total}
                        setPage={queues.awaiting.setPage}
                        noun={['produto', 'produtos']}
                        loading={queues.awaiting.refreshing}
                      />
                    ) : (
                      <LoadMoreFooter
                        id="awaiting-orders-load-more"
                        loaded={janelaAguardandoLocal.carregados}
                        total={janelaAguardandoLocal.total}
                        onLoadMore={janelaAguardandoLocal.carregarMais}
                        noun={['produto', 'produtos']}
                      />
                    )
                  }
                  toolbarActions={usingServerOrders ? undefined : (
                    <Pressable
                      pressed={agruparSimilares}
                      onClick={() => setAgruparSimilares(v => !v)}
                      className={toolbarToggleClass(agruparSimilares)}
                      title="Aproxima produtos de pedidos com peças e quantidades equivalentes"
                    >
                      Pedidos similares
                    </Pressable>
                  )}
                />
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            variant="dashed"
            size="sm"
            title="Nenhum pedido do canal selecionado está aguardando adequação."
          />
        )}
      </div>
      )}

      {/* SEÇÃO 2: PEDIDOS EM EDIÇÃO — JANELA DE 24H */}
      {activeTab === 'abertos' && (hasEditingProducts || searchTerm.trim().length > 0) && (
        <div className="rounded-card border ds-border-warning bg-card p-6 shadow-card">
          {/* Cabeçalho recolhível — mesma estrutura da seção "Aguardando":
              padrão de accordion do WAI-ARIA, com o BOTÃO dentro do heading. */}
          <div className={`flex items-center justify-between gap-3 ${isEmEdicaoExpanded ? 'border-b ds-border-divider pb-4' : ''}`}>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider font-heading">
                <Pressable
                  variant="plain"
                  size="content"
                  onClick={() => setIsEmEdicaoExpanded(!isEmEdicaoExpanded)}
                  aria-expanded={isEmEdicaoExpanded}
                  aria-controls="em-edicao-panel-content"
                  className="flex w-full items-center gap-1.5 text-left cursor-pointer rounded-[var(--radius-control)] hover:text-foreground focus-visible:ds-focus-ring"
                >
                  <Edit3 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  Pedidos Liberados — Janela de Edição
                </Pressable>
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Processados via OR. Disponíveis para edição de grade e aprovação até o tempo expirar.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="warning" size="label" className="font-mono">
                {editingStageTotal ?? '—'} Em edição
              </Badge>
              {/* Indicador, não controle — ver a seção "Aguardando". */}
              <span className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground" aria-hidden>
                {isEmEdicaoExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </span>
            </div>
          </div>

          {isEmEdicaoExpanded && (
            <div className="pt-4" id="em-edicao-panel-content">
              {/* Mesma leitura da lista "Aguardando": a busca filtra os PEDIDOS
                  (id e cliente) antes do agrupamento, então ela fica controlada
                  aqui e a tabela só empresta a caixa. `searchTerm` continua
                  compartilhado com o Histórico, como antes. */}
              <DynamicTable
                data={janelaEmEdicao.visiveis}
                columns={colunasEmEdicao}
                actions={acoesEmEdicao}
                stickyActions
                rowKey={(prod) => `${prod.channel ?? selectedChannel}|${prod.code}`}
                getRowLabel={(prod) => `${prod.code} — ${prod.name}`}
                onRowClick={setSelectedGroupedProduct}
                tableLabel="Pedidos na janela de edição, agrupados por produto"
                searchLabel="Buscar pedidos em edição"
                searchPlaceholder="Buscar por pedido ou cliente..."
                searchValue={searchTerm}
                onSearchChange={(value) => setSearchTerm(value.slice(0, 120))}
                isSearching={searchTerm !== debouncedSearchTerm}
                sorting={usingServerOrders ? editingSorting : undefined}
                onSortingChange={usingServerOrders ? setEditingSorting : undefined}
                manualSorting={usingServerOrders}
                emptyMessage="Nenhum pedido em edição condizente com a busca."
                itemsPerPage={LOAD_MORE_STEP}
                hideEndMessage
                hideResultsCount
                hideLoadingMessage
                footerRow={
                  janelaEmEdicao.total === 0 ? null : usingServerOrders ? (
                    <PaginationControls
                      page={queues.editing.page}
                      pageSize={queues.editing.pageSize}
                      totalItems={queues.editing.total}
                      setPage={queues.editing.setPage}
                      noun={['produto', 'produtos']}
                      loading={queues.editing.refreshing}
                    />
                  ) : (
                    <LoadMoreFooter
                      id="em-edicao-load-more"
                      loaded={janelaEmEdicaoLocal.carregados}
                      total={janelaEmEdicaoLocal.total}
                      onLoadMore={janelaEmEdicaoLocal.carregarMais}
                      noun={['produto', 'produtos']}
                    />
                  )
                }
              />
            </div>
          )}
        </div>
      )}

      {/* HISTÓRICO DE PEDIDOS */}
      {activeTab === 'historico' && (
        <div className="space-y-4 w-full">
            <div className="rounded-card border ds-border-card bg-card p-6 shadow-card">

              {/* Section title & Filters header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b ds-border-divider pb-5 mb-5">
                <div>
                  {/* `h2`: único heading de seção da rota /historico, logo abaixo
                      do h1 do `StandardPageHeader`. */}
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider font-heading">
                    Histórico de Pedidos
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Visualização histórica de faturamentos (OR) efetuados e pedidos atualmente bloqueados em Linx.
                  </p>
                </div>
                {hasMinLevel(20) && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectedOrderRefForDraft('');
                      setDraftRecipient('');
                      setDraftBody('');
                      setDraftError(null);
                      draftIdempotencyKeyRef.current = null;
                      setShowNewMsgModal(true);
                    }}
                    className="px-6 h-10 font-medium gap-2 sm:w-auto w-full shrink-0"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Comunicação</span>
                  </Button>
                )}
              </div>

              {/* NEW FILTERS LAYOUT */}
              <div className="mb-6 space-y-4">
                <div className="bg-card rounded-card shadow-control border ds-border-card overflow-hidden">
                  {/* `Pressable` do DS: type="button" e o estado aberto/fechado
                      exposto por aria-expanded/aria-controls. O conteúdo interno
                      é só conteúdo de frase (<span>), não <div>. */}
                  <Pressable
                    variant="plain"
                    size="content"
                    onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                    aria-expanded={isFiltersExpanded}
                    aria-controls="historico-filters-panel"
                    className="flex w-full items-center justify-between rounded-none px-4 py-3 cursor-pointer hover:bg-surface-hover transition-colors duration-[var(--motion-duration-fast)] focus-visible:ds-focus-ring-inset"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm text-foreground">Filtros e ordenação</span>
                    </span>
                    {isFiltersExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" aria-hidden />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" aria-hidden />
                    )}
                  </Pressable>

                  {isFiltersExpanded && (
                    <div className="border-t ds-border-divider p-5" id="historico-filters-panel">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                        {/* Status Column */}
                        <div className="space-y-3">
                          <h3 id="historico-status-filter-label" className="font-bold text-sm text-foreground mb-4">Status</h3>
                          <RadioGroup
                            aria-labelledby="historico-status-filter-label"
                            value={tempStatusFilter}
                            onValueChange={(value) => setTempStatusFilter(value as typeof tempStatusFilter)}
                            className="gap-3"
                          >
                            {STATUS_FILTER_OPTIONS.map((statusOption, index) => (
                              <div key={statusOption} className="flex items-center gap-3">
                                <RadioGroupItem value={statusOption} id={`status-filter-${index}`} />
                                <Label
                                  htmlFor={`status-filter-${index}`}
                                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-[var(--motion-duration-fast)] cursor-pointer"
                                >
                                  {statusOption}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>

                        {/* Order By Column */}
                        <div className="space-y-3">
                          <h3 id="historico-sort-filter-label" className="font-bold text-sm text-foreground mb-4">Ordenar por</h3>
                          <RadioGroup
                            aria-labelledby="historico-sort-filter-label"
                            value={tempSortFilter}
                            onValueChange={(value) => setTempSortFilter(value as typeof tempSortFilter)}
                            className="gap-3"
                          >
                            {SORT_FILTER_OPTIONS.map((sortOption, index) => (
                              <div key={sortOption} className="flex items-center gap-3">
                                <RadioGroupItem value={sortOption} id={`sort-filter-${index}`} />
                                <Label
                                  htmlFor={`sort-filter-${index}`}
                                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-[var(--motion-duration-fast)] cursor-pointer"
                                >
                                  {sortOption}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t ds-border-divider gap-4 sm:gap-0 w-full mt-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setTempStatusFilter('Todos');
                            setTempSortFilter('Mais recente');
                            setActiveStatusFilter('Todos');
                            setActiveSortFilter('Mais recente');
                          }}
                          className="px-4 py-2 flex items-center justify-center w-full sm:w-auto"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Limpar filtros
                        </Button>
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setTempStatusFilter(activeStatusFilter);
                              setTempSortFilter(activeSortFilter);
                              setIsFiltersExpanded(false);
                            }}
                            className="px-6 text-muted-foreground hover:text-foreground w-full sm:w-auto text-center"
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={() => {
                              setActiveStatusFilter(tempStatusFilter);
                              setActiveSortFilter(tempSortFilter);
                              setIsFiltersExpanded(false);
                            }}
                            className="px-6 py-2 w-full sm:w-auto flex items-center justify-center"
                          >
                            Aplicar filtros
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* A tabela e o menu de ações vêm integralmente do design system
                  local; a pasta da raiz permanece somente como referência. */}
              <DynamicTable
                data={groupedHistoricoList}
                columns={COLUNAS_HISTORICO}
                actions={acoesHistorico}
                stickyActions
                rowKey={(prod) => `${prod.channel ?? selectedChannel}|${prod.code}`}
                getRowLabel={(prod) => `${prod.code} — ${prod.name}`}
                onRowClick={setSelectedGroupedProduct}
                tableLabel="Histórico de pedidos, agrupado por produto"
                searchLabel="Buscar pedidos históricos"
                searchPlaceholder="Buscar pedidos..."
                searchMaxLength={120}
                searchValue={searchTerm}
                onSearchChange={(value) => setSearchTerm(value.slice(0, 120))}
                isSearching={searchTerm !== debouncedSearchTerm}
                emptyMessage="Nenhum produto condizente com os filtros selecionados."
                itemsPerPage={LOAD_MORE_STEP}
                hideEndMessage
                hideResultsCount
                hideLoadingMessage
                footerRow={historyProducts.total > 0 ? (
                  <PaginationControls
                    page={historyProducts.page}
                    pageSize={historyProducts.pageSize}
                    totalItems={historyProducts.total}
                    setPage={historyProducts.setPage}
                    noun={['produto', 'produtos']}
                    loading={historyProducts.refreshing}
                  />
                ) : null}
              />

            </div>
        </div>
      )}

      {/* FOOTER WIDGETS LAYOUT (Positioned side-by-side under the main list) */}
      {activeTab === 'alertas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <PriorityAlertsCard
          alerts={alerts}
          setAlerts={setAlerts}
          total={injectedAlerts === undefined ? feeds.alerts.total : undefined}
          hasMore={injectedAlerts === undefined ? feeds.alerts.hasMore : undefined}
          loadingMore={injectedAlerts === undefined ? feeds.alerts.loadingMore : undefined}
          onLoadMore={injectedAlerts === undefined ? feeds.alerts.loadMore : undefined}
        />

        <RecentCommunicationsCard
          communications={communications}
          total={injectedCommunications === undefined ? feeds.communications.total : undefined}
          hasMore={injectedCommunications === undefined ? feeds.communications.hasMore : undefined}
          loadingMore={injectedCommunications === undefined ? feeds.communications.loadingMore : undefined}
          onLoadMore={injectedCommunications === undefined ? feeds.communications.loadMore : undefined}
          onOpenNewMessage={() => {
            setSelectedOrderRefForDraft('');
            setDraftRecipient('');
            setDraftBody('');
            setDraftError(null);
            setShowNewMsgModal(true);
          }}
        />

      </div>
      )}

      <NewMessageModal
        isOpen={showNewMsgModal}
        onClose={() => {
          setShowNewMsgModal(false);
          setDraftError(null);
        }}
        orders={orders}
        draftRecipient={draftRecipient}
        setDraftRecipient={setDraftRecipient}
        draftBody={draftBody}
        setDraftBody={setDraftBody}
        selectedOrderRefForDraft={selectedOrderRefForDraft}
        setSelectedOrderRefForDraft={setSelectedOrderRefForDraft}
        onSend={handleSendDraft}
        sending={isSendingDraft}
        errorMessage={draftError}
      />

      <ConfirmAlertModal 
        modal={confirmModal} 
        onClose={() => setConfirmModal(null)} 
        onConfirmSemAdequacao={handleEfetuarOrSemAdequacao} 
        onConfirmComAdequacao={handleEfetuarOrComAdequacao} 
        onRetry={handleRetryAdequacao}
        pending={isProcessingOr}
      />


      <ProductGradeDetailModal
        product={selectedGroupedProduct}
        onClose={() => setSelectedGroupedProduct(null)}
        readOnly={!canEditSelectedProduct}
        stage={selectedGroupedProduct?.stage ?? (activeTab === 'historico' ? 'historico' : 'edicao')}
        channel={selectedGroupedProduct?.channel}
        status={activeTab === 'historico' ? activeStatusFilter : 'Todos'}
        onSaved={!canEditSelectedProduct ? undefined : async () => {
          if (usingServerOrders) await reloadAllOrders();
          else injectedRefetchOrders?.();
        }}
        onApprove={!canEditSelectedProduct ? undefined : async (prod) => {
          const approved = await aprovarProduto(prod);
          if (!approved) throw new Error('A aprovação não foi confirmada pelo servidor.');
        }}
      />
    </div>
  );
}




