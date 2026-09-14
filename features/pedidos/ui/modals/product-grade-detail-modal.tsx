"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  RefreshCw,
  Save,
  Store,
} from '@/shared/ui/icons';
import type { Order, ProductItem } from '@/shared/types/models';
import {
  updateProductGrades,
  type ProductChannel,
  type ProductGradeChange,
  type ProductStage,
  type UpdateProductGradesResult,
} from '@/features/pedidos/api/pedidos.api';
import { useProductClients } from '@/features/pedidos/model/use-product-clients';
import {
  avaliarDeltaOrcamento,
  orcamentoExcedidoDetail,
  toneOrcamento,
} from '@/features/pedidos/lib/orcamento-pedido';
import { ConfirmAlertModal, type ConfirmModalState } from '@/features/pedidos/ui/modals/confirm-alert-modal';
import { useRealtime } from '@/features/realtime';
import type { ApiError } from '@/lib/api/http-client';
import type { OrcamentoPedido } from '@/shared/types/models';
import { formatCurrency } from '@/shared/lib/format/currency';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { LoadMoreFooter } from '@/shared/ui/composite/LoadMoreFooter';
import { Progress } from '@/shared/ui';
import { Badge } from '@/shared/ui/primitives/badge';
import { Card } from '@/shared/ui/primitives/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogPanelBody,
  DialogPanelFooter,
  DialogPanelHeader,
  DialogTitle,
} from '@/shared/ui/primitives/dialog';
import { Pressable } from '@/shared/ui/primitives/pressable';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/primitives/table';

export interface GroupedProduct {
  code: string;
  name: string;
  unitValue: number;
  totalQty: number;
  totalValue: number;
  orders: Array<{ order: Order; item: ProductItem }>;
  stock?: number;
  ordersCount?: number;
  sizes?: Record<string, number>;
  sizeKeys?: string[];
  lastOrderAt?: string | null;
  processedAt?: number | null;
  remainingWindowMs?: number | null;
  remainingWindowDeadlineAt?: number | null;
  channel?: ProductChannel;
  stage?: ProductStage;
}

interface ProductGradeDetailModalProps {
  product: GroupedProduct | null;
  onClose: () => void;
  /** Dispara depois do PUT confirmado e da releitura autoritativa. */
  onSaved?: (result: UpdateProductGradesResult) => void | Promise<void>;
  /** Deve confirmar a aprovacao no servidor; o modal aguarda a Promise. */
  onApprove?: (product: GroupedProduct) => void | Promise<void>;
  readOnly?: boolean;
  stage?: ProductStage;
  channel?: ProductChannel;
  status?: string;
}

interface ClientGrid {
  key: string;
  orderId: string;
  numericOrderId: number | null;
  client: string;
  sizes: Record<string, number>;
  baselineSizes: Record<string, number>;
  version?: string;
  orderRef: Order;
  editRevision?: number;
  editResyncGeneration?: number;
}

function cloneSizes(sizes: Record<string, number> | undefined): Record<string, number> {
  return Object.fromEntries(
    Object.entries(sizes ?? {}).map(([key, value]) => [key, Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0]),
  );
}

function numericOrderId(value: string): number | null {
  const match = /^#?(\d+)$/.exec(value.trim());
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function clientGrid(
  order: Order,
  item: ProductItem,
  version?: string,
): ClientGrid {
  const sizes = cloneSizes(item.sizes);
  return {
    key: `${order.id}|${item.code}`,
    orderId: order.id,
    numericOrderId: numericOrderId(order.id),
    client: order.client,
    sizes,
    baselineSizes: { ...sizes },
    version,
    orderRef: order,
  };
}

function sizeRank(value: string): [number, number | string] {
  const upper = value.toUpperCase();
  if (/^\d+$/.test(upper)) return [0, Number(upper)];
  const letters = ['XPP', 'PP', 'P', 'M', 'G', 'GG', 'XGG', 'EG', 'EEG', 'UN'];
  const index = letters.indexOf(upper);
  return index >= 0 ? [1, index] : [2, upper];
}

function compareSizes(left: string, right: string): number {
  const [leftGroup, leftValue] = sizeRank(left);
  const [rightGroup, rightValue] = sizeRank(right);
  if (leftGroup !== rightGroup) return leftGroup - rightGroup;
  if (typeof leftValue === 'number' && typeof rightValue === 'number') return leftValue - rightValue;
  return String(leftValue).localeCompare(String(rightValue), 'pt-BR');
}

function rowIsDirty(row: ClientGrid): boolean {
  const keys = new Set([...Object.keys(row.sizes), ...Object.keys(row.baselineSizes)]);
  for (const key of keys) {
    if ((row.sizes[key] ?? 0) !== (row.baselineSizes[key] ?? 0)) return true;
  }
  return false;
}

function rowTotal(row: ClientGrid): number {
  return Object.values(row.sizes).reduce((sum, value) => sum + (value || 0), 0);
}

function baselineRowTotal(row: ClientGrid): number {
  return Object.values(row.baselineSizes).reduce((sum, value) => sum + (value || 0), 0);
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

// Medidores permanentes por linha "sem adequação" (D-12/D-13): dois
// independentes (adição/corte, D-08 — nunca se compensam), visíveis antes de
// qualquer edição. Estrutura achatada (label, Progress, label, Progress)
// dentro de um `flex flex-col gap-1`, como o UI-SPEC descreve.
function OrcamentoMeters({ rowKey, orcamento }: { rowKey: string; orcamento: OrcamentoPedido }) {
  const medidores: Array<{
    kind: 'add' | 'cut';
    label: string;
    restante: string;
    consumido: number;
    limite: number;
  }> = [
    {
      kind: 'add',
      label: `Adição ±5%: ${orcamento.consumidoAdicao} de ${orcamento.limiteAdicao} pç usadas`,
      restante: `Restam ${orcamento.restanteAdicao} peças.`,
      consumido: orcamento.consumidoAdicao,
      limite: orcamento.limiteAdicao,
    },
    {
      kind: 'cut',
      label: `Corte ±5%: ${orcamento.consumidoCorte} de ${orcamento.limiteCorte} pç usadas`,
      restante: `Restam ${orcamento.restanteCorte} peças.`,
      consumido: orcamento.consumidoCorte,
      limite: orcamento.limiteCorte,
    },
  ];

  return (
    <div className="mt-1 flex flex-col gap-1">
      {medidores.map(medidor => {
        const id = `${sanitizeId(rowKey)}-budget-${medidor.kind}-label`;
        // Pedido pequeno demais para render 1 peça de folga (limite 0): a
        // barra sairia vazia se usasse consumido/limite reais (0/0 normaliza
        // para max=100 dentro do Progress). Passa 1/1 para render cheia em
        // destructive; o rótulo visível continua dizendo "0 de 0".
        const semFolga = medidor.limite <= 0;
        return (
          <React.Fragment key={medidor.kind}>
            <span
              id={id}
              className="flex items-center gap-1 text-xs font-medium normal-case text-muted-foreground"
            >
              {medidor.label}
              <span className="sr-only">{medidor.restante}</span>
            </span>
            <Progress
              aria-labelledby={id}
              value={semFolga ? 1 : medidor.consumido}
              max={semFolga ? 1 : medidor.limite}
              variant={toneOrcamento(medidor.consumido, medidor.limite)}
              className="h-1"
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}

function operationError(error: unknown, action: 'salvar' | 'aprovar'): string {
  const status = (error as ApiError | null)?.status;
  if (status === 409) {
    return 'A grade mudou ou a janela de edição expirou. Recarregue os clientes antes de tentar novamente.';
  }
  if (status === 404) {
    return 'O produto ou os pedidos deixaram de estar disponíveis. Recarregue os clientes.';
  }
  if (error instanceof Error && error.message && !error.message.startsWith('API error:')) {
    return error.message;
  }
  return action === 'salvar'
    ? 'Não foi possível salvar a grade. Nenhuma alteração foi aplicada.'
    : 'Não foi possível aprovar as ordens de reserva deste produto.';
}

export function ProductGradeDetailModal({
  product,
  onClose,
  onSaved,
  onApprove,
  readOnly = false,
  stage,
  channel,
  status = 'Todos',
}: ProductGradeDetailModalProps) {
  const { topicRevisions, resyncGeneration } = useRealtime();
  const [busy, setBusy] = useState(false);
  const resolvedStage = stage ?? product?.stage ?? 'edicao';
  const resolvedChannel = channel ?? product?.channel;
  const revision = topicRevisions[resolvedStage === 'historico' ? 'history' : 'orders'];

  return (
    <Dialog
      open={Boolean(product && resolvedChannel)}
      onOpenChange={open => {
        if (!open && !busy) onClose();
      }}
    >
      {product && resolvedChannel ? (
        <ProductGradeDetailModalContent
          key={`${product.code}|${resolvedStage}|${resolvedChannel}`}
          product={product}
          onClose={onClose}
          onSaved={onSaved}
          onApprove={onApprove}
          onBusyChange={setBusy}
          readOnly={readOnly || resolvedStage === 'historico'}
          stage={resolvedStage}
          channel={resolvedChannel}
          status={status}
          revision={revision}
          resyncGeneration={resyncGeneration}
        />
      ) : null}
    </Dialog>
  );
}

function ProductGradeDetailModalContent({
  product,
  onClose,
  onSaved,
  onApprove,
  onBusyChange,
  readOnly,
  stage,
  channel,
  status,
  revision,
  resyncGeneration,
}: {
  product: GroupedProduct;
  onClose: () => void;
  onSaved?: ProductGradeDetailModalProps['onSaved'];
  onApprove?: ProductGradeDetailModalProps['onApprove'];
  onBusyChange: (busy: boolean) => void;
  readOnly: boolean;
  stage: ProductStage;
  channel: ProductChannel;
  status: string;
  revision: number;
  resyncGeneration: number;
}) {
  const clients = useProductClients({
    productCode: product.code,
    stage,
    channel,
    status,
    enabled: true,
    revision,
  });
  const [clientGrids, setClientGrids] = useState<ClientGrid[]>(() =>
    product.orders.map(({ order, item }) => clientGrid(order, item)),
  );
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'save' | 'approve' | 'reload' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [requiresDraftDiscard, setRequiresDraftDiscard] = useState(false);
  // D-14: confirmação de finalização da OR, só para lote inteiramente "sem
  // adequação" dentro do limite. `null` fechado; aberto guarda o estado que
  // `ConfirmAlertModal` já sabe renderizar.
  const [saveApproveConfirm, setSaveApproveConfirm] = useState<ConfirmModalState | null>(null);
  const replaceOnNextPageRef = useRef(false);
  const appliedRevisionRef = useRef(revision);
  const appliedResyncGenerationRef = useRef(resyncGeneration);

  useEffect(() => {
    if (
      clients.rows.length === 0
      || clients.acceptedRevision !== revision
      || clients.acceptedResyncGeneration !== resyncGeneration
    ) return;
    const incoming = clients.rows.map(({ order, item, version }) => clientGrid(order, item, version));
    setClientGrids(previous => {
      const sourceChanged = appliedRevisionRef.current !== revision
        || appliedResyncGenerationRef.current !== resyncGeneration;
      const hasDirtyRows = previous.some(rowIsDirty);
      if (replaceOnNextPageRef.current || (sourceChanged && !hasDirtyRows)) {
        replaceOnNextPageRef.current = false;
        return incoming;
      }
      const next = [...previous];
      const indexByKey = new Map(next.map((row, index) => [row.key, index]));
      for (const row of incoming) {
        const existingIndex = indexByKey.get(row.key);
        if (existingIndex === undefined) {
          indexByKey.set(row.key, next.length);
          next.push(row);
        } else if (!next[existingIndex]?.version && row.version) {
          // Fixtures legadas nao carregam versao. Assim que o endpoint responde,
          // a linha autoritativa substitui a copia local sem versao.
          next[existingIndex] = row;
        }
      }
      return next;
    });
    appliedRevisionRef.current = revision;
    appliedResyncGenerationRef.current = resyncGeneration;
  }, [
    clients.acceptedResyncGeneration,
    clients.acceptedRevision,
    clients.rows,
    resyncGeneration,
    revision,
  ]);

  const sizeColumns = useMemo(() => {
    // `summary.sizeKeys` vem na posição Linx canônica do produto. Não ordenar
    // novamente por uma tabela genérica: dois produtos podem ter referências
    // de grade diferentes. Somente chaves extras de fixtures antigas recebem
    // a ordenação de fallback.
    const authoritative = clients.summary?.sizeKeys?.length
      ? clients.summary.sizeKeys
      : (product.sizeKeys ?? []);
    const seen = new Set<string>();
    const ordered = authoritative.filter(key => {
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const extras = new Set<string>([
      ...Object.keys(clients.summary?.sizeTotals ?? {}),
      ...Object.keys(product.sizes ?? {}),
    ]);
    for (const row of clientGrids) {
      Object.keys(row.baselineSizes).forEach(key => extras.add(key));
      Object.keys(row.sizes).forEach(key => extras.add(key));
    }
    const sortedExtras = [...extras]
      .filter(key => !seen.has(key))
      .sort(compareSizes);
    return [...ordered, ...sortedExtras];
  }, [clientGrids, clients.summary, product.sizeKeys, product.sizes]);

  const dirtyRows = useMemo(() => clientGrids.filter(rowIsDirty), [clientGrids]);
  const dirtyCount = dirtyRows.length;
  // PD-04: a trava de total redistributivo (D-01/D-11) só vale para linha
  // "com adequação". "Sem adequação" pode variar o total dentro do orçamento
  // do pedido (D-02) — a checagem de estouro é a trava nova (D-15), não esta.
  const invalidTotalRows = useMemo(
    () => dirtyRows.filter(row => row.orderRef.adequacaoAplicada && rowTotal(row) !== baselineRowTotal(row)),
    [dirtyRows],
  );
  const hasInvalidClientTotals = invalidTotalRows.length > 0;
  // D-15: trava visual com alerta quando o delta pretendido de uma linha
  // "sem adequação" estoura o restante do PEDIDO (não do produto isolado).
  // Linha suja "sem adequação" sem orçamento no payload não entra aqui — o
  // backend continua a fonte de verdade e recusa com 409 se for o caso
  // (D-16). PD-05: o orçamento reflete o payload do carregamento, não é
  // recalculado após um 409.
  const overBudgetRows = useMemo(() => {
    const rows: Array<{ row: ClientGrid; orcamento: OrcamentoPedido; restanteAdicao: number; restanteCorte: number }> = [];
    for (const row of dirtyRows) {
      const orcamento = row.orderRef.orcamentoPedido;
      if (!orcamento) continue;
      const delta = rowTotal(row) - baselineRowTotal(row);
      const avaliacao = avaliarDeltaOrcamento(orcamento, delta);
      if (avaliacao.excede) {
        rows.push({
          row,
          orcamento,
          restanteAdicao: orcamento.restanteAdicao,
          restanteCorte: orcamento.restanteCorte,
        });
      }
    }
    return rows;
  }, [dirtyRows]);
  const hasExceededBudgetRows = overBudgetRows.length > 0;
  // Rótulo do CTA depende só da composição do lote (PD-03) — nunca do
  // estouro, que age apenas no `disabled`, para o texto não piscar entre
  // dois rótulos enquanto a pessoa digita.
  const batchIsAllSemAdequacao = dirtyRows.length > 0
    && dirtyRows.every(row => !row.orderRef.adequacaoAplicada);
  const acceptedCurrentSource = clients.acceptedRevision === revision
    && clients.acceptedResyncGeneration === resyncGeneration;
  const hasRealtimeConflict = dirtyRows.some(row => (
    row.editRevision !== revision
    || row.editResyncGeneration !== resyncGeneration
  )) || (dirtyCount > 0 && !acceptedCurrentSource);
  const authoritativeSizeTotals = useMemo(() => {
    const totals: Record<string, number> = clients.summary
      ? cloneSizes(clients.summary.sizeTotals)
      : cloneSizes(product.sizes);
    if (!clients.summary) {
      for (const key of sizeColumns) {
        totals[key] = clientGrids.reduce((sum, row) => sum + (row.sizes[key] ?? 0), 0);
      }
      return totals;
    }
    for (const row of dirtyRows) {
      for (const key of sizeColumns) {
        totals[key] = (totals[key] ?? 0)
          + (row.sizes[key] ?? 0)
          - (row.baselineSizes[key] ?? 0);
      }
    }
    return totals;
  }, [clientGrids, clients.summary, dirtyRows, product.sizes, sizeColumns]);
  const totalQty = Object.values(authoritativeSizeTotals).reduce((sum, value) => sum + value, 0);
  const stock = clients.summary?.stock ?? product.stock ?? 0;
  const totalClients = clients.summary?.totalClients ?? product.ordersCount ?? clientGrids.length;
  // Valores financeiros são projeções autoritativas do backend. `unitValue`
  // pode ser uma média arredondada (10 / 3 => 3,33) e clientes podem ter preço
  // ou adequação diferentes; recomputar por quantidade perderia centavos e o
  // sinal contábil de devoluções históricas.
  const valueTotal = clients.summary?.totalValue ?? product.totalValue;
  const isBusy = pendingAction !== null;

  useEffect(() => {
    onBusyChange(isBusy);
    return () => onBusyChange(false);
  }, [isBusy, onBusyChange]);

  const deadlineRef = useRef<number | null>(null);
  const [formattedRemainingTime, setFormattedRemainingTime] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    deadlineRef.current = stage !== 'edicao'
      ? null
      : product.remainingWindowDeadlineAt != null
        ? product.remainingWindowDeadlineAt
        : product.remainingWindowMs != null
          ? Date.now() + Math.max(0, product.remainingWindowMs)
          : product.processedAt
            ? product.processedAt + 24 * 60 * 60 * 1000
        : null;
    if (deadlineRef.current === null) {
      setFormattedRemainingTime(null);
      setIsExpired(false);
      return;
    }
    const update = () => {
      const remaining = Math.max(0, (deadlineRef.current ?? 0) - Date.now());
      if (remaining === 0) {
        setFormattedRemainingTime('Expirado');
        setIsExpired(true);
        return;
      }
      setIsExpired(false);
      const hours = Math.floor(remaining / 3_600_000);
      const minutes = Math.floor((remaining % 3_600_000) / 60_000);
      setFormattedRemainingTime(`Restam ${hours}h ${minutes}m`);
    };
    const initialTimer = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 60_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [
    product.processedAt,
    product.remainingWindowDeadlineAt,
    product.remainingWindowMs,
    stage,
  ]);

  const changeQuantity = (rowKey: string, sizeKey: string, rawValue: string) => {
    const value = Math.min(1_000_000, Math.max(0, Number.parseInt(rawValue, 10) || 0));
    setClientGrids(previous => {
      return previous.map(row => {
        if (row.key !== rowKey) return row;
        const updated = { ...row, sizes: { ...row.sizes, [sizeKey]: value } };
        return {
          ...updated,
          editRevision: rowIsDirty(updated) ? (row.editRevision ?? revision) : undefined,
          editResyncGeneration: rowIsDirty(updated)
            ? (row.editResyncGeneration ?? resyncGeneration)
            : undefined,
        };
      });
    });
  };

  const reloadClients = async () => {
    setActionError(null);
    setPendingAction('reload');
    replaceOnNextPageRef.current = true;
    const reloaded = await clients.reload();
    if (!reloaded) {
      replaceOnNextPageRef.current = false;
      setActionError('Não foi possível recarregar os clientes. Tente novamente.');
    } else {
      setRequiresDraftDiscard(false);
    }
    setPendingAction(null);
    return reloaded;
  };

  const save = async () => {
    setActionError(null);
    if (isExpired) {
      setActionError('A janela de edição expirou. Recarregue a lista para confirmar o estado atual.');
      return;
    }
    if (dirtyCount === 0) {
      setActionError('Altere ao menos uma quantidade antes de salvar.');
      return;
    }
    if (dirtyCount > 100) {
      setActionError('Salve no máximo 100 clientes por vez.');
      return;
    }
    if (hasInvalidClientTotals) {
      setActionError('A edição só redistribui a grade: o total de cada cliente deve permanecer igual à reserva atual.');
      return;
    }
    if (requiresDraftDiscard) {
      setActionError('A versão autoritativa mudou. Descarte o rascunho e recarregue antes de salvar novamente.');
      return;
    }
    if (!acceptedCurrentSource) {
      setActionError('Os clientes ainda estão sendo reconciliados. Aguarde ou recarregue antes de salvar.');
      return;
    }
    if (sizeColumns.length === 0 || sizeColumns.length > 100) {
      setActionError('A grade deve conter de 1 a 100 tamanhos. Recarregue os clientes.');
      return;
    }
    const normalizedSizeKeys = sizeColumns.map(key => key.trim().toUpperCase());
    if (
      normalizedSizeKeys.some(key => key.length === 0 || key.length > 16)
      || new Set(normalizedSizeKeys).size !== normalizedSizeKeys.length
    ) {
      setActionError('A grade contém uma chave de tamanho inválida. Recarregue os clientes.');
      return;
    }

    const invalid = dirtyRows.find(row => rowTotal(row) === 0 || !row.version || row.numericOrderId === null);
    if (invalid) {
      setActionError(
        rowTotal(invalid) === 0
          ? `A grade de ${invalid.client} não pode ficar totalmente zerada.`
          : 'A versão de uma das grades está ausente. Recarregue os clientes.',
      );
      return;
    }

    const changes: ProductGradeChange[] = dirtyRows.map(row => ({
      orderId: row.numericOrderId as number,
      expectedVersion: row.version as string,
      // "com adequação": total tem que casar com a baseline (validado pelo
      // cliente HTTP). "sem adequação": null libera a variação dentro do
      // orçamento do pedido — o backend decide (D-15/D-16).
      expectedTotalQty: row.orderRef.adequacaoAplicada ? baselineRowTotal(row) : null,
      sizes: Object.fromEntries(sizeColumns.map((key, index) => [normalizedSizeKeys[index], row.sizes[key] ?? 0])),
    }));

    setPendingAction('save');
    let result: UpdateProductGradesResult;
    try {
      result = await updateProductGrades(product.code, channel, changes);
    } catch (error) {
      const orcamentoDetail = orcamentoExcedidoDetail(error);
      if (orcamentoDetail) {
        // D-16/PD-05: o backend é a fonte de verdade; o cálculo local só
        // achava que cabia. Mostra a mensagem literal do backend (já traz os
        // restantes frescos) e mantém o rascunho válido — sem releitura e
        // sem marcar como descartável, porque `clientGrids` não seria
        // reescrito por um reload mesmo que ele rodasse.
        setActionError(orcamentoDetail.message);
        setPendingAction(null);
        return;
      }
      if ((error as ApiError | null)?.status === 409) {
        // O PUT é atômico, então o rascunho continua apenas local. Relemos a
        // fonte autoritativa imediatamente, mas não fazemos rebase silencioso:
        // aplicar o rascunho sobre uma versão concorrente poderia apagar a
        // alteração de outro operador. O usuário decide descartá-lo.
        const reloaded = await clients.reload();
        setRequiresDraftDiscard(true);
        setActionError(reloaded
          ? 'A grade mudou no servidor. Os dados atuais foram recarregados e seu rascunho foi preservado apenas para conferência; descarte-o antes de editar novamente.'
          : `${operationError(error, 'salvar')} A releitura autoritativa também falhou.`);
      } else {
        setActionError(operationError(error, 'salvar'));
      }
      setPendingAction(null);
      return;
    }

    replaceOnNextPageRef.current = true;
    const reloaded = await clients.reload();
    if (!reloaded) {
      replaceOnNextPageRef.current = false;
      setActionError('A grade foi salva, mas a confirmação não pôde ser recarregada. Recarregue os clientes antes de fechar.');
      setPendingAction(null);
      return;
    }
    try {
      await onSaved?.(result);
      onClose();
    } catch {
      setActionError('A grade foi salva e confirmada, mas a lista principal não pôde ser atualizada. Recarregue antes de fechar.');
    } finally {
      setPendingAction(null);
    }
  };

  // D-14: lote inteiramente "sem adequação" e dentro do limite pede
  // confirmação antes de salvar (salvar finaliza a OR); qualquer outra
  // composição de lote salva direto, como hoje (D-11).
  const handleSaveClick = () => {
    if (batchIsAllSemAdequacao) {
      setSaveApproveConfirm({
        isOpen: true,
        type: 'salvar-aprovar',
        title: 'Salvar agora vai aprovar e finalizar esta OR — ela sai do estágio de edição e não poderá mais ser alterada. Deseja continuar?',
      });
      return;
    }
    void save();
  };

  const confirmSaveApprove = async () => {
    await save();
    setSaveApproveConfirm(null);
  };

  const approve = async () => {
    if (!onApprove) return;
    setActionError(null);
    if (isExpired) {
      setActionError('A janela de aprovação expirou. Recarregue a lista para confirmar o estado atual.');
      return;
    }
    setPendingAction('approve');
    try {
      await onApprove(product);
      onClose();
    } catch {
      setActionError('Não foi possível confirmar a aprovação. Recarregue os clientes antes de tentar novamente.');
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <DialogContent
      size="full"
      surface="panel"
      showCloseButton={false}
      aria-describedby={undefined}
      className="bg-card sm:max-w-6xl"
      id="product-detail-modal-box"
    >
      <DialogPanelHeader className="flex h-14 flex-row items-center gap-3 bg-card px-6 py-0 text-foreground sm:px-6">
        <DialogClose asChild disabled={isBusy}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Fechar"
            title="Fechar"
            className="rounded-full text-muted-foreground hover:bg-hover-soft hover:text-foreground"
          >
            <ArrowLeft className="size-5" />
          </Button>
        </DialogClose>
        <DialogTitle className="font-heading tracking-tight">Detalhes do Produto &amp; Grade por Cliente</DialogTitle>
      </DialogPanelHeader>

      <div className="shrink-0 border-b ds-border-divider bg-muted/20 p-6">
        <Card className="grid grid-cols-1 gap-4 p-4 text-sm shadow-card md:grid-cols-5">
          <div className="flex flex-col md:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Produto</span>
            <div className="mt-0.5 flex items-center gap-1.5 truncate">
              <Badge variant="neutral" size="label" className="font-mono font-bold">{product.code}</Badge>
              <span className="truncate font-bold text-foreground" title={product.name}>{product.name}</span>
            </div>
          </div>
          <div className="flex flex-col text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Clientes</span>
            <span className="mt-0.5 font-mono text-base font-bold text-foreground">{totalClients}</span>
          </div>
          <div className="flex flex-col text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Saldo</span>
            <span className={`mt-0.5 font-mono text-base font-bold ${stock < 0 ? 'text-destructive' : 'text-success'}`}>
              {stock}
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Valor Total</span>
            <span className="mt-0.5 font-mono text-base font-bold text-primary">{formatCurrency(valueTotal)}</span>
          </div>
        </Card>

        {formattedRemainingTime && (
          <div className="mt-3 flex items-center justify-between rounded-card border ds-border-warning bg-warning/10 px-3.5 py-2">
            <div className="flex items-center gap-2 text-xs font-medium text-warning-text">
              <Clock className="h-4 w-4 shrink-0 text-warning" />
              <span>{isExpired ? 'Janela de Edição Expirada' : 'Janela de Edição Ativa'}</span>
            </div>
            <Badge variant="warning" size="label" className="font-mono font-bold">{formattedRemainingTime}</Badge>
          </div>
        )}
      </div>

      <DialogPanelBody className="bg-background p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-heading text-base font-bold text-foreground">Grade por Loja / Cliente</h3>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {clientGrids.length} de {totalClients} cliente(s) carregado(s)
          </span>
        </div>

        {(actionError || clients.error) && (
          <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-control border ds-border-destructive bg-destructive/10 p-3 text-xs font-medium text-destructive-text">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {actionError ?? clients.error}
            </span>
            <Button type="button" size="sm" variant="outline" loading={pendingAction === 'reload'} onClick={() => void reloadClients()}>
              <RefreshCw className="h-4 w-4" />
              {requiresDraftDiscard ? 'Descartar rascunho e recarregar' : 'Recarregar clientes'}
            </Button>
          </div>
        )}

        {hasRealtimeConflict && !actionError && !clients.error && (
          <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-control border ds-border-warning bg-warning/10 p-3 text-xs font-medium text-warning-text">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
              Os pedidos deste produto foram atualizados enquanto você editava. O salvamento verificará as versões; recarregar descarta suas alterações locais.
            </span>
            <Button type="button" size="sm" variant="outline" loading={pendingAction === 'reload'} onClick={() => void reloadClients()}>
              <RefreshCw className="h-4 w-4" />
              Descartar e recarregar
            </Button>
          </div>
        )}

        {hasInvalidClientTotals && !actionError && (
          <div role="alert" className="mb-4 flex items-center gap-2 rounded-control border ds-border-warning bg-warning/10 p-3 text-xs font-medium text-warning-text">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
            A edição redistribui tamanhos, mas não altera a reserva. Corrija o total de: {invalidTotalRows.map(row => row.client).join(', ')}.
          </div>
        )}

        {hasExceededBudgetRows && !actionError && (
          <div role="alert" className="mb-4 flex flex-col gap-2 rounded-control border ds-border-warning bg-warning/10 p-3 text-xs font-medium text-warning-text">
            {overBudgetRows.map(({ row, restanteAdicao, restanteCorte }) => (
              <div key={row.key} className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                A edição de {row.client} ultrapassa o orçamento de ±5% do pedido: restam apenas {restanteAdicao} pç para adicionar e {restanteCorte} pç para cortar. Reduza a alteração para salvar.
              </div>
            ))}
          </div>
        )}

        {dirtyCount > 100 && !actionError && (
          <div role="alert" className="mb-4 flex items-center gap-2 rounded-control border ds-border-warning bg-warning/10 p-3 text-xs font-medium text-warning-text">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
            O salvamento atômico aceita no máximo 100 clientes. Reverta algumas alterações antes de continuar; a tela não divide a operação em lotes.
          </div>
        )}

        {clients.loading && clientGrids.length === 0 ? (
          <div role="status" className="rounded-card border ds-border-card bg-card p-8 text-center text-sm text-muted-foreground">
            Carregando clientes do produto...
          </div>
        ) : sizeColumns.length === 0 ? (
          <div className="rounded-card border ds-border-card bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhuma grade de tamanho foi informada para este produto.
          </div>
        ) : (
          <div className="overflow-hidden rounded-card border ds-border-card bg-card shadow-card">
            <div
              className="overflow-x-auto"
              role="region"
              aria-label="Grade por tamanho"
              tabIndex={0}
            >
            <Table className="min-w-max text-left font-sans text-xs">
              <TableHeader className="bg-muted uppercase tracking-wider">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-56 px-4">Loja / Cliente</TableHead>
                  {sizeColumns.map(size => <TableHead key={size} className="w-14 px-2 text-center">{size}</TableHead>)}
                  <TableHead className="w-20 px-4 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="font-medium">
                {clientGrids.map(row => {
                  const expanded = expandedOrderId === row.orderId;
                  const currentRowTotal = rowTotal(row);
                  const reservedRowTotal = baselineRowTotal(row);
                  const totalChanged = currentRowTotal !== reservedRowTotal;
                  // A trava visual de total (tom, sufixo, title) só é verdadeira
                  // para "com adequação" (D-01/D-11); "sem adequação" pode variar
                  // o total, então o número sai no tom primário sem aviso.
                  const totalConstraintApplies = row.orderRef.adequacaoAplicada;
                  return (
                    <React.Fragment key={row.key}>
                      <TableRow data-dirty={rowIsDirty(row) ? '' : undefined}>
                        <TableCell className="max-w-64 px-4 py-2.5 font-bold uppercase text-foreground">
                          <div className="flex items-center gap-2">
                            <Pressable
                              variant="ghost"
                              size="content"
                              aria-expanded={expanded}
                              onClick={() => setExpandedOrderId(previous => previous === row.orderId ? null : row.orderId)}
                              className="cursor-pointer p-1 text-muted-foreground hover:text-foreground"
                              title={expanded ? 'Ocultar detalhes do pedido' : 'Ver detalhes do pedido'}
                            >
                              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Pressable>
                            <span className="truncate" title={row.client}>{row.client}</span>
                          </div>
                          {row.orderRef.orcamentoPedido ? (
                            <OrcamentoMeters rowKey={row.key} orcamento={row.orderRef.orcamentoPedido} />
                          ) : null}
                        </TableCell>
                        {sizeColumns.map(size => (
                          <TableCell key={size} className="px-1 py-1.5 text-center">
                            {readOnly ? (
                              <span className="block rounded-control bg-muted/20 py-1.5 font-mono text-xs font-bold text-foreground">{row.sizes[size] ?? 0}</span>
                            ) : (
                              <Input
                                type="text"
                                inputMode="numeric"
                                aria-label={`Quantidade do tamanho ${size} para ${row.client}`}
                                className="h-8 w-12 rounded-[var(--radius-control)] bg-background px-0 text-center font-mono text-xs font-bold md:text-xs"
                                value={row.sizes[size] ?? 0}
                                disabled={isBusy || isExpired}
                                onChange={event => changeQuantity(row.key, size, event.target.value)}
                              />
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="px-4 py-2.5 text-right font-mono font-bold text-foreground">
                          <span
                            className={totalConstraintApplies && totalChanged ? 'text-warning-text' : 'text-primary'}
                            title={totalConstraintApplies && totalChanged ? `O total deve permanecer em ${reservedRowTotal}` : undefined}
                          >
                            {currentRowTotal}{totalConstraintApplies && totalChanged ? ` / ${reservedRowTotal}` : ''}
                          </span>
                        </TableCell>
                      </TableRow>
                      {expanded && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30 text-xs">
                          <TableCell colSpan={sizeColumns.length + 2} className="whitespace-normal px-6 py-4">
                            <Card className="grid gap-3 p-4 sm:grid-cols-3">
                              <div className="flex items-center gap-3"><ClipboardList className="h-5 w-5 text-muted-foreground" /><span>Pedido <strong className="font-mono">{row.orderId}</strong></span></div>
                              <div>Status: <strong>{row.orderRef.status}</strong></div>
                              <div>Subtotal: <strong className="font-mono text-primary">{formatCurrency(row.orderRef.value)}</strong></div>
                            </Card>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
              <TableFooter className="text-xs font-bold [&_td]:border-t [&_td]:ds-border-divider">
                <TableRow className="hover:bg-transparent">
                  <TableCell className="px-4 py-3 uppercase">Total Geral</TableCell>
                  {sizeColumns.map(size => (
                    <TableCell key={size} className="px-2 py-3 text-center font-mono text-primary">{authoritativeSizeTotals[size] ?? 0}</TableCell>
                  ))}
                  <TableCell className="px-4 py-3 text-right font-mono text-sm font-bold text-primary">{totalQty}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
            </div>
          </div>
        )}

        {clients.loadedOnce && clients.total > 0 && (
          <LoadMoreFooter
            className="mt-4"
            loaded={clientGrids.length}
            total={clients.total}
            noun={['cliente', 'clientes']}
            onLoadMore={() => void clients.loadMore()}
            loading={clients.loadingMore}
          />
        )}
      </DialogPanelBody>

      <DialogPanelFooter className="flex-row items-center justify-between gap-4 bg-card px-6 py-4 sm:justify-between sm:px-6">
        <div className="text-xs font-medium text-muted-foreground">
          Valor Unitário: <span className="font-mono font-bold text-foreground">{formatCurrency(product.unitValue)}</span>
          {!readOnly && dirtyCount > 0 && <span className="ml-3">{dirtyCount} cliente(s) alterado(s)</span>}
        </div>
        <div className="flex items-center gap-3">
          {readOnly ? (
            <Button size="sm" type="button" onClick={onClose} disabled={isBusy} className="h-9 w-auto px-6 text-xs shadow-control">Fechar</Button>
          ) : (
            <>
              <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isBusy} className="h-9 w-auto px-6 text-xs">Cancelar</Button>
              <Button
                size="sm"
                type="button"
                onClick={handleSaveClick}
                loading={pendingAction === 'save'}
                disabled={isBusy || isExpired || dirtyCount === 0 || dirtyCount > 100 || hasInvalidClientTotals || hasExceededBudgetRows}
                className="h-9 w-auto px-6 text-xs shadow-control"
              >
                <Save className="h-4 w-4" />
                {batchIsAllSemAdequacao ? 'Salvar e Aprovar OR' : 'Salvar Alterações'}
              </Button>
              {onApprove && (
                <Button
                  size="sm"
                  type="button"
                  onClick={() => void approve()}
                  loading={pendingAction === 'approve'}
                  disabled={isBusy || isExpired || dirtyCount > 0}
                  className="h-9 w-auto px-5 text-xs font-bold shadow-control"
                >
                  <CheckCircle className="h-4 w-4" />
                  Aprovar OR
                </Button>
              )}
            </>
          )}
        </div>
      </DialogPanelFooter>

      {/* Empilha sobre este Dialog já aberto (D-14) — Radix resolve a ordem
          de portal, sem mecanismo manual, como o comentário em
          confirm-alert-modal.tsx documenta. */}
      <ConfirmAlertModal
        modal={saveApproveConfirm}
        onClose={() => setSaveApproveConfirm(null)}
        onConfirmSalvarAprovar={confirmSaveApprove}
        pending={pendingAction === 'save'}
      />
    </DialogContent>
  );
}
