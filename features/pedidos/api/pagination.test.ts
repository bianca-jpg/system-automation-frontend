import { describe, expect, it } from 'vitest';
import {
  boundedCursor,
  boundedPageSize,
  parseCursorPage,
} from '@/features/pedidos/api/pagination';

describe('limites de paginação', () => {
  it('normaliza pageSize e cursor antes da requisição', () => {
    expect(boundedPageSize(undefined, 25)).toBe(25);
    expect(boundedPageSize(0, 25)).toBe(1);
    expect(boundedPageSize(999, 100)).toBe(100);
    expect(boundedCursor('x'.repeat(600))).toHaveLength(512);
    expect(boundedCursor('')).toBeNull();
  });
});

describe('parseCursorPage', () => {
  it('normaliza o contrato camelCase do backend', () => {
    expect(parseCursorPage<{ id: string }>({
      rows: [{ id: '1' }],
      total: 3,
      pageSize: 1,
      nextCursor: 'cursor-2',
      hasMore: true,
    }, 'pedidos')).toEqual({
      rows: [{ id: '1' }],
      total: 3,
      pageSize: 1,
      nextCursor: 'cursor-2',
      hasMore: true,
    });
  });

  it('aceita aliases snake_case durante rollout sem aceitar resposta ilimitada', () => {
    expect(parseCursorPage<{ id: string }>({
      rows: [{ id: '1' }],
      total: 1,
      page_size: 25,
      next_cursor: null,
      has_more: false,
    }, 'alertas').hasMore).toBe(false);

    expect(() => parseCursorPage([], 'alertas')).toThrow(/formato inesperado/i);
  });

  it('rejeita metadados ausentes ou incoerentes em vez de inventar paginação local', () => {
    expect(() => parseCursorPage({ rows: [] }, 'pedidos')).toThrow(/total inválido/i);
    expect(() => parseCursorPage({
      rows: [{ id: '1' }],
      total: 1,
      pageSize: 25,
      nextCursor: null,
      hasMore: true,
    }, 'pedidos')).toThrow(/cursor e hasMore inconsistentes/i);
    expect(() => parseCursorPage({
      rows: [{ id: '1' }, { id: '2' }],
      total: 2,
      pageSize: 1,
      nextCursor: null,
      hasMore: false,
    }, 'pedidos')).toThrow(/limites de página inconsistentes/i);
  });
});
