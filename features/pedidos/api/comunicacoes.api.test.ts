import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetchMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/http-client', () => ({
  apiFetch: apiFetchMock,
}));

import {
  criarComunicacao,
  fetchComunicacoesPage,
} from '@/features/pedidos/api/comunicacoes.api';

describe('criarComunicacao', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({
      id: 'comm-1',
      type: 'Email',
      status: 'Pendente',
      time: '10:00',
      content: 'Prazo renegociado.',
      recipient: 'comercial@example.com',
    });
  });

  it('agenda com a chave idempotente obrigatória no header e não a mistura ao payload', async () => {
    await criarComunicacao({
      recipient: 'comercial@example.com',
      content: 'Prazo renegociado.',
      orderRef: '#14789',
      subject: 'Pedido #14789',
      idempotencyKey: 'communication-attempt-14789',
    });

    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/comunicacoes', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'communication-attempt-14789' },
      body: JSON.stringify({
        recipient: 'comercial@example.com',
        content: 'Prazo renegociado.',
        order_ref: '#14789',
        subject: 'Pedido #14789',
      }),
    });
  });

  it('limita cursor, pageSize e chave idempotente antes de chamar o backend', async () => {
    apiFetchMock.mockResolvedValueOnce({
      rows: [],
      total: 0,
      pageSize: 100,
      nextCursor: null,
      hasMore: false,
    });
    await fetchComunicacoesPage({ pageSize: 999, cursor: 'x'.repeat(600) });

    const url = String(apiFetchMock.mock.calls[0]?.[0]);
    expect(url).toContain('pageSize=100');
    expect(new URL(url, 'https://app.example').searchParams.get('cursor')).toHaveLength(512);

    apiFetchMock.mockClear();
    await expect(criarComunicacao({
      recipient: 'comercial@example.com',
      content: 'Teste',
      idempotencyKey: 'x'.repeat(129),
    })).rejects.toThrow(/8 a 128 caracteres ASCII seguros/i);
    await expect(criarComunicacao({
      recipient: 'comercial@example.com',
      content: 'Teste',
      idempotencyKey: 'curta  ',
    })).rejects.toThrow(/8 a 128 caracteres ASCII seguros/i);
    await expect(criarComunicacao({
      recipient: 'comercial@example.com',
      content: 'Teste',
      idempotencyKey: 'abcdefgh\n',
    })).rejects.toThrow(/8 a 128 caracteres ASCII seguros/i);
    expect(apiFetchMock).not.toHaveBeenCalled();
  });
});
