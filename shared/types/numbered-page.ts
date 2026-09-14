export interface NumberedPage<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function parseNumberedPage<T>(value: unknown, resource: string): NumberedPage<T> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Resposta de ${resource} em formato inesperado.`);
  }
  const page = value as Record<string, unknown>;
  if (
    !Array.isArray(page.rows)
    || !Number.isInteger(page.total)
    || !Number.isInteger(page.page)
    || !Number.isInteger(page.pageSize)
    || !Number.isInteger(page.totalPages)
    || (page.total as number) < 0
    || (page.page as number) < 1
    || (page.pageSize as number) < 1
    || (page.totalPages as number) < 1
  ) {
    throw new Error(`Resposta de ${resource} com paginação inválida.`);
  }
  return page as unknown as NumberedPage<T>;
}
