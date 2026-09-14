export interface CursorPage<T> {
  rows: T[];
  total: number;
  pageSize: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export const DEFAULT_CURSOR_PAGE_SIZE = 25;

export function boundedPageSize(value: number | undefined, maximum: number): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_CURSOR_PAGE_SIZE;
  return Math.min(maximum, Math.max(1, Math.floor(value)));
}

export function boundedCursor(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 512);
}

type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonNegativeInteger(value: unknown, field: string, resource: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`Resposta de ${resource} com ${field} inválido.`);
  }
  return value;
}

function positiveInteger(value: unknown, field: string, resource: string): number {
  const parsed = nonNegativeInteger(value, field, resource);
  if (parsed === 0) {
    throw new Error(`Resposta de ${resource} com ${field} inválido.`);
  }
  return parsed;
}

/**
 * Normaliza o envelope paginado do backend e aceita aliases snake_case durante
 * a transição. Uma resposta sem `rows` é erro de contrato: transformar isso em
 * lista vazia esconderia uma quebra de API como se não houvesse dados.
 */
export function parseCursorPage<T>(value: unknown, resource: string): CursorPage<T> {
  if (!isRecord(value)) {
    throw new Error(`Resposta de ${resource} em formato inesperado.`);
  }

  const rows = value.rows ?? value.items;
  if (!Array.isArray(rows)) {
    throw new Error(`Resposta de ${resource} sem uma lista paginada válida.`);
  }

  const total = nonNegativeInteger(value.total, 'total', resource);
  const pageSize = positiveInteger(value.pageSize ?? value.page_size, 'pageSize', resource);
  if (rows.length > pageSize || rows.length > total) {
    throw new Error(`Resposta de ${resource} com limites de página inconsistentes.`);
  }

  const nextCursorValue = value.nextCursor ?? value.next_cursor ?? null;
  if (nextCursorValue !== null && (
    typeof nextCursorValue !== 'string' || nextCursorValue.length === 0
  )) {
    throw new Error(`Resposta de ${resource} com nextCursor inválido.`);
  }
  const nextCursor = nextCursorValue as string | null;
  const hasMoreValue = value.hasMore ?? value.has_more;
  if (typeof hasMoreValue !== 'boolean') {
    throw new Error(`Resposta de ${resource} com hasMore inválido.`);
  }
  if (hasMoreValue !== (nextCursor !== null)) {
    throw new Error(`Resposta de ${resource} com cursor e hasMore inconsistentes.`);
  }

  return {
    rows: rows as T[],
    total,
    pageSize,
    nextCursor,
    hasMore: hasMoreValue,
  };
}
