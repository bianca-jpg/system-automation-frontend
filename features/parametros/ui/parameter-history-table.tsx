"use client";

import { useCallback, useMemo, useState } from "react";
import { Calendar, Check, Eye, FileText, X } from "@/shared/ui/icons";
import { chaveOrdenacaoDataBr } from "@/shared/lib/format/data-br";
import { Badge } from "@/shared/ui/primitives/badge";
import {
  DynamicTable,
  type Action,
  type ColumnConfig,
  type DynamicTableSortingState,
} from "@/shared/ui/primitives/dynamic-table";
import type { ParameterHistoryItem } from "@/entities/parametro/model/types";
import { HistoryDetailsModal } from "./history-details-modal";
import { PaginationControls } from "@/shared/ui/composite/PaginationControls";

// Fora do componente: o `DynamicTable` memoiza as colunas por identidade e
// recriá-las a cada render invalidaria a ordenação em curso. Nenhuma delas
// depende de prop.
const COLUNAS: ColumnConfig<ParameterHistoryItem>[] = [
  {
    key: "date",
    label: "Data da Decisão",
    width: "180px",
    minWidth: "150px",
    sortable: true,
    // A data chega formatada em pt-BR; ordenar o texto ordenaria pelo dia do
    // mês ("31/01" depois de "01/12").
    sortAccessor: (item) => chaveOrdenacaoDataBr(item.date),
    render: (item) => (
      <span className="text-muted-foreground">{item.date}</span>
    ),
  },
  {
    key: "parameter",
    label: "Parâmetro Afetado",
    width: "240px",
    minWidth: "180px",
    sortable: true,
    render: (item) => (
      <span className="font-medium text-foreground" title={item.parameter}>
        {item.parameter}
      </span>
    ),
  },
  {
    key: "requester",
    label: "Solicitante",
    width: "180px",
    minWidth: "140px",
    sortable: true,
    render: (item) => (
      <span className="text-muted-foreground">{item.requester}</span>
    ),
  },
  {
    key: "decision",
    label: "Decisão",
    width: "150px",
    minWidth: "130px",
    sortable: true,
    render: (item) => (
      <Badge
        variant={item.decision === "Aprovado" ? "success" : "destructive"}
        size="content"
      >
        {item.decision === "Aprovado" ? <Check /> : <X />}
        {item.decision}
      </Badge>
    ),
  },
  {
    key: "admin",
    label: "Administrador",
    width: "180px",
    minWidth: "140px",
    sortable: true,
    render: (item) => <span className="text-muted-foreground">{item.admin}</span>,
  },
  {
    key: "notes",
    label: "Observações",
    width: "260px",
    minWidth: "180px",
    // Texto livre e longo: ordenar por ele não responde nenhuma pergunta e só
    // ocuparia um cabeçalho clicável.
    sortable: false,
    render: (item) => (
      <div className="flex min-w-0 items-center gap-2">
        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="truncate text-xs text-muted-foreground" title={item.notes}>
          {item.notes}
        </span>
      </div>
    ),
  },
];

const CHAVES_BUSCA = ["date", "parameter", "requester", "decision", "admin", "notes"];

interface ParameterHistoryTableProps {
  history: ParameterHistoryItem[];
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number | ((current: number) => number)) => void;
  loading?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  isSearching?: boolean;
  sorting?: DynamicTableSortingState;
  onSortingChange?: (sorting: DynamicTableSortingState) => void;
}

export function ParameterHistoryTable({
  history,
  page = 1,
  pageSize = 25,
  total = history.length,
  onPageChange,
  loading = false,
  searchValue,
  onSearchChange,
  isSearching = false,
  sorting,
  onSortingChange,
}: ParameterHistoryTableProps) {
  // O alvo e a abertura são estados separados de propósito — mesmo motivo
  // documentado em `features/usuarios/ui/user-management-table.tsx`: se o modal
  // fosse montado/desmontado junto com o alvo, o FocusScope do Radix não teria
  // para onde devolver o foco ao fechar e ele cairia no <body>.
  const [selectedHistory, setSelectedHistory] = useState<ParameterHistoryItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // `useCallback` para o array de ações abaixo poder depender dele sem se
  // recriar a cada render (o DynamicTable memoiza a linha por identidade).
  const openDetails = useCallback((item: ParameterHistoryItem) => {
    setSelectedHistory(item);
    setIsDetailsOpen(true);
  }, []);

  // O clique na linha é atalho de MOUSE; sem esta ação o detalhe ficaria
  // inalcançável por teclado. O gatilho "..." do DynamicTable é focável e
  // navegável por setas, e é ele que cumpre esse papel agora.
  const acoes = useMemo<Action<ParameterHistoryItem>[]>(
    () => [{ label: "Ver detalhes", icon: Eye, onClick: openDetails }],
    [openDetails],
  );

  return (
    <div className="w-full mt-8">
      <HistoryDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        historyItem={selectedHistory}
      />

      <div className="mb-3 flex items-center gap-2">
        {/* Caixa de ícone de cabeçalho de seção é NEUTRA — mesmo idioma do
            `ChartCardHeader`. Fundo tinto fica reservado para sinal de estado
            (aviso, erro), não para decorar título. O raio vem do token
            `--radius-control`, não da escala crua do Tailwind. */}
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control border ds-border-card bg-surface text-muted-foreground">
          <Calendar className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-bold uppercase tracking-tight">Histórico de Decisões de Parâmetros</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Registro de aprovações e rejeições de mudanças de parâmetros.</p>
        </div>
      </div>

      <DynamicTable
        data={history}
        columns={COLUNAS}
        actions={acoes}
        stickyActions
        searchKeys={CHAVES_BUSCA}
        searchPlaceholder="Buscar por parâmetro, solicitante ou observação..."
        searchLabel="Buscar no histórico de parâmetros"
        tableLabel="Histórico de decisões de parâmetros"
        emptyMessage="Nenhuma decisão de parâmetro registrada"
        rowKey={(item) => item.id}
        getRowLabel={(item) => item.parameter}
        onRowClick={openDetails}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        isSearching={isSearching}
        sorting={sorting}
        onSortingChange={onSortingChange}
        manualSorting={Boolean(onSortingChange)}
        loading={loading}
        hideResultsCount={Boolean(onPageChange)}
        hideEndMessage={Boolean(onPageChange)}
        footerRow={onPageChange ? (
          <PaginationControls
            page={page}
            pageSize={pageSize}
            totalItems={total}
            setPage={onPageChange}
            loading={loading}
            noun={["decisão", "decisões"]}
          />
        ) : undefined}
      />
    </div>
  );
}
