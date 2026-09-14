import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ProductGradeDetailModal,
  type GroupedProduct,
} from './product-grade-detail-modal';
import { updateProductGrades } from '@/features/pedidos/api/pedidos.api';
import { useProductClients } from '@/features/pedidos/model/use-product-clients';
import { useRealtime } from '@/features/realtime';
import type { Order, ProductItem } from '@/shared/types/models';

vi.mock('@/features/pedidos/api/pedidos.api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/features/pedidos/api/pedidos.api')>();
  return { ...actual, updateProductGrades: vi.fn() };
});

vi.mock('@/features/pedidos/model/use-product-clients', () => ({
  useProductClients: vi.fn(),
}));

vi.mock('@/features/realtime', () => ({
  useRealtime: vi.fn(),
}));

const updateGradesMock = vi.mocked(updateProductGrades);
const useProductClientsMock = vi.mocked(useProductClients);
const useRealtimeMock = vi.mocked(useRealtime);
let ordersRevision = 0;
let resyncGeneration = 0;

function makeOrder(): Order {
  return {
    id: '#123',
    client: 'Loja Centro',
    value: 500,
    originalValueBeforeAdequacao: 500,
    status: 'OR com adequação',
    motivo: 'Em edição',
    canal: 'Franquia',
    items: [],
    adequacaoAplicada: true,
    adequacaoValorAjustado: 0,
  };
}

// Irmão de makeOrder(): id/cliente distintos de propósito, para os dois
// poderem coexistir na mesma tabela sem colidir em `row.key`
// (`${order.id}|${item.code}`). Orçamento default confortável (0 de 10 usado
// nos dois lados) — testes de estouro sobrescrevem via `overrides`.
function makeOrderSemAdequacao(overrides: Partial<Order> = {}): Order {
  return {
    ...makeOrder(),
    id: '#456',
    client: 'Loja Sem Adequação',
    status: 'OR sem adequação',
    adequacaoAplicada: false,
    orcamentoPedido: {
      nrPedido: 456,
      limiteAdicao: 10,
      consumidoAdicao: 0,
      restanteAdicao: 10,
      limiteCorte: 10,
      consumidoCorte: 0,
      restanteCorte: 10,
    },
    ...overrides,
  };
}

const item: ProductItem = {
  code: 'SAP-1',
  name: 'Sapato',
  qty: 5,
  unitValue: 100,
  cdStatus: 'Regular',
  sizes: { '36': 2, '37': 3 },
};

const product: GroupedProduct = {
  code: item.code,
  name: item.name,
  unitValue: item.unitValue,
  totalQty: 5,
  totalValue: 500,
  orders: [],
  ordersCount: 1,
  stock: 20,
  sizeKeys: ['36', '37'],
  sizes: { '36': 2, '37': 3 },
  channel: 'Franquia',
  stage: 'edicao',
};

function resource(overrides: Record<string, unknown> = {}) {
  return {
    rows: [{ order: makeOrder(), item, version: 'opaque-v1' }],
    total: 1,
    pageSize: 25,
    nextCursor: null,
    hasMore: false,
    loading: false,
    loadingMore: false,
    refreshing: false,
    error: null,
    loadedOnce: true,
    summary: {
      code: item.code,
      name: item.name,
      channel: 'Franquia',
      totalClients: 1,
      totalQty: 5,
      totalValue: 500,
      originalTotalValue: 500,
      stock: 20,
      sizeKeys: ['36', '37'],
      sizeTotals: { '36': 2, '37': 3 },
    },
    acceptedRevision: 0,
    acceptedResyncGeneration: 0,
    reload: vi.fn().mockResolvedValue(true),
    loadMore: vi.fn().mockResolvedValue(false),
    setRows: vi.fn(),
    ...overrides,
  };
}

describe('ProductGradeDetailModal', () => {
  beforeEach(() => {
    updateGradesMock.mockReset();
    useProductClientsMock.mockReset();
    ordersRevision = 0;
    resyncGeneration = 0;
    useRealtimeMock.mockImplementation(() => ({
      connectionState: 'connected',
      resyncGeneration,
      topicRevisions: { orders: ordersRevision, alerts: 0, communications: 0, history: 0 },
      unseenTopics: { orders: false, alerts: false, communications: false, history: false },
      markTopicRead: vi.fn().mockResolvedValue(undefined),
      requestReconnect: vi.fn(),
      clearPersistedState: vi.fn(),
    }));
  });

  it('faz roundtrip das chaves dinamicas 36/37 sem perder nem fabricar tamanhos', async () => {
    const clients = resource();
    useProductClientsMock.mockReturnValue(clients as ReturnType<typeof useProductClients>);
    updateGradesMock.mockResolvedValue({ status: 'updated', updatedCount: 1, totalQty: 5, totalValue: 500 });
    const onClose = vi.fn();
    const onSaved = vi.fn();
    const user = userEvent.setup();

    render(<ProductGradeDetailModal product={product} onClose={onClose} onSaved={onSaved} />);
    const size36 = await screen.findByRole('textbox', { name: 'Quantidade do tamanho 36 para Loja Centro' });
    const size37 = screen.getByRole('textbox', { name: 'Quantidade do tamanho 37 para Loja Centro' });
    await user.clear(size36);
    await user.type(size36, '4');
    await user.clear(size37);
    await user.type(size37, '1');
    await user.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

    await waitFor(() => expect(updateGradesMock).toHaveBeenCalledTimes(1));
    expect(updateGradesMock).toHaveBeenCalledWith('SAP-1', 'Franquia', [{
      orderId: 123,
      expectedVersion: 'opaque-v1',
      expectedTotalQty: 5,
      sizes: { '36': 4, '37': 1 },
    }]);
    expect(updateGradesMock.mock.calls[0]?.[2][0]?.sizes).not.toHaveProperty('PP');
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ updatedCount: 1 }));
  });

  it('mantem o modal aberto no 409 e oferece uma releitura explicita', async () => {
    const reload = vi.fn().mockResolvedValue(true);
    useProductClientsMock.mockReturnValue(resource({ reload }) as ReturnType<typeof useProductClients>);
    const stale = Object.assign(new Error('API error: 409'), { status: 409 });
    updateGradesMock.mockRejectedValue(stale);
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<ProductGradeDetailModal product={product} onClose={onClose} onSaved={vi.fn()} />);
    const size36 = await screen.findByRole('textbox', { name: /tamanho 36/i });
    const size37 = screen.getByRole('textbox', { name: /tamanho 37/i });
    fireEvent.change(size36, { target: { value: '4' } });
    fireEvent.change(size37, { target: { value: '1' } });
    await user.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/mudou no servidor/i);
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /Descartar rascunho e recarregar/i }));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(2));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('aguarda a aprovação assíncrona antes de fechar', async () => {
    useProductClientsMock.mockReturnValue(resource() as ReturnType<typeof useProductClients>);
    let resolveApproval!: () => void;
    const onApprove = vi.fn(() => new Promise<void>(resolve => { resolveApproval = resolve; }));
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<ProductGradeDetailModal product={product} onClose={onClose} onApprove={onApprove} />);
    await user.click(await screen.findByRole('button', { name: 'Aprovar OR' }));

    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    resolveApproval();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('preserva o rascunho e sinaliza conflito quando chega uma revisão realtime', async () => {
    const initial = resource();
    const updatedItem = { ...item, qty: 12, sizes: { '36': 9, '37': 3 } };
    const updated = resource({
      rows: [{ order: makeOrder(), item: updatedItem, version: 'opaque-v2' }],
      acceptedRevision: 2,
      summary: {
        ...initial.summary,
        totalQty: 12,
        totalValue: 1200,
        sizeTotals: { '36': 9, '37': 3 },
      },
    });
    useProductClientsMock.mockImplementation(({ revision }) => (
      revision === 2 ? updated : initial
    ) as ReturnType<typeof useProductClients>);

    const { rerender } = render(
      <ProductGradeDetailModal product={product} onClose={vi.fn()} onSaved={vi.fn()} />,
    );
    const size36 = await screen.findByRole('textbox', { name: /tamanho 36/i });
    fireEvent.change(size36, { target: { value: '4' } });
    fireEvent.change(screen.getByRole('textbox', { name: /tamanho 37/i }), { target: { value: '1' } });

    ordersRevision = 2;
    rerender(<ProductGradeDetailModal product={product} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/atualizados enquanto você editava/i);
    expect(screen.getByRole('textbox', { name: /tamanho 36/i })).toHaveValue('4');
    expect(useProductClientsMock).toHaveBeenLastCalledWith(expect.objectContaining({ revision: 2 }));
  });

  it('substitui versões e grades no resync mesmo quando o watermark não muda', async () => {
    const initial = resource();
    const updated = resource({
      rows: [{
        order: makeOrder(),
        item: { ...item, qty: 10, sizes: { '36': 7, '37': 3 } },
        version: 'opaque-v2',
      }],
      acceptedResyncGeneration: 1,
      summary: {
        ...initial.summary,
        totalQty: 10,
        totalValue: 1000,
        sizeTotals: { '36': 7, '37': 3 },
      },
    });
    useProductClientsMock.mockImplementation(() => (
      resyncGeneration === 1 ? updated : initial
    ) as ReturnType<typeof useProductClients>);

    const { rerender } = render(
      <ProductGradeDetailModal product={product} onClose={vi.fn()} onSaved={vi.fn()} />,
    );
    expect(await screen.findByRole('textbox', { name: /tamanho 36/i })).toHaveValue('2');

    resyncGeneration = 1;
    rerender(<ProductGradeDetailModal product={product} onClose={vi.fn()} onSaved={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /tamanho 36/i })).toHaveValue('7');
    });
    expect(ordersRevision).toBe(0);
  });

  it('preserva edição local e sinaliza conflito em resync no mesmo watermark', async () => {
    const initial = resource();
    const updated = resource({
      rows: [{
        order: makeOrder(),
        item: { ...item, qty: 10, sizes: { '36': 7, '37': 3 } },
        version: 'opaque-v2',
      }],
      acceptedResyncGeneration: 1,
    });
    useProductClientsMock.mockImplementation(() => (
      resyncGeneration === 1 ? updated : initial
    ) as ReturnType<typeof useProductClients>);

    const { rerender } = render(
      <ProductGradeDetailModal product={product} onClose={vi.fn()} onSaved={vi.fn()} />,
    );
    fireEvent.change(
      await screen.findByRole('textbox', { name: /tamanho 36/i }),
      { target: { value: '4' } },
    );
    fireEvent.change(
      screen.getByRole('textbox', { name: /tamanho 37/i }),
      { target: { value: '1' } },
    );

    resyncGeneration = 1;
    rerender(<ProductGradeDetailModal product={product} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/atualizados enquanto você editava/i);
    expect(screen.getByRole('textbox', { name: /tamanho 36/i })).toHaveValue('4');
  });

  it('bloqueia aumento ou redução da reserva e orienta a redistribuição', async () => {
    useProductClientsMock.mockReturnValue(resource() as ReturnType<typeof useProductClients>);
    const user = userEvent.setup();
    render(<ProductGradeDetailModal product={product} onClose={vi.fn()} onSaved={vi.fn()} />);

    const size36 = await screen.findByRole('textbox', { name: /tamanho 36/i });
    await user.clear(size36);
    await user.type(size36, '5');

    expect(screen.getByRole('alert')).toHaveTextContent(/redistribui tamanhos.*não altera a reserva/i);
    expect(screen.getByRole('button', { name: 'Salvar Alterações' })).toBeDisabled();
    expect(updateGradesMock).not.toHaveBeenCalled();
  });

  it('usa totais financeiros autoritativos sem multiplicar a média arredondada', async () => {
    const orderOne = { ...makeOrder(), id: '#123', client: 'Loja Um', value: 4.01 };
    const orderTwo = { ...makeOrder(), id: '#124', client: 'Loja Dois', value: 5.99 };
    useProductClientsMock.mockReturnValue(resource({
      rows: [
        { order: orderOne, item: { ...item, qty: 1, unitValue: 4.01, sizes: { '36': 1, '37': 0 } }, version: 'v1' },
        { order: orderTwo, item: { ...item, qty: 2, unitValue: 2.995, sizes: { '36': 1, '37': 1 } }, version: 'v2' },
      ],
      total: 2,
      summary: {
        ...resource().summary,
        totalClients: 2,
        totalQty: 3,
        totalValue: 10,
        originalTotalValue: 10,
        sizeTotals: { '36': 2, '37': 1 },
      },
    }) as ReturnType<typeof useProductClients>);
    const roundedProduct = { ...product, totalQty: 3, totalValue: 10, unitValue: 3.33 };
    const user = userEvent.setup();
    render(<ProductGradeDetailModal product={roundedProduct} onClose={vi.fn()} />);

    expect(await screen.findByText((text) => /R\$\s*10,00/.test(text))).toBeVisible();
    expect(screen.queryByText((text) => /R\$\s*9,99/.test(text))).toBeNull();
    const detailButtons = screen.getAllByTitle('Ver detalhes do pedido');
    await user.click(detailButtons[0]!);
    expect(screen.getByText((text) => /R\$\s*4,01/.test(text))).toBeVisible();
    await user.click(detailButtons[1]!);
    expect(screen.getByText((text) => /R\$\s*5,99/.test(text))).toBeVisible();
  });

  it('preserva totais e subtotais negativos do histórico ERP', async () => {
    const historicalOrder = { ...makeOrder(), value: -10.01, status: 'Processado no ERP' as const };
    useProductClientsMock.mockReturnValue(resource({
      rows: [{ order: historicalOrder, item: { ...item, unitValue: -3.34 }, version: 'erp-v1' }],
      summary: {
        ...resource().summary,
        totalValue: -10.01,
        originalTotalValue: -10.01,
      },
    }) as ReturnType<typeof useProductClients>);
    const user = userEvent.setup();
    render(
      <ProductGradeDetailModal
        product={{ ...product, totalValue: -10.01, unitValue: -3.34, stage: 'historico' }}
        stage="historico"
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText((text) => /-R\$\s*10,01/.test(text))).toBeVisible();
    await user.click(screen.getByTitle('Ver detalhes do pedido'));
    expect(screen.getAllByText((text) => /-R\$\s*10,01/.test(text))).toHaveLength(2);
  });

  it('desabilita edição e aprovação quando a janela expira com o modal aberto', async () => {
    useProductClientsMock.mockReturnValue(resource() as ReturnType<typeof useProductClients>);
    render(
      <ProductGradeDetailModal
        product={{
          ...product,
          processedAt: Date.now() - 24 * 60 * 60 * 1000 - 1_000,
          // Snapshot antigo proposital: o deadline ancorado na resposta deve
          // prevalecer sem reestender a janela ao abrir o modal.
          remainingWindowMs: 60 * 60 * 1000,
          remainingWindowDeadlineAt: Date.now() - 1_000,
        }}
        onClose={vi.fn()}
        onApprove={vi.fn()}
      />,
    );

    expect(await screen.findByText('Janela de Edição Expirada')).toBeVisible();
    expect(screen.getByText('Expirado')).toBeVisible();
    expect(screen.getByRole('textbox', { name: /tamanho 36/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Salvar Alterações' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Aprovar OR' })).toBeDisabled();
  });

  it('não antecipa expiração quando o relógio do cliente está adiantado', async () => {
    useProductClientsMock.mockReturnValue(resource() as ReturnType<typeof useProductClients>);
    render(
      <ProductGradeDetailModal
        product={{
          ...product,
          processedAt: Date.now() - 24 * 60 * 60 * 1000 - 5_000,
          remainingWindowMs: 60_000,
          remainingWindowDeadlineAt: Date.now() + 60_000,
        }}
        onClose={vi.fn()}
        onApprove={vi.fn()}
      />,
    );

    expect(await screen.findByText('Janela de Edição Ativa')).toBeVisible();
    expect(screen.getByRole('textbox', { name: /tamanho 36/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Aprovar OR' })).toBeEnabled();
  });

  it('não desconta a reserva novamente do saldo autoritativo', async () => {
    useProductClientsMock.mockReturnValue(resource({
      summary: {
        ...resource().summary,
        totalQty: 30,
        stock: 70,
        sizeTotals: { '36': 15, '37': 15 },
      },
    }) as ReturnType<typeof useProductClients>);
    render(<ProductGradeDetailModal product={{ ...product, totalQty: 30, stock: 70 }} onClose={vi.fn()} />);

    const saldo = (await screen.findByText('Saldo')).parentElement;
    expect(saldo).toHaveTextContent('70');
    expect(saldo).not.toHaveTextContent('40');
  });

  it('preserva a ordem canônica de tamanhos fornecida pelo resumo do produto', async () => {
    useProductClientsMock.mockReturnValue(resource({
      summary: {
        ...resource().summary,
        sizeKeys: ['37', '36'],
        sizeTotals: { '36': 2, '37': 3 },
      },
    }) as ReturnType<typeof useProductClients>);
    render(<ProductGradeDetailModal product={product} onClose={vi.fn()} />);

    const headers = (await screen.findAllByRole('columnheader')).map(header => header.textContent);
    expect(headers).toEqual(['Loja / Cliente', '37', '36', 'Total']);
  });

  it('mantém grades largas navegáveis em uma região com rolagem horizontal', async () => {
    const sizeKeys = Array.from({ length: 40 }, (_, index) => `T${String(index).padStart(2, '0')}`);
    const sizes = Object.fromEntries(sizeKeys.map((size, index) => [size, index === 0 ? 5 : 0]));
    useProductClientsMock.mockReturnValue(resource({
      rows: [{ order: makeOrder(), item: { ...item, sizes }, version: 'opaque-wide-v1' }],
      summary: {
        ...resource().summary,
        sizeKeys,
        sizeTotals: sizes,
      },
    }) as ReturnType<typeof useProductClients>);
    render(
      <ProductGradeDetailModal
        product={{ ...product, sizeKeys, sizes }}
        onClose={vi.fn()}
      />,
    );

    const scrollRegion = await screen.findByRole('region', { name: 'Grade por tamanho' });
    expect(scrollRegion).toHaveClass('overflow-x-auto');
    expect(scrollRegion).toHaveAttribute('tabindex', '0');
    expect(within(scrollRegion).getByRole('columnheader', { name: 'T39' })).toBeVisible();
  });

  it('não exibe janela de edição para produto histórico', async () => {
    useProductClientsMock.mockReturnValue(resource() as ReturnType<typeof useProductClients>);
    render(
      <ProductGradeDetailModal
        product={{ ...product, stage: 'historico', processedAt: Date.now() }}
        stage="historico"
        onClose={vi.fn()}
      />,
    );
    await screen.findByText('Detalhes do Produto & Grade por Cliente');
    expect(screen.queryByText(/Janela de Edição/i)).toBeNull();
  });

  it('mostra os dois medidores permanentes de linha sem adequação antes de qualquer edição, e nenhum para linha com adequação', async () => {
    const semItem: ProductItem = { ...item, sizes: { '36': 2, '37': 3 } };
    useProductClientsMock.mockReturnValue(resource({
      rows: [
        { order: makeOrder(), item, version: 'opaque-v1' },
        { order: makeOrderSemAdequacao(), item: semItem, version: 'opaque-v2' },
      ],
      total: 2,
      summary: { ...resource().summary, totalClients: 2 },
    }) as ReturnType<typeof useProductClients>);

    render(<ProductGradeDetailModal product={{ ...product, ordersCount: 2 }} onClose={vi.fn()} onSaved={vi.fn()} />);

    await screen.findByRole('textbox', { name: /tamanho 36 para Loja Centro/i });
    const progressbars = screen.getAllByRole('progressbar');
    expect(progressbars).toHaveLength(2);
    expect(progressbars[0]).toHaveAccessibleName(/Adição ±5%: 0 de 10 pç usadas/i);
    expect(progressbars[1]).toHaveAccessibleName(/Corte ±5%: 0 de 10 pç usadas/i);
  });

  it('linha sem adequação com orcamentoPedido nulo não renderiza medidor e não quebra a tela', async () => {
    useProductClientsMock.mockReturnValue(resource({
      rows: [{ order: makeOrderSemAdequacao({ orcamentoPedido: null }), item, version: 'opaque-v1' }],
    }) as ReturnType<typeof useProductClients>);

    render(<ProductGradeDetailModal product={product} onClose={vi.fn()} onSaved={vi.fn()} />);

    await screen.findByRole('textbox', { name: /tamanho 36/i });
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('permite mudar o total de uma linha sem adequação sem acionar o banner de redistribuição', async () => {
    useProductClientsMock.mockReturnValue(resource({
      rows: [{ order: makeOrderSemAdequacao(), item, version: 'opaque-v1' }],
    }) as ReturnType<typeof useProductClients>);
    const user = userEvent.setup();

    render(<ProductGradeDetailModal product={product} onClose={vi.fn()} onSaved={vi.fn()} />);
    const size36 = await screen.findByRole('textbox', { name: /tamanho 36/i });
    await user.clear(size36);
    await user.type(size36, '5');

    expect(screen.queryByText(/redistribui tamanhos.*não altera a reserva/i)).toBeNull();
    // Lote inteiramente "sem adequação" e dentro do limite: rótulo passa a
    // ser o de salvar-e-aprovar (D-14/PD-03), mas o botão permanece ativo.
    expect(screen.getByRole('button', { name: 'Salvar e Aprovar OR' })).toBeEnabled();
  });

  it('trava com alerta quando o delta de uma linha sem adequação estoura o restante, e libera ao voltar dentro do limite', async () => {
    const semOrder = makeOrderSemAdequacao({
      orcamentoPedido: {
        nrPedido: 456,
        limiteAdicao: 10,
        consumidoAdicao: 8,
        restanteAdicao: 2,
        limiteCorte: 10,
        consumidoCorte: 0,
        restanteCorte: 10,
      },
    });
    useProductClientsMock.mockReturnValue(resource({
      rows: [{ order: semOrder, item, version: 'opaque-v1' }],
    }) as ReturnType<typeof useProductClients>);
    const user = userEvent.setup();

    render(<ProductGradeDetailModal product={product} onClose={vi.fn()} onSaved={vi.fn()} />);
    const size36 = await screen.findByRole('textbox', { name: /tamanho 36 para Loja Sem Adequação/i });
    // baseline 36=2,37=3 (total 5); +5 no 36 dá delta +6, estoura restanteAdicao=2
    await user.clear(size36);
    await user.type(size36, '8');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Loja Sem Adequação');
    expect(alert).toHaveTextContent(/restam apenas 2 pç para adicionar/i);
    const saveButton = screen.getByRole('button', { name: /Salvar/i });
    expect(saveButton).toBeDisabled();
    expect(size36).toBeEnabled();

    await user.clear(size36);
    await user.type(size36, '3');

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(screen.getByRole('button', { name: 'Salvar e Aprovar OR' })).toBeEnabled();
  });

  it('lote todo sem adequação e dentro do limite pede confirmação antes de finalizar a OR; Ok dispara o PUT uma única vez', async () => {
    const semOrder = makeOrderSemAdequacao();
    useProductClientsMock.mockReturnValue(resource({
      rows: [{ order: semOrder, item, version: 'opaque-v1' }],
    }) as ReturnType<typeof useProductClients>);
    updateGradesMock.mockResolvedValue({ status: 'updated', updatedCount: 1, totalQty: 8, totalValue: 800 });
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<ProductGradeDetailModal product={product} onClose={onClose} onSaved={vi.fn()} />);
    const size36 = await screen.findByRole('textbox', { name: /tamanho 36/i });
    await user.clear(size36);
    await user.type(size36, '5');

    await user.click(screen.getByRole('button', { name: 'Salvar e Aprovar OR' }));
    expect(updateGradesMock).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent(/finalizar esta OR/i);

    await user.click(within(dialog).getByRole('button', { name: 'Ok' }));

    await waitFor(() => expect(updateGradesMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('cancelar o diálogo de confirmação não dispara o PUT', async () => {
    const semOrder = makeOrderSemAdequacao();
    useProductClientsMock.mockReturnValue(resource({
      rows: [{ order: semOrder, item, version: 'opaque-v1' }],
    }) as ReturnType<typeof useProductClients>);
    const user = userEvent.setup();

    render(<ProductGradeDetailModal product={product} onClose={vi.fn()} onSaved={vi.fn()} />);
    const size36 = await screen.findByRole('textbox', { name: /tamanho 36/i });
    await user.clear(size36);
    await user.type(size36, '5');
    await user.click(screen.getByRole('button', { name: 'Salvar e Aprovar OR' }));

    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(updateGradesMock).not.toHaveBeenCalled();
  });

  it('lote com pelo menos uma linha com adequação mantém rótulo e clique diretos, sem diálogo (D-11)', async () => {
    const semOrder = makeOrderSemAdequacao({ id: '#789', client: 'Loja Mista' });
    useProductClientsMock.mockReturnValue(resource({
      rows: [
        { order: makeOrder(), item, version: 'opaque-v1' },
        { order: semOrder, item: { ...item, sizes: { '36': 2, '37': 3 } }, version: 'opaque-v2' },
      ],
      total: 2,
      summary: { ...resource().summary, totalClients: 2 },
    }) as ReturnType<typeof useProductClients>);
    updateGradesMock.mockResolvedValue({ status: 'updated', updatedCount: 1, totalQty: 5, totalValue: 500 });
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<ProductGradeDetailModal product={{ ...product, ordersCount: 2 }} onClose={onClose} onSaved={vi.fn()} />);
    // Redistribui a linha "com adequação" (Loja Centro), total permanece igual.
    const comSize36 = await screen.findByRole('textbox', { name: 'Quantidade do tamanho 36 para Loja Centro' });
    const comSize37 = screen.getByRole('textbox', { name: 'Quantidade do tamanho 37 para Loja Centro' });
    await user.clear(comSize36);
    await user.type(comSize36, '3');
    await user.clear(comSize37);
    await user.type(comSize37, '2');

    expect(screen.getByRole('button', { name: 'Salvar Alterações' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    await waitFor(() => expect(updateGradesMock).toHaveBeenCalledTimes(1));
  });

  it('409 de orçamento mostra a mensagem do backend literal, sem invalidar o rascunho', async () => {
    const semOrder = makeOrderSemAdequacao();
    useProductClientsMock.mockReturnValue(resource({
      rows: [{ order: semOrder, item, version: 'opaque-v1' }],
    }) as ReturnType<typeof useProductClients>);
    const budgetError = Object.assign(new Error('API error: 409'), {
      status: 409,
      body: {
        detail: {
          code: 'orcamento_pedido_excedido',
          message: 'Restam apenas 2 pç para adicionar neste pedido.',
          nrPedido: 456,
          orcamento: 'adicao',
          restanteAdicao: 2,
          restanteCorte: 10,
        },
      },
    });
    updateGradesMock.mockRejectedValue(budgetError);
    const user = userEvent.setup();

    render(<ProductGradeDetailModal product={product} onClose={vi.fn()} onSaved={vi.fn()} />);
    const size36 = await screen.findByRole('textbox', { name: /tamanho 36/i });
    await user.clear(size36);
    await user.type(size36, '5');
    await user.click(screen.getByRole('button', { name: 'Salvar e Aprovar OR' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Ok' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Restam apenas 2 pç para adicionar neste pedido.');
    expect(screen.getByRole('button', { name: 'Recarregar clientes' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Descartar rascunho e recarregar/i })).toBeNull();
  });
});
