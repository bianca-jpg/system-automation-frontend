"use client";

import * as React from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Filter,
  Inbox,
  MoreHorizontal,
  Search,
  SearchX,
  X,
} from "lucide-react";
import {
  ColumnDef,
  ColumnSizingState,
  type Row,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { Button } from "../../ui/button";
import { Badge, type BadgeVariant } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { Spinner } from "../../ui/spinner";
import { Card } from "../../ui/card";
import { IconCountBadge } from "../../ui/icon-count-badge";
import { cn, normalizeForSearch } from "../../../lib/utils";
import { createCountLabel } from "../../../lib/count-label";

type ColumnAlign = "left" | "center" | "right";

const DEFAULT_COLUMN_WIDTH = 180;
const DEFAULT_COLUMN_MIN_WIDTH = 90;
const ACTIONS_COLUMN_WIDTH = 64;
// Altura real de uma linha padrão: py-3 (12+12) + line-height do text-sm (20)
// + border-b (1) = 45px. O valor anterior (52) errava em TODA linha, e cada
// medição com delta != 0 dispara `notify()` no virtualizer e, para linhas acima
// do offset atual, uma correção de scroll (`_scrollToOffset`) — ou seja, o
// próprio virtualizer empurrava o scroll do usuário enquanto ele rolava.
const ROW_ESTIMATE_SIZE = 45;
const ROW_CLICK_INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "[role='button']",
  "[role='link']",
  "[role^='menuitem']",
  "[data-table-row-click-ignore]",
].join(",");

/* Larguras determinísticas para skeletons com aspecto orgânico (sem Math.random,
   que quebraria snapshots e hidratação). */
const SKELETON_WIDTHS = ["w-3/4", "w-1/2", "w-2/3", "w-full", "w-3/5"] as const;

const skeletonWidthClass = (rowIndex: number, colIndex: number) =>
  SKELETON_WIDTHS[(rowIndex + colIndex) % SKELETON_WIDTHS.length];

const parsePx = (value?: string) => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value.replace("px", ""), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeSortValue = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.toLocaleLowerCase();
  if (typeof value === "number")
    return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.getTime();
  return String(value).toLocaleLowerCase();
};

const resolveAlignClass = (align: ColumnAlign) => {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
};

export function shouldIgnoreRowClick(
  event: React.MouseEvent<HTMLTableRowElement>,
): boolean {
  const target = event.target;
  if (!(target instanceof Element)) return false;

  // Radix renders dropdown content in a portal. React events from that portal
  // still bubble through the row's component tree even though the menu is not
  // a DOM descendant of the row.
  if (!event.currentTarget.contains(target)) return true;

  return target.closest(ROW_CLICK_INTERACTIVE_SELECTOR) !== null;
}

/**
 * Como a célula trata conteúdo maior que a coluna. A tabela é `table-fixed`:
 * a coluna nunca cresce, então sem recorte o conteúdo pinta por cima da
 * vizinha. O default recorta com reticências.
 *
 * - `ellipsis` (default): uma linha, corta com "…".
 * - `wrap`: permite múltiplas linhas (necessário para `line-clamp-*`).
 * - `visible`: sem recorte — para células com controle interativo cujo foco ou
 *   popover precisa escapar da caixa.
 */
export type ColumnOverflow = "ellipsis" | "wrap" | "visible";

export interface ColumnConfig<T> {
  key: string;
  label: string;
  width?: string;
  minWidth?: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  /**
   * Valor usado na ordenação. Cadeia de resolução por linha:
   * `sortAccessor` → `item[key]` → `filterAccessor` (só quando o campo cru
   * não existe na linha). Defina-o sempre que o texto exibido não ordenar
   * como o usuário espera (datas/números formatados, rótulos derivados).
   */
  sortAccessor?: (item: T) => unknown;
  /**
   * Valor textual da célula para busca client-side e filtros de funil; também
   * é o fallback de ordenação de colunas computadas/aninhadas sem campo cru.
   */
  filterAccessor?: (item: T) => unknown;
  align?: ColumnAlign;
  overflow?: ColumnOverflow;
}

interface FilterOption {
  value: string;
  label: string;
  variant?: BadgeVariant;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
  // Optional value resolver for filters that don't map 1:1 to a rendered
  // column. When present it takes precedence over the column's filterAccessor
  // and the raw field lookup, letting a filter normalize the row value
  // (e.g. coerce a possibly-undefined boolean to "true"/"false").
  filterValue?: (item: unknown) => unknown;
}

export interface Action<T> {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: (item: T) => void;
  variant?: "default" | "destructive";
  show?: (item: T) => boolean;
  disabled?: (item: T) => boolean;
  disabledReason?: (item: T) => string | undefined;
}

export interface DynamicTableProps<T> {
  data: T[];
  columns: ColumnConfig<T>[];
  searchPlaceholder?: string;
  /** Accessible name announced for the search field. */
  searchLabel?: string;
  /** Native input limit, useful when the backing API has a bounded search. */
  searchMaxLength?: number;
  /** Accessible name announced for the table. */
  tableLabel?: string;
  searchKeys?: (keyof T | string)[];
  toolbarActions?: React.ReactNode;
  filters?: FilterConfig[];
  actions?: Action<T>[];
  stickyActions?: boolean;
  itemsPerPage?: number;
  loading?: boolean;
  emptyMessage?: string;
  rowKey?: (item: T) => string | number;
  /** Human-readable row label used by keyboard and action affordances. */
  getRowLabel?: (item: T) => string;
  onRowClick?: (item: T) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  isSearching?: boolean;
  /**
   * Oculta a contagem local da barra quando o consumidor possui uma contagem
   * autoritativa (por exemplo, uma lista paginada no servidor com "N de M").
   */
  hideResultsCount?: boolean;
  hideEndMessage?: boolean;
  hideLoadingMessage?: boolean;
  resizableColumns?: boolean;
  isInfiniteLoading?: boolean;
  footerRow?:
    | React.ReactNode
    | ((context: DynamicTableFooterContext) => React.ReactNode);
  persistKey?: string;
  /**
   * Fires whenever the (client-side) funnel filter selection changes, with the
   * current `{ [filterKey]: string[] }` state. Lets a caller mirror the filter
   * server-side (e.g. paginated lists that must filter the whole dataset, not
   * only the loaded page) while keeping this native funnel UI unchanged. Purely
   * additive — omit it and behaviour is exactly as before.
   */
  onActiveFiltersChange?: (filters: Record<string, string[]>) => void;
  /** Controlled sort state. Omit to keep the existing client-side state. */
  sorting?: SortingState;
  /** Receives the fully resolved next sort state after a header interaction. */
  onSortingChange?: (sorting: SortingState) => void;
  /** Leaves row ordering to the caller while preserving sortable headers. */
  manualSorting?: boolean;
}

export type DynamicTableSortingState = SortingState;

type ColumnMeta = { align: ColumnAlign; overflow: ColumnOverflow };

const COLUMN_OVERFLOW_CLASS: Record<ColumnOverflow, string> = {
  ellipsis: "",
  wrap: "whitespace-normal",
  visible: "overflow-visible",
};

type PersistedFilterState = Record<string, string[]>;

type DynamicTablePersistedState = {
  searchTerm?: string;
  activeFilters?: PersistedFilterState;
  sorting?: SortingState;
  columnSizing?: ColumnSizingState;
};

interface DynamicTableFooterContext {
  filteredCount: number;
  totalCount: number;
}

const DYNAMIC_TABLE_STORAGE_PREFIX = "system-automation:dynamic-table:v1";
const NO_PERSISTENCE_KEY = "__no_persistence__";

const formatRegisterTitle = createCountLabel({
  noun: ["registro", "registros"],
  feminine: false,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sanitizePersistedFilterState(value: unknown): PersistedFilterState {
  if (!isRecord(value)) {
    return {};
  }

  const nextState: PersistedFilterState = {};

  for (const [key, rawValues] of Object.entries(value)) {
    if (!Array.isArray(rawValues)) {
      continue;
    }

    const values = Array.from(
      new Set(
        rawValues.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        ),
      ),
    );

    if (values.length > 0) {
      nextState[key] = values;
    }
  }

  return nextState;
}

function sanitizeSortingState(value: unknown): SortingState {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const { id, desc } = item;

    if (typeof id !== "string" || typeof desc !== "boolean") {
      return [];
    }

    return [{ id, desc }];
  });
}

function sanitizeColumnSizingState(value: unknown): ColumnSizingState {
  if (!isRecord(value)) {
    return {};
  }

  const nextState: ColumnSizingState = {};

  for (const [key, rawValue] of Object.entries(value)) {
    if (
      typeof rawValue !== "number" ||
      !Number.isFinite(rawValue) ||
      rawValue <= 0
    ) {
      continue;
    }

    nextState[key] = rawValue;
  }

  return nextState;
}

function buildDynamicTableStorageKey(persistKey: string): string {
  return `${DYNAMIC_TABLE_STORAGE_PREFIX}:${persistKey}`;
}

function readPersistedDynamicTableState(
  persistKey?: string,
): DynamicTablePersistedState | null {
  if (!persistKey || typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(
      buildDynamicTableStorageKey(persistKey),
    );

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!isRecord(parsed)) {
      return null;
    }

    return {
      searchTerm:
        typeof parsed.searchTerm === "string" ? parsed.searchTerm : "",
      activeFilters: sanitizePersistedFilterState(parsed.activeFilters),
      sorting: sanitizeSortingState(parsed.sorting),
      columnSizing: sanitizeColumnSizingState(parsed.columnSizing),
    };
  } catch {
    return null;
  }
}

function normalizeFilterStateForConfig(
  state: PersistedFilterState,
  filters: FilterConfig[],
): PersistedFilterState {
  const allowedFilters = new Map(
    filters.map((filter) => [
      filter.key,
      new Set(filter.options.map((option) => option.value)),
    ]),
  );
  const nextState: PersistedFilterState = {};

  for (const [key, values] of Object.entries(state)) {
    const allowedValues = allowedFilters.get(key);

    if (!allowedValues) {
      continue;
    }

    const nextValues = values.filter((value) => allowedValues.has(value));

    if (nextValues.length > 0) {
      nextState[key] = nextValues;
    }
  }

  return nextState;
}

function createActiveFiltersMap(
  state: PersistedFilterState,
): Map<string, Set<string>> {
  return new Map(
    Object.entries(state).map(([key, values]) => [key, new Set(values)]),
  );
}

function normalizeSortingForColumns(
  state: SortingState,
  columns: ColumnConfig<unknown>[],
): SortingState {
  const availableColumns = new Set(columns.map((column) => column.key));

  return state.filter((item) => availableColumns.has(item.id));
}

function mergeColumnSizingState(
  baseState: ColumnSizingState,
  persistedState: ColumnSizingState,
  columns: ColumnConfig<unknown>[],
): ColumnSizingState {
  const availableColumns = new Set(columns.map((column) => column.key));
  const nextState: ColumnSizingState = { ...baseState };

  for (const [key, value] of Object.entries(persistedState)) {
    if (!availableColumns.has(key)) {
      continue;
    }

    nextState[key] = value;
  }

  return nextState;
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function areFilterStatesEqual(
  left: PersistedFilterState,
  right: PersistedFilterState,
): boolean {
  const leftEntries = Object.entries(left).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey),
  );
  const rightEntries = Object.entries(right).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey),
  );

  if (leftEntries.length !== rightEntries.length) {
    return false;
  }

  return leftEntries.every(([leftKey, leftValues], index) => {
    const [rightKey, rightValues] = rightEntries[index] ?? [];
    return (
      leftKey === rightKey &&
      areStringArraysEqual(leftValues, rightValues ?? [])
    );
  });
}

function areSortingStatesEqual(
  left: SortingState,
  right: SortingState,
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every(
    (item, index) =>
      item.id === right[index]?.id && item.desc === right[index]?.desc,
  );
}

function areColumnSizingStatesEqual(
  left: ColumnSizingState,
  right: ColumnSizingState,
): boolean {
  const leftEntries = Object.entries(left).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey),
  );
  const rightEntries = Object.entries(right).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey),
  );

  if (leftEntries.length !== rightEntries.length) {
    return false;
  }

  return leftEntries.every(([leftKey, leftValue], index) => {
    const [rightKey, rightValue] = rightEntries[index] ?? [];
    return leftKey === rightKey && leftValue === rightValue;
  });
}

// Defaults de array com identidade ESTÁVEL: literais inline no destructuring
// criam um array novo a cada render, re-executam o useMemo de filteredData e,
// com filtro ativo, realimentam o autoReset do TanStack em loop síncrono
// ("Maximum update depth exceeded").
const EMPTY_SEARCH_KEYS: never[] = [];
const EMPTY_FILTERS: never[] = [];
const EMPTY_ACTIONS: never[] = [];

// Default de `rowKey` com identidade ESTÁVEL. Como literal inline no
// destructuring das props ele nascia a cada render e derrubava o `React.memo`
// da linha (abaixo) para todo consumidor que não passa `rowKey` — ou seja, o
// scroll voltava a reconciliar a tabela inteira.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DEFAULT_ROW_KEY = (item: any): string | number => item.id;

/**
 * Rótulo acessível da linha. Vive no módulo (e não dentro do corpo da tabela)
 * porque precisa ter identidade estável para não invalidar o memo da linha.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveRowLabel<T extends Record<string, any>>(
  item: T,
  columns: ColumnConfig<T>[],
  rowKey: (item: T) => string | number,
  getRowLabel?: (item: T) => string,
): string {
  const customLabel = getRowLabel?.(item).trim();
  if (customLabel) return customLabel;

  const firstColumn = columns[0];
  const firstValue = firstColumn ? item[firstColumn.key] : undefined;
  if (
    typeof firstValue === "string" ||
    typeof firstValue === "number" ||
    typeof firstValue === "boolean"
  ) {
    const readableValue = String(firstValue).trim();
    if (readableValue) return readableValue;
  }

  return String(rowKey(item));
}

interface DynamicTableRowProps<T> {
  row: Row<T>;
  /**
   * As células vêm de `row.getVisibleCells()`, que o TanStack memoiza: a
   * referência só muda quando as colunas visíveis mudam. Passá-las como prop
   * (em vez de chamar o getter aqui dentro) é o que mantém o `React.memo`
   * CORRETO — sem isso, trocar `columns` sem trocar `data` deixaria a linha
   * memoizada renderizando as células antigas.
   */
  cells: ReturnType<Row<T>["getVisibleCells"]>;
  index: number;
  actions: Action<T>[];
  stickyActions: boolean;
  /**
   * Rótulo já resolvido, e não `columns`/`rowKey`/`getRowLabel`. Uma STRING
   * compara por valor no `React.memo`, então o memo sobrevive mesmo quando o
   * consumidor passa essas funções inline (identidade nova a cada render) —
   * o que é comum e derrubava a memoização da linha inteira.
   */
  rowLabel: string;
  onRowClick?: ((item: T) => void) | undefined;
  measureElement: (node: Element | null) => void;
}

/**
 * Uma linha da tabela virtualizada, isolada para poder ser memoizada.
 *
 * Rolar a tabela re-renderiza o corpo a cada frame (o virtualizer notifica a
 * cada evento de scroll). Sem este memo, cada frame reconciliava TODAS as ~20-30
 * linhas montadas — inclusive um `DropdownMenu` do Radix por linha, que é a
 * subárvore mais cara da tabela. Medido no Storybook (300 linhas, headless):
 * tirar a coluna de ações levava o frame de ~43ms para ~17ms, isolando a
 * reconciliação por linha como o gargalo dominante do scroll.
 *
 * Com o memo, um frame de scroll só monta/desmonta as linhas que realmente
 * entraram ou saíram do viewport; as demais são puladas.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DynamicTableRowInner<T extends Record<string, any>>({
  row,
  cells,
  index: rowIndex,
  actions,
  stickyActions,
  rowLabel,
  onRowClick,
  measureElement,
}: DynamicTableRowProps<T>) {
  const isRowInteractive = typeof onRowClick === "function";
  const visibleActions = actions.filter(
    (action) => !action.show || action.show(row.original),
  );

  return (
    <TableRow
      ref={measureElement}
      data-index={rowIndex}
      aria-rowindex={rowIndex + 2}
      aria-label={isRowInteractive ? `Abrir registro ${rowLabel}` : undefined}
      aria-keyshortcuts={isRowInteractive ? "Enter Space" : undefined}
      tabIndex={isRowInteractive ? 0 : undefined}
      onClick={
        isRowInteractive
          ? (event) => {
              if (shouldIgnoreRowClick(event)) return;
              onRowClick?.(row.original);
            }
          : undefined
      }
      onKeyDown={
        isRowInteractive
          ? (event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key !== "Enter" && event.key !== " ") {
                return;
              }
              event.preventDefault();
              onRowClick?.(row.original);
            }
          : undefined
      }
      className={cn(
        "group rounded-none transition-colors duration-100",
        isRowInteractive &&
          "cursor-pointer hover:bg-hover-soft focus-visible:bg-hover-soft focus-visible:outline-none focus-visible:ds-focus-ring-inset",
      )}
    >
      {cells.map((cell, index) => {
        const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
        const align = meta?.align ?? "left";
        return (
          <TableCell
            key={cell.id}
            style={{
              width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
              minWidth: `${cell.column.columnDef.minSize ?? DEFAULT_COLUMN_MIN_WIDTH}px`,
            }}
            className={cn(
              "border-b ds-border-divider px-4 py-3",
              index === 0 && "pl-5",
              resolveAlignClass(align),
              COLUMN_OVERFLOW_CLASS[meta?.overflow ?? "ellipsis"],
            )}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        );
      })}

      {actions.length > 0 && (
        <TableCell
          data-table-row-click-ignore
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "border-b ds-border-divider px-2 py-2 text-center",
            stickyActions &&
              "sticky right-0 z-10 overflow-visible border-l ds-border-divider bg-card transition-colors duration-100 group-hover:bg-surface-hover",
          )}
          style={{
            width: `${ACTIONS_COLUMN_WIDTH}px`,
            minWidth: `${ACTIONS_COLUMN_WIDTH}px`,
            maxWidth: `${ACTIONS_COLUMN_WIDTH}px`,
          }}
        >
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Abrir ações para ${rowLabel}`}
                disabled={visibleActions.length === 0}
                className="h-7 w-7 rounded-full bg-transparent text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground data-[state=open]:bg-foreground/10 data-[state=open]:text-foreground"
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {visibleActions.map((action, actionIndex) => {
                const disabled = Boolean(action.disabled?.(row.original));
                return (
                  <DropdownMenuItem
                    key={`${action.label}-${actionIndex}`}
                    disabled={disabled}
                    title={action.disabledReason?.(row.original)}
                    variant={
                      action.variant === "destructive"
                        ? "destructive"
                        : "default"
                    }
                    onSelect={(event) => {
                      event.stopPropagation();
                      if (disabled) return;
                      action.onClick?.(row.original);
                    }}
                  >
                    {action.icon && <action.icon className="h-4 w-4" />}
                    {action.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      )}
    </TableRow>
  );
}

const DynamicTableRow = React.memo(
  DynamicTableRowInner,
) as typeof DynamicTableRowInner;

interface DynamicTableBodyProps<T> {
  rows: Row<T>[];
  virtualRows: VirtualItem[];
  paddingTop: number;
  paddingBottom: number;
  measureElement: (node: Element | null) => void;
  columns: ColumnConfig<T>[];
  actions: Action<T>[];
  stickyActions: boolean;
  rowKey: (item: T) => string | number;
  getRowLabel?: ((item: T) => string) | undefined;
  onRowClick?: ((item: T) => void) | undefined;
  loading: boolean;
  itemsPerPage: number;
  isInfiniteLoading: boolean;
  emptyMessage?: string | undefined;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  /**
   * Read ONLY by the memo comparator below to freeze the body mid-resize — not
   * used in render. Column widths are driven by CSS custom properties on the
   * <table> (see `columnSizeVars`), so the body never needs to re-render while a
   * column-resize drag is in flight: the browser resolves the new widths from the
   * variables without React reconciling ~200-300 cells per pointer-move frame.
   */
  isResizingColumn: boolean;
}

/**
 * The virtualized table body, extracted so it can be memoized. Rendering it
 * inline made every column-resize pointer-move (columnResizeMode "onChange")
 * re-run flexRender for every visible cell, tanking FPS. `MemoizedDynamicTableBody`
 * short-circuits that per-frame reconciliation while a resize is active.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DynamicTableBodyInner<T extends Record<string, any>>(
  props: DynamicTableBodyProps<T>,
) {
  const {
    rows,
    virtualRows,
    paddingTop,
    paddingBottom,
    measureElement,
    columns,
    actions,
    stickyActions,
    rowKey,
    getRowLabel,
    onRowClick,
    loading,
    itemsPerPage,
    isInfiniteLoading,
    emptyMessage,
    hasActiveFilters,
    clearFilters,
  } = props;

  const totalColumns = columns.length + (actions.length > 0 ? 1 : 0);
  const emptyRegisterMessage = emptyMessage ?? formatRegisterTitle(0);

  return (
    <TableBody>
      {loading ? (
        Array.from({ length: itemsPerPage }).map((_, idx) => (
          <TableRow
            key={`loading-skeleton-${idx}`}
            className="rounded-none hover:bg-transparent"
          >
            {columns.map((_, colIndex) => (
              <TableCell
                key={`loading-skeleton-cell-${colIndex}`}
                className={cn(
                  "border-b ds-border-divider px-4 py-3",
                  colIndex === 0 && "pl-5",
                )}
              >
                <Skeleton
                  className={cn("h-3.5", skeletonWidthClass(idx, colIndex))}
                />
              </TableCell>
            ))}
            {actions.length > 0 && (
              <TableCell
                className={cn(
                  "border-b ds-border-divider px-2 py-3 text-center",
                  stickyActions &&
                    "sticky right-0 z-10 overflow-visible border-l ds-border-divider bg-card",
                )}
              >
                <Skeleton className="mx-auto h-3.5 w-7" />
              </TableCell>
            )}
          </TableRow>
        ))
      ) : rows.length === 0 ? (
        <TableRow className="rounded-none hover:bg-transparent">
          <TableCell colSpan={totalColumns} className="px-4 py-16 text-center">
            <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
                {hasActiveFilters ? (
                  <SearchX className="h-5 w-5" strokeWidth={1.75} />
                ) : (
                  <Inbox className="h-5 w-5" strokeWidth={1.75} />
                )}
              </div>
              <p className="text-sm font-medium text-foreground">
                {emptyRegisterMessage}
              </p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
      ) : (
        <>
          {paddingTop > 0 && (
            <TableRow aria-hidden="true" className="border-0 hover:bg-transparent">
              <TableCell
                colSpan={totalColumns}
                style={{ height: `${paddingTop}px` }}
              />
            </TableRow>
          )}

          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;

            return (
              <DynamicTableRow
                key={rowKey(row.original) || row.id}
                row={row}
                cells={row.getVisibleCells()}
                index={virtualRow.index}
                actions={actions}
                stickyActions={stickyActions}
                rowLabel={resolveRowLabel(
                  row.original,
                  columns,
                  rowKey,
                  getRowLabel,
                )}
                onRowClick={onRowClick}
                measureElement={measureElement}
              />
            );
          })}

          {paddingBottom > 0 && (
            <TableRow aria-hidden="true" className="border-0 hover:bg-transparent">
              <TableCell
                colSpan={totalColumns}
                style={{ height: `${paddingBottom}px` }}
              />
            </TableRow>
          )}

          {isInfiniteLoading &&
            Array.from({ length: 3 }).map((_, idx) => (
              <TableRow
                key={`infinite-skeleton-${idx}`}
                className="rounded-none hover:bg-transparent"
              >
                {columns.map((_, colIndex) => (
                  <TableCell
                    key={`infinite-skeleton-cell-${idx}-${colIndex}`}
                    className={cn(
                      "border-b ds-border-divider px-4 py-3",
                      colIndex === 0 && "pl-5",
                    )}
                  >
                    <Skeleton
                      className={cn("h-3.5", skeletonWidthClass(idx, colIndex))}
                    />
                  </TableCell>
                ))}
                {actions.length > 0 && (
                  <TableCell
                    className={cn(
                      "border-b ds-border-divider px-2 py-3 text-center",
                      stickyActions &&
                        "sticky right-0 z-10 overflow-visible border-l ds-border-divider bg-card",
                    )}
                  >
                    <Skeleton className="mx-auto h-3.5 w-7" />
                  </TableCell>
                )}
              </TableRow>
            ))}
        </>
      )}
    </TableBody>
  );
}

const MemoizedDynamicTableBody = React.memo(
  DynamicTableBodyInner,
  // Skip re-render while a column-resize drag is active: widths animate via the
  // CSS variables on the <table>, so the frozen body still shows live column
  // widths without React reconciling every cell per pointer-move frame. When the
  // drag ends `isResizingColumn` is false again → normal re-render resumes.
  (_prev, next) => next.isResizingColumn,
) as typeof DynamicTableBodyInner;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DynamicTable<T extends Record<string, any>>({
  data,
  columns,
  searchPlaceholder = "Buscar...",
  searchLabel = "Buscar registros",
  searchMaxLength,
  tableLabel = "Registros",
  searchKeys = EMPTY_SEARCH_KEYS,
  toolbarActions,
  filters = EMPTY_FILTERS,
  actions = EMPTY_ACTIONS,
  stickyActions = false,
  itemsPerPage = 20,
  loading = false,
  emptyMessage,
  rowKey = DEFAULT_ROW_KEY,
  getRowLabel,
  onRowClick,
  onSearchChange,
  hideEndMessage = false,
  hideLoadingMessage = false,
  resizableColumns = false,
  isInfiniteLoading = false,
  footerRow,
  persistKey,
  searchValue,
  isSearching = false,
  hideResultsCount = false,
  onActiveFiltersChange,
  sorting: controlledSorting,
  onSortingChange,
  manualSorting = false,
}: DynamicTableProps<T>) {
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const [activeFilterState, setActiveFilterState] =
    useState<PersistedFilterState>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [hydratedPersistKey, setHydratedPersistKey] = useState<string>(
    persistKey ? "" : NO_PERSISTENCE_KEY,
  );
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingControlledSearchRef = useRef<string | null>(null);

  // `onRowClick` com identidade estável: o handler real é lido de um ref na
  // hora do clique, então o consumidor pode passar uma arrow inline sem
  // derrubar o `React.memo` da linha (e reintroduzir a reconciliação de toda a
  // tabela a cada frame de scroll). `undefined` é preservado — é ele que define
  // se a linha é interativa.
  const onRowClickRef = useRef(onRowClick);
  useEffect(() => {
    onRowClickRef.current = onRowClick;
  }, [onRowClick]);
  const stableRowClick = useCallback((item: T) => {
    onRowClickRef.current?.(item);
  }, []);
  const rowClickHandler = onRowClick ? stableRowClick : undefined;
  const searchTerm =
    searchValue !== undefined ? searchValue : internalSearchTerm;

  const showSearch =
    searchKeys.length > 0 ||
    searchValue !== undefined ||
    onSearchChange !== undefined;
  const showHeader =
    showSearch || Boolean(toolbarActions) || filters.length > 0;
  const columnByKey = useMemo(
    () => new Map(columns.map((column) => [column.key, column])),
    [columns],
  );
  const filterByKey = useMemo(
    () => new Map(filters.map((filter) => [filter.key, filter])),
    [filters],
  );

  const initialColumnSizing = useMemo<ColumnSizingState>(() => {
    return columns.reduce<ColumnSizingState>((acc, column) => {
      const width = parsePx(column.width);
      if (width) {
        acc[column.key] = width;
      }
      return acc;
    }, {});
  }, [columns]);
  const [columnSizing, setColumnSizing] =
    useState<ColumnSizingState>(initialColumnSizing);
  const activeFilters = useMemo(
    () => createActiveFiltersMap(activeFilterState),
    [activeFilterState],
  );

  // Notify callers of funnel-filter changes so they can mirror the selection
  // server-side. No-op unless `onActiveFiltersChange` is provided.
  useEffect(() => {
    onActiveFiltersChange?.(activeFilterState);
  }, [activeFilterState, onActiveFiltersChange]);

  useEffect(() => {
    setColumnSizing((current) => {
      const nextState = mergeColumnSizingState(
        initialColumnSizing,
        current,
        columns as ColumnConfig<unknown>[],
      );

      return areColumnSizingStatesEqual(current, nextState)
        ? current
        : nextState;
    });
  }, [columns, initialColumnSizing]);

  useEffect(() => {
    setInternalSorting((current) => {
      const nextState = normalizeSortingForColumns(
        current,
        columns as ColumnConfig<unknown>[],
      );

      return areSortingStatesEqual(current, nextState) ? current : nextState;
    });
  }, [columns]);

  const sorting = useMemo(
    () => normalizeSortingForColumns(
      controlledSorting ?? internalSorting,
      columns as ColumnConfig<unknown>[],
    ),
    [columns, controlledSorting, internalSorting],
  );

  const handleSortingChange = useCallback(
    (updater: SortingState | ((previous: SortingState) => SortingState)) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const normalized = normalizeSortingForColumns(
        next,
        columns as ColumnConfig<unknown>[],
      );
      if (controlledSorting === undefined) {
        setInternalSorting(normalized);
      }
      onSortingChange?.(normalized);
    },
    [columns, controlledSorting, onSortingChange, sorting],
  );

  useEffect(() => {
    setActiveFilterState((current) => {
      const nextState = normalizeFilterStateForConfig(current, filters);

      return areFilterStatesEqual(current, nextState) ? current : nextState;
    });
  }, [filters]);

  useLayoutEffect(() => {
    pendingControlledSearchRef.current = null;
    setHydratedPersistKey(persistKey ? "" : NO_PERSISTENCE_KEY);
  }, [persistKey]);

  useEffect(() => {
    if (!persistKey) {
      setHydratedPersistKey(NO_PERSISTENCE_KEY);
      return;
    }

    if (hydratedPersistKey === persistKey) {
      return;
    }

    const persistedState = readPersistedDynamicTableState(persistKey);

    if (!persistedState) {
      setHydratedPersistKey(persistKey);
      return;
    }

    const nextFilters = normalizeFilterStateForConfig(
      persistedState.activeFilters ?? {},
      filters,
    );
    const nextSorting = normalizeSortingForColumns(
      persistedState.sorting ?? [],
      columns as ColumnConfig<unknown>[],
    );
    const nextColumnSizing = mergeColumnSizingState(
      initialColumnSizing,
      persistedState.columnSizing ?? {},
      columns as ColumnConfig<unknown>[],
    );

    setActiveFilterState((current) =>
      areFilterStatesEqual(current, nextFilters) ? current : nextFilters,
    );
    setInternalSorting((current) =>
      areSortingStatesEqual(current, nextSorting) ? current : nextSorting,
    );
    setColumnSizing((current) =>
      areColumnSizingStatesEqual(current, nextColumnSizing)
        ? current
        : nextColumnSizing,
    );

    if (typeof persistedState.searchTerm !== "string") {
      pendingControlledSearchRef.current = null;
      setHydratedPersistKey(persistKey);
      return;
    }

    const nextSearchTerm = persistedState.searchTerm;

    if (searchValue === undefined) {
      setInternalSearchTerm((current) =>
        current === nextSearchTerm ? current : nextSearchTerm,
      );
      pendingControlledSearchRef.current = null;
      setHydratedPersistKey(persistKey);
      return;
    }

    if (nextSearchTerm !== searchValue) {
      pendingControlledSearchRef.current = nextSearchTerm;
      onSearchChange?.(nextSearchTerm);
      return;
    }

    pendingControlledSearchRef.current = null;
    setHydratedPersistKey(persistKey);
  }, [
    columns,
    filters,
    hydratedPersistKey,
    initialColumnSizing,
    onSearchChange,
    persistKey,
    searchValue,
  ]);

  useEffect(() => {
    if (!persistKey) {
      return;
    }

    if (
      pendingControlledSearchRef.current !== null &&
      searchValue === pendingControlledSearchRef.current
    ) {
      pendingControlledSearchRef.current = null;
      setHydratedPersistKey(persistKey);
    }
  }, [persistKey, searchValue]);

  useEffect(() => {
    if (
      !persistKey ||
      hydratedPersistKey !== persistKey ||
      typeof window === "undefined"
    ) {
      return;
    }

    const nextState: DynamicTablePersistedState = {
      searchTerm,
      activeFilters: activeFilterState,
      sorting,
      columnSizing,
    };

    try {
      window.localStorage.setItem(
        buildDynamicTableStorageKey(persistKey),
        JSON.stringify(nextState),
      );
    } catch {
      // Ignore persistence errors.
    }
  }, [
    activeFilterState,
    columnSizing,
    hydratedPersistKey,
    persistKey,
    searchTerm,
    sorting,
  ]);

  const filteredData = useMemo(() => {
    let result = data;

    activeFilters.forEach((values, filterKey) => {
      if (values.size === 0) return;
      const filterConfig = filterByKey.get(filterKey);
      const columnConfig = columnByKey.get(filterKey);
      result = result.filter((item) => {
        const resolvedValue = filterConfig?.filterValue
          ? filterConfig.filterValue(item)
          : columnConfig?.filterAccessor
            ? columnConfig.filterAccessor(item)
            : item[filterKey];
        return values.has(String(resolvedValue ?? ""));
      });
    });

    if (searchTerm && searchKeys.length > 0) {
      const normalizedSearch = normalizeForSearch(searchTerm.trim());
      if (normalizedSearch.length > 0) {
        result = result.filter((item) =>
          searchKeys.some((key) => {
            const keyName = String(key);
            const columnConfig = columnByKey.get(keyName);
            const resolvedValue = columnConfig?.filterAccessor
              ? columnConfig.filterAccessor(item)
              : item[keyName];
            return normalizeForSearch(String(resolvedValue ?? "")).includes(
              normalizedSearch,
            );
          }),
        );
      }
    }

    return result;
  }, [activeFilters, columnByKey, filterByKey, data, searchKeys, searchTerm]);

  const tableColumns = useMemo<ColumnDef<T>[]>(() => {
    return columns.map((column) => ({
      id: column.key,
      accessorFn: (item) => {
        if (column.sortAccessor) {
          return normalizeSortValue(column.sortAccessor(item));
        }
        const rawValue = item[column.key];
        // Coluna computada/aninhada não tem o campo cru na linha: sem este
        // fallback a ordenação compararia "" com "" e o clique no cabeçalho
        // não reordenaria nada. O filterAccessor devolve o texto exibido,
        // então a ordem acompanha o que o usuário vê na célula.
        const value =
          rawValue === undefined ? column.filterAccessor?.(item) : rawValue;
        return normalizeSortValue(value);
      },
      header: () => column.label,
      cell: ({ row }) => {
        if (column.render) {
          return column.render(row.original);
        }
        return String(row.original[column.key] ?? "");
      },
      enableSorting: column.sortable !== false,
      size: parsePx(column.width) ?? DEFAULT_COLUMN_WIDTH,
      minSize: parsePx(column.minWidth) ?? DEFAULT_COLUMN_MIN_WIDTH,
      meta: {
        align: column.align ?? "left",
        overflow: column.overflow ?? "ellipsis",
      } satisfies ColumnMeta,
    }));
  }, [columns]);

  const table = useReactTable({
    data: filteredData,
    columns: tableColumns,
    state: {
      sorting,
      columnSizing,
    },
    // Não há getPaginationRowModel aqui (paginação é externa, via
    // LoadMoreButton/footerRow); o auto-reset default só agenda um
    // setPagination inútil a cada troca de identidade de data.
    autoResetPageIndex: false,
    onSortingChange: handleSortingChange,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting,
    columnResizeMode: "onChange",
    enableColumnResizing: resizableColumns,
    defaultColumn: {
      size: DEFAULT_COLUMN_WIDTH,
      minSize: DEFAULT_COLUMN_MIN_WIDTH,
    },
  });

  const rows = table.getRowModel().rows;

  // O cache de alturas do virtualizer é chaveado por `getItemKey`, cujo default
  // é o ÍNDICE. Com índice, ordenar ou filtrar reaproveita a altura medida da
  // linha que ocupava aquela posição antes — alturas erradas viram correção de
  // scroll (`_scrollToOffset`) e salto visível. Chaveando pela identidade da
  // linha, a medição acompanha o registro.
  // A identidade da função precisa ser ESTÁVEL: `getItemKey` entra nas deps do
  // memo `getMeasurementOptions` do virtual-core, e trocá-la a cada render
  // invalidaria as medições inteiras por frame.
  const itemKeySourceRef = useRef({ rows, rowKey });
  itemKeySourceRef.current = { rows, rowKey };
  const getItemKey = useCallback((index: number) => {
    const { rows: currentRows, rowKey: currentRowKey } =
      itemKeySourceRef.current;
    const row = currentRows[index];
    if (!row) return index;
    return currentRowKey(row.original) || row.id;
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getItemKey,
    // Deterministic first viewport for SSR/jsdom and the first client paint.
    // The observer replaces this estimate as soon as the scroll container is
    // measured, so large datasets remain virtualized.
    initialRect: {
      width: 0,
      height:
        Math.max(1, Math.min(itemsPerPage, rows.length)) * ROW_ESTIMATE_SIZE,
    },
    estimateSize: () => ROW_ESTIMATE_SIZE,
    getScrollElement: () => tableContainerRef.current,
    // SEM override de `measureElement`: o default do @tanstack/virtual-core lê
    // `entry.borderBoxSize` que o próprio ResizeObserver já entrega (custo zero)
    // e só cai para `offsetHeight` no caminho do ref. O override anterior
    // (`element.getBoundingClientRect().height`) descartava esse `entry` e
    // forçava layout síncrono DENTRO do callback do ResizeObserver — layout
    // thrashing clássico: ~480 reflows forçados num scroll de 140 frames.
    overscan: 8,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalVirtualSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalVirtualSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0;

  const columnSizingInfo = table.getState().columnSizingInfo;
  const isResizingColumn = Boolean(columnSizingInfo.isResizingColumn);

  // Column widths live as CSS custom properties on the <table>. A resize then
  // mutates variables on a SINGLE element per frame — the memoized body stays
  // frozen and the browser resolves each cell's `calc(var(--col-*-size) * 1px)`
  // from here, instead of React rewriting the inline width of every visible cell.
  // Cheap to rebuild each render (a couple dozen keys); React diffs the style
  // object and writes only the variables that actually changed.
  const columnSizeVars: Record<string, number> = {};
  for (const header of table.getFlatHeaders()) {
    columnSizeVars[`--header-${header.id}-size`] = header.getSize();
    columnSizeVars[`--col-${header.column.id}-size`] = header.column.getSize();
  }

  const toggleFilter = (filterKey: string, value: string) => {
    setActiveFilterState((previous) => {
      const nextValues = new Set(previous[filterKey] ?? []);

      if (nextValues.has(value)) {
        nextValues.delete(value);
      } else {
        nextValues.add(value);
      }

      if (nextValues.size === 0) {
        const rest = { ...previous };
        delete rest[filterKey];
        return rest;
      }

      return {
        ...previous,
        [filterKey]: Array.from(nextValues),
      };
    });
  };

  const clearFilters = () => {
    setActiveFilterState({});
    if (searchValue === undefined) {
      setInternalSearchTerm("");
    }
    onSearchChange?.("");
  };

  const hasActiveFilters =
    Object.keys(activeFilterState).length > 0 || searchTerm.length > 0;
  const totalActiveFilters = Object.values(activeFilterState).reduce(
    (total, values) => total + values.length,
    0,
  );
  const resultsLabel = filteredData.length === 1 ? "registro" : "registros";

  const loadedRegisterMessage = formatRegisterTitle(filteredData.length);
  const resolvedFooterRow =
    typeof footerRow === "function"
      ? footerRow({
          filteredCount: filteredData.length,
          totalCount: data.length,
        })
      : footerRow;

  return (
    <Card data-slot="dynamic-table" className="overflow-hidden py-0">
      {showHeader && (
        <div className="flex flex-col gap-3 border-b ds-border-divider px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {showSearch && (
              // min-h-12: abaixo de lg o toolbar é flex-col, e o `flex-1`
              // (flex-basis: 0%) passa a incidir sobre a ALTURA, colapsando o
              // h-12 para o min-content (~21px). O flex-1 fica para preservar o
              // crescimento horizontal em desktop.
              // items-stretch (e filhos sem h-full): como o flex-basis torna a
              // altura da caixa indefinida, `height: 100%` nos filhos resolvia
              // para auto e a área clicável do input ficava com ~19px dentro de
              // uma caixa de 48px. Com stretch, input e ícone ocupam a altura
              // inteira.
              <div className="flex h-12 min-h-12 w-full flex-1 items-stretch rounded-2xl border ds-border-control bg-transparent shadow-xs transition-[box-shadow,border-color]  focus-within:ds-focus-ring ">
                <div className="pointer-events-none flex w-12 shrink-0 items-center justify-center text-muted-foreground">
                  {isSearching ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <Search className="h-4 w-4" strokeWidth={2.25} />
                  )}
                </div>
                <input
                  data-slot="input"
                  type="search"
                  aria-label={searchLabel}
                  maxLength={searchMaxLength}
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (searchValue === undefined) {
                      setInternalSearchTerm(nextValue);
                    }
                    onSearchChange?.(nextValue);
                  }}
                  className="w-full min-w-0 border-0 bg-transparent pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {toolbarActions}

              {filters.length > 0 && (
                <DropdownMenu
                  modal={false}
                  open={isFilterOpen}
                  onOpenChange={setIsFilterOpen}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={
                        totalActiveFilters > 0
                          ? `Filtros (${totalActiveFilters} ativos)`
                          : "Filtros"
                      }
                      className={cn(
                        "relative h-10 w-10 rounded-full bg-background/80 text-muted-foreground shadow-xs hover:bg-hover-soft hover:text-foreground",
                        "data-[state=open]:bg-hover-soft data-[state=open]:text-foreground",
                        totalActiveFilters > 0 &&
                          "ds-border-info text-foreground",
                      )}
                    >
                      <Filter className="h-4 w-4" strokeWidth={2.25} />
                      <IconCountBadge
                        count={totalActiveFilters}
                        className="absolute -right-1.5 -top-1.5"
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <div className="flex items-center justify-between gap-3 px-2 py-1.5">
                      <span className="text-sm font-medium text-foreground">
                        Filtros
                      </span>
                      {totalActiveFilters > 0 ? (
                        <span className="text-xs font-medium text-info">
                          {totalActiveFilters} ativo
                          {totalActiveFilters > 1 ? "s" : ""}
                        </span>
                      ) : null}
                    </div>
                    <DropdownMenuSeparator />
                    {filters.map((filter, index) => (
                      <div key={filter.key}>
                        {index > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuLabel inset>
                          {filter.label}
                        </DropdownMenuLabel>
                        {filter.options.map((option) => (
                          <DropdownMenuCheckboxItem
                            key={option.value}
                            checked={
                              activeFilters
                                .get(filter.key)
                                ?.has(option.value) ?? false
                            }
                            onCheckedChange={() =>
                              toggleFilter(filter.key, option.value)
                            }
                            className="cursor-pointer"
                          >
                            <Badge
                              variant={option.variant || "default"}
                              size="compact"
                              className="mr-2"
                            >
                              {option.label}
                            </Badge>
                          </DropdownMenuCheckboxItem>
                        ))}
                      </div>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="h-9 w-auto rounded-full px-3 text-xs text-muted-foreground hover:bg-hover-soft hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>

          {showHeader && (!hideResultsCount || hasActiveFilters) && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {!hideResultsCount && (
                <span role="status" aria-live="polite">
                  {loading
                    ? "Carregando registros..."
                    : `Mostrando ${filteredData.length} ${resultsLabel}`}
                </span>
              )}
              {!loading &&
                Array.from(activeFilters.entries()).flatMap(
                  ([filterKey, values]) => {
                    const filterConfig = filters.find(
                      (filter) => filter.key === filterKey,
                    );
                    return Array.from(values).map((value) => {
                      const option = filterConfig?.options.find(
                        (item) => item.value === value,
                      );
                      if (!option) return null;
                      return (
                        <button
                          key={`${filterKey}-${value}`}
                          type="button"
                          aria-label={`Remover filtro ${option.label}`}
                          onClick={() => toggleFilter(filterKey, value)}
                          className="rounded-full outline-none  focus-visible:ds-focus-ring "
                        >
                          <Badge
                            variant={option.variant}
                            size="compact"
                            className="gap-1.5 transition-opacity hover:opacity-80"
                          >
                            {option.label}
                            <X className="size-3" aria-hidden="true" />
                          </Badge>
                        </button>
                      );
                    });
                  },
                )}
            </div>
          )}
        </div>
      )}

      <div
        ref={tableContainerRef}
        className="max-h-[68vh] w-full min-w-0 max-w-full overflow-auto [scrollbar-gutter:stable]"
      >
        <table
          aria-label={tableLabel}
          aria-rowcount={rows.length + 1}
          className="w-full border-separate border-spacing-0 table-fixed caption-bottom text-sm"
          style={{
            ...columnSizeVars,
            minWidth: `${table.getTotalSize() + (actions.length > 0 ? ACTIONS_COLUMN_WIDTH : 0)}px`,
          }}
        >
          <TableHeader className="sticky top-0 z-30">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="rounded-none hover:bg-transparent"
              >
                {headerGroup.headers.map((header, index) => {
                  const meta = header.column.columnDef.meta as
                    | ColumnMeta
                    | undefined;
                  const align = meta?.align ?? "left";
                  const sortState = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();

                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={
                        canSort
                          ? sortState === "asc"
                            ? "ascending"
                            : sortState === "desc"
                              ? "descending"
                              : "none"
                          : undefined
                      }
                      style={{
                        width: `calc(var(--header-${header.id}-size) * 1px)`,
                        minWidth: `${header.column.columnDef.minSize ?? DEFAULT_COLUMN_MIN_WIDTH}px`,
                      }}
                      className={cn(
                        "group/head sticky top-0 z-30 border-b ds-border-neutral bg-surface px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground",
                        index === 0 && "pl-5",
                        resolveAlignClass(align),
                      )}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            // Anel inset: o <th> agora recorta o overflow, e um
                            // anel externo ficaria cortado.
                            "inline-flex w-full items-center gap-1.5 rounded-sm font-medium uppercase tracking-wider outline-none transition-colors hover:text-foreground focus-visible:ds-focus-ring-inset",
                            sortState && "text-foreground",
                            align === "center"
                              ? "justify-center"
                              : align === "right"
                                ? "justify-end"
                                : "justify-start",
                          )}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {sortState === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5 shrink-0" />
                          ) : sortState === "desc" ? (
                            <ArrowDown className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-focus-within/head:opacity-60 group-hover/head:opacity-60" />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}

                      {resizableColumns && (
                        <button
                          type="button"
                          aria-label={`Redimensionar coluna ${
                            columnByKey.get(header.column.id)?.label ??
                            header.column.id
                          }. Use as setas para ajustar ou Home para restaurar`}
                          aria-keyshortcuts="ArrowLeft ArrowRight Home"
                          title="Arraste ou use as setas para redimensionar; Home ou clique duplo restaura"
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          onDoubleClick={() => header.column.resetSize()}
                          onKeyDown={(event) => {
                            if (event.key === "Home") {
                              event.preventDefault();
                              header.column.resetSize();
                              return;
                            }

                            if (
                              event.key !== "ArrowLeft" &&
                              event.key !== "ArrowRight"
                            ) {
                              return;
                            }

                            event.preventDefault();
                            const step = event.shiftKey ? 25 : 10;
                            const direction =
                              event.key === "ArrowRight" ? step : -step;
                            const minimum =
                              header.column.columnDef.minSize ??
                              DEFAULT_COLUMN_MIN_WIDTH;
                            const maximum =
                              header.column.columnDef.maxSize ??
                              Number.MAX_SAFE_INTEGER;
                            setColumnSizing((current) => {
                              const currentSize =
                                current[header.column.id] ??
                                header.column.getSize();
                              const nextSize = Math.min(
                                maximum,
                                Math.max(minimum, currentSize + direction),
                              );

                              return {
                                ...current,
                                [header.column.id]: nextSize,
                              };
                            });
                          }}
                          className="group/resize absolute right-0 top-0 flex h-full w-6 cursor-col-resize items-center justify-center outline-none focus-visible:bg-ring/15 focus-visible:ds-focus-ring-inset"
                        >
                          {/* Risquinho sempre visível — affordance de onde puxar. */}
                          <span
                            aria-hidden="true"
                            className={cn(
                              "h-4 w-0.5 rounded-full bg-foreground/20 transition-colors group-hover/resize:bg-foreground/50",
                              header.column.getIsResizing() &&
                                "bg-foreground/60",
                            )}
                          />
                        </button>
                      )}
                    </TableHead>
                  );
                })}

                {actions.length > 0 && (
                  <TableHead
                    className={cn(
                      "sticky top-0 z-40 w-16 border-b ds-border-neutral bg-surface px-2 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground",
                      stickyActions &&
                        "sticky right-0 z-50 overflow-visible border-l ds-border-divider",
                    )}
                    style={{
                      width: `${ACTIONS_COLUMN_WIDTH}px`,
                      minWidth: `${ACTIONS_COLUMN_WIDTH}px`,
                      maxWidth: `${ACTIONS_COLUMN_WIDTH}px`,
                    }}
                  >
                    Ações
                  </TableHead>
                )}
              </TableRow>
            ))}
          </TableHeader>

          <MemoizedDynamicTableBody
            rows={rows}
            virtualRows={virtualRows}
            paddingTop={paddingTop}
            paddingBottom={paddingBottom}
            measureElement={rowVirtualizer.measureElement}
            columns={columns}
            actions={actions}
            stickyActions={stickyActions}
            rowKey={rowKey}
            getRowLabel={getRowLabel}
            onRowClick={rowClickHandler}
            loading={loading}
            itemsPerPage={itemsPerPage}
            isInfiniteLoading={isInfiniteLoading}
            emptyMessage={emptyMessage}
            hasActiveFilters={hasActiveFilters}
            clearFilters={clearFilters}
            isResizingColumn={isResizingColumn}
          />
        </table>
      </div>

      {/* Footer (load-more / counts) lives OUTSIDE the horizontal-scroll
          container so it stays centered on the card width — a footer row inside
          the table is centered on the full (overflowing) table width and drifts
          off-center whenever the table scrolls sideways. */}
      {resolvedFooterRow ? (
        <div className="border-t ds-border-divider px-4 py-4">
          {resolvedFooterRow}
        </div>
      ) : null}

      {!hideLoadingMessage && isInfiniteLoading && (
        <div className="p-4 text-center text-sm text-muted-foreground">
          Carregando mais dados...
        </div>
      )}

      {!hideEndMessage &&
        !loading &&
        !isInfiniteLoading &&
        filteredData.length > 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {loadedRegisterMessage}
          </div>
        )}
    </Card>
  );
}
