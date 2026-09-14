import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrderAlert } from '@/shared/types/models';
import type { ProductProjection } from '@/features/pedidos/api/pedidos.api';

const mocks = vi.hoisted(() => ({
  fetchProductNumberedPage: vi.fn(),
  fetchOrderLookupPage: vi.fn(),
  fetchAlertasPage: vi.fn(),
  fetchComunicacoesPage: vi.fn(),
  criarComunicacao: vi.fn(),
  markTopicRead: vi.fn().mockResolvedValue(undefined),
  revisions: { orders: 1, alerts: 1, communications: 1, history: 1 },
  permissionLevel: 40,
}));

vi.mock('@/shared/config/auth/permissions', () => ({
  usePermissions: () => ({ hasMinLevel: (level: number) => mocks.permissionLevel >= level }),
}));
vi.mock('@/features/realtime', () => ({
  useRealtime: () => ({
    topicRevisions: mocks.revisions,
    resyncGeneration: 0,
    markTopicRead: mocks.markTopicRead,
  }),
}));
vi.mock('@/features/pedidos/api/pedidos.api', () => ({
  fetchProductNumberedPage: mocks.fetchProductNumberedPage,
  fetchOrderLookupPage: mocks.fetchOrderLookupPage,
  approveProduct: vi.fn(),
  submitAdequacaoJob: vi.fn(),
  fetchAdequacaoJob: vi.fn(),
}));
vi.mock('@/features/pedidos/api/alertas.api', () => ({
  fetchAlertasPage: mocks.fetchAlertasPage,
}));
vi.mock('@/features/pedidos/api/comunicacoes.api', () => ({
  fetchComunicacoesPage: mocks.fetchComunicacoesPage,
  criarComunicacao: mocks.criarComunicacao,
}));
vi.mock('@/features/pedidos/ui/modals/product-grade-detail-modal', () => ({
  ProductGradeDetailModal: ({
    product: selectedProduct,
    channel,
    readOnly,
    onApprove,
  }: {
    product: ProductProjection | null;
    channel?: string;
    readOnly?: boolean;
    onApprove?: unknown;
  }) => selectedProduct ? (
    <div data-testid="selected-product-detail">
      {selectedProduct.code}|{channel}|{readOnly ? 'somente-leitura' : 'editavel'}|{onApprove ? 'aprovar' : 'sem-aprovar'}
    </div>
  ) : null,
}));
vi.mock('@/features/pedidos/model/use-tolerancia-adequacao', () => ({
  useToleranciaAdequacaoFator: () => 1.05,
}));

import { OrdersList } from '@/widgets/pedido-dashboard/ui/orders-list';

function product(index: number): ProductProjection {
  return {
    code: `COD${index}`,
    name: `Produto ${index}`,
    channel: 'Franquia',
    totalQty: 1,
    totalValue: 100,
    originalTotalValue: 100,
    unitValue: 100,
    ordersCount: 1,
    stock: 10,
    sizes: { M: 1 },
    sizeKeys: ['M'],
    lastOrderAt: '2026-08-08T10:00:00Z',
    processedAt: null,
    remainingWindowMs: null,
    adequacaoAplicada: false,
  };
}

function alert(index: number): OrderAlert {
  return {
    id: `alert-${index}`,
    orderId: `#${index}`,
    type: 'warning',
    message: `Alerta ${index}`,
    time: '10:00',
  };
}

beforeEach(() => {
  mocks.fetchProductNumberedPage.mockReset();
  mocks.fetchOrderLookupPage.mockReset().mockResolvedValue({
    rows: [], total: 0, pageSize: 25, page: 1, totalPages: 1,
  });
  mocks.fetchAlertasPage.mockReset();
  mocks.fetchComunicacoesPage.mockReset();
  mocks.criarComunicacao.mockReset();
  mocks.markTopicRead.mockClear();
  mocks.permissionLevel = 40;
});

describe('OrdersList — paginação real do servidor', () => {
  it('mantém o mesmo código separado por canal e abre o detalhe sem cruzar a ação', async () => {
    const franchise = {
      ...product(1),
      code: 'COD-COMPARTILHADO',
      name: 'Produto compartilhado',
      channel: 'Franquia' as const,
      totalQty: 3,
    };
    const multimarca = {
      ...product(2),
      code: 'COD-COMPARTILHADO',
      name: 'Produto compartilhado',
      channel: 'Multimarca' as const,
      totalQty: 8,
    };
    mocks.fetchProductNumberedPage.mockImplementation(({ stage }: { stage: string }) => Promise.resolve(
      stage === 'aguardando'
        ? { rows: [franchise, multimarca], total: 2, pageSize: 25, page: 1, totalPages: 1 }
        : { rows: [], total: 0, pageSize: 25, page: 1, totalPages: 1 },
    ));

    render(
      <OrdersList
        selectedChannel="Todos"
        awaitingChannelTotal={2}
        isAdequacaoActive={false}
        activeTab="abertos"
      />,
    );

    const codeCells = await screen.findAllByText('COD-COMPARTILHADO');
    expect(codeCells).toHaveLength(2);

    fireEvent.click(codeCells[0]!);
    expect(screen.getByTestId('selected-product-detail')).toHaveTextContent(
      'COD-COMPARTILHADO|Franquia',
    );
    expect(screen.getByTestId('selected-product-detail')).toHaveTextContent('somente-leitura|sem-aprovar');

    fireEvent.click(codeCells[1]!);
    expect(screen.getByTestId('selected-product-detail')).toHaveTextContent(
      'COD-COMPARTILHADO|Multimarca',
    );
  });

  it('mantém o detalhe de edição somente leitura para perfil sem permissão de ação', async () => {
    mocks.permissionLevel = 10;
    const editingProduct = {
      ...product(1),
      processedAt: Date.now(),
      remainingWindowMs: 60_000,
    };
    mocks.fetchProductNumberedPage.mockImplementation(({ stage }: { stage: string }) => Promise.resolve(
      stage === 'edicao'
        ? { rows: [editingProduct], total: 1, pageSize: 25, page: 1, totalPages: 1 }
        : { rows: [], total: 0, pageSize: 25, page: 1, totalPages: 1 },
    ));
    render(
      <OrdersList
        selectedChannel="Franquia"
        awaitingChannelTotal={0}
        isAdequacaoActive={false}
        activeTab="abertos"
      />,
    );

    fireEvent.click(await screen.findByText('COD1'));
    expect(screen.getByTestId('selected-product-detail')).toHaveTextContent(
      'COD1|Franquia|somente-leitura|sem-aprovar',
    );
  });

  it('pagina aguardando por número de página, sem acumular as linhas', async () => {
    const firstRows = Array.from({ length: 25 }, (_, index) => product(index));
    const lastRows = Array.from({ length: 5 }, (_, index) => product(index + 25));
    mocks.fetchProductNumberedPage.mockImplementation(({ stage, page }: { stage: string; page: number }) => {
      if (stage === 'edicao') {
        return Promise.resolve({ rows: [], total: 0, pageSize: 25, page: 1, totalPages: 1 });
      }
      return Promise.resolve(page === 2
        ? { rows: lastRows, total: 30, pageSize: 25, page: 2, totalPages: 2 }
        : { rows: firstRows, total: 30, pageSize: 25, page: 1, totalPages: 2 });
    });

    const user = userEvent.setup();
    render(
      <OrdersList
        selectedChannel="Franquia"
        awaitingChannelTotal={30}
        isAdequacaoActive={false}
        activeTab="abertos"
      />,
    );

    // A fila "em edição" está vazia (total 0), então só a lista de aguardando
    // desenha a faixa de paginação — a busca por role não é ambígua aqui.
    const paginacao = await screen.findByRole('navigation', { name: 'Paginação' });
    const footer = paginacao.parentElement!;
    expect(footer).toHaveTextContent('Mostrando 1–25 de 30 produtos');

    await user.click(within(paginacao).getByRole('button', { name: 'Ir para a página 2' }));
    // A página SUBSTITUI as linhas: o rodapé passa a 26–30, não a "30 de 30".
    await waitFor(() => expect(footer).toHaveTextContent('Mostrando 26–30 de 30 produtos'));

    expect(mocks.fetchProductNumberedPage).toHaveBeenCalledWith(expect.objectContaining({
      stage: 'aguardando',
      page: 2,
      channel: 'Franquia',
    }));
  });

  it('nunca usa total de produtos como contagem de pedidos para ação em lote', async () => {
    const retryTotals = vi.fn();
    mocks.fetchProductNumberedPage.mockImplementation(({ stage }: { stage: string }) => Promise.resolve(
      stage === 'aguardando'
        ? { rows: [product(1), product(2)], total: 2, pageSize: 25, page: 1, totalPages: 1 }
        : { rows: [], total: 0, pageSize: 25, page: 1, totalPages: 1 },
    ));
    const props = {
      selectedChannel: 'Franquia' as const,
      isAdequacaoActive: false,
      activeTab: 'abertos' as const,
      editingChannelTotal: 0,
      onRetryChannelTotals: retryTotals,
    };
    const { rerender } = render(
      <OrdersList {...props} awaitingChannelTotal={5} />,
    );

    const statusPanel = await waitFor(() => {
      const panel = document.getElementById('status-dos-pedidos-dashboard');
      expect(panel).not.toBeNull();
      return panel!;
    });
    expect(within(statusPanel).getByText('5')).toBeVisible();
    expect(await screen.findByText('COD1')).toBeVisible();
    expect(screen.getByText('COD2')).toBeVisible();

    rerender(
      <OrdersList
        {...props}
        channelTotalsError="resumo indisponível"
      />,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/contagens autoritativas/i);
    expect(screen.getByRole('button', { name: /Efetuar OR sem adequação/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Efetuar OR com adequação/i })).toBeDisabled();
    // A projeção de produtos continua útil para consulta, mas não vira count de pedidos.
    expect(screen.getByText('COD1')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retryTotals).toHaveBeenCalledTimes(1);
  });

  it('consome a projeção histórica global, preserva valor ERP negativo e pagina por produto', async () => {
    const firstRows = Array.from({ length: 25 }, (_, index) => ({
      ...product(index),
      code: `HIST${index}`,
      processedAt: Date.parse('2026-08-08T10:00:00Z'),
      remainingWindowMs: null,
      ...(index === 0 ? {
        name: 'Devolução ERP',
        totalValue: -250,
        originalTotalValue: -300,
        unitValue: -250,
      } : {}),
    }));
    const lastRows = Array.from({ length: 5 }, (_, index) => ({
      ...product(index + 25),
      code: `HIST${index + 25}`,
      processedAt: Date.parse('2026-08-08T09:00:00Z'),
      remainingWindowMs: null,
    }));
    mocks.fetchProductNumberedPage.mockImplementation(({
      stage,
      page,
    }: {
      stage: string;
      page: number;
    }) => {
      expect(stage).toBe('historico');
      return Promise.resolve(page === 2
        ? { rows: lastRows, total: 30, pageSize: 25, page: 2, totalPages: 2 }
        : { rows: firstRows, total: 30, pageSize: 25, page: 1, totalPages: 2 });
    });

    const user = userEvent.setup();
    render(
      <OrdersList
        selectedChannel="Todos"
        isAdequacaoActive={false}
        activeTab="historico"
      />,
    );

    expect(await screen.findByText('Devolução ERP')).toBeVisible();
    expect(screen.getByText((content) => /-R\$\s*250,00/.test(content))).toBeVisible();
    expect(mocks.fetchProductNumberedPage).toHaveBeenCalledWith(expect.objectContaining({
      stage: 'historico',
      channel: 'Todos',
      status: 'Todos',
      sort: 'lastOrderAt',
      order: 'desc',
    }));
    await user.click(screen.getByRole('button', { name: /Filtros e ordenação/i }));
    expect(screen.getByRole('radiogroup', { name: 'Status' })).toBeVisible();
    expect(screen.getByRole('radiogroup', { name: 'Ordenar por' })).toBeVisible();
    expect(screen.queryByRole('radio', { name: 'Cliente' })).toBeNull();

    const historicalTable = screen.getByRole('table', {
      name: 'Histórico de pedidos, agrupado por produto',
    });
    expect(
      within(historicalTable).getByRole('columnheader', { name: 'Ações' }),
    ).toBeVisible();
    expect(
      within(historicalTable).queryByRole('columnheader', { name: 'Detalhes' }),
    ).toBeNull();

    const historicalSearch = screen.getByRole('searchbox', { name: 'Buscar pedidos históricos' });
    expect(historicalSearch).toHaveAttribute('maxlength', '120');
    fireEvent.change(historicalSearch, { target: { value: 'x'.repeat(121) } });
    expect(historicalSearch).toHaveValue('x'.repeat(120));

    const paginacao = screen.getByRole('navigation', { name: 'Paginação' });
    const footer = paginacao.parentElement!;
    expect(footer).toHaveTextContent('Mostrando 1–25 de 30 produtos');
    await user.click(within(paginacao).getByRole('button', { name: 'Próxima' }));
    // O DynamicTable virtualiza as linhas fora da viewport; o rodapé
    // autoritativo confirma qual fatia está no dataset.
    await waitFor(() => expect(footer).toHaveTextContent('Mostrando 26–30 de 30 produtos'));
    expect(mocks.fetchProductNumberedPage).toHaveBeenCalledWith(expect.objectContaining({
      stage: 'historico',
      page: 2,
    }));
  });

  it('abre o detalhe histórico pelo menu de Ações do design system sem exigir permissão de escrita', async () => {
    mocks.permissionLevel = 10;
    mocks.fetchProductNumberedPage.mockResolvedValue({
      rows: [{ ...product(1), processedAt: Date.parse('2026-08-08T10:00:00Z') }],
      total: 1,
      pageSize: 25,
      page: 1,
      totalPages: 1,
    });
    const user = userEvent.setup();
    render(
      <OrdersList
        selectedChannel="Franquia"
        isAdequacaoActive={false}
        activeTab="historico"
      />,
    );

    const actionsButton = await screen.findByRole('button', {
      name: /Abrir ações para COD1 — Produto 1/i,
    });
    actionsButton.focus();
    expect(actionsButton).toHaveFocus();
    await user.keyboard('{Enter}');
    const detailsAction = await screen.findByRole('menuitem', {
      name: 'Ver grade por cliente',
    });
    await user.click(detailsAction);
    expect(screen.getByTestId('selected-product-detail')).toHaveTextContent('COD1|Franquia');
  });

  it('alertas e comunicações usam envelopes e cursor próprios', async () => {
    const firstAlerts = Array.from({ length: 25 }, (_, index) => alert(index));
    const lastAlerts = Array.from({ length: 5 }, (_, index) => alert(index + 25));
    mocks.fetchAlertasPage.mockImplementation(({ cursor }: { cursor?: string | null }) => Promise.resolve(cursor
      ? { rows: lastAlerts, total: 30, pageSize: 25, nextCursor: null, hasMore: false }
      : { rows: firstAlerts, total: 30, pageSize: 25, nextCursor: 'alerts-2', hasMore: true }));
    mocks.fetchComunicacoesPage.mockResolvedValue({
      rows: [
        { id: 'pending', type: 'Email', status: 'Pendente', time: '10:00', content: 'Na fila', recipient: 'a@example.com' },
        { id: 'sent', type: 'Email', status: 'Enviado', time: '10:01', content: 'Entregue', recipient: 'b@example.com' },
        { id: 'failed', type: 'Email', status: 'Falhou', time: '10:02', content: 'Esgotou retries', recipient: 'c@example.com' },
        { id: 'unknown', type: 'Email', status: 'Incerto', time: '10:03', content: 'Aceite desconhecido', recipient: 'd@example.com' },
      ],
      total: 4,
      pageSize: 25,
      nextCursor: null,
      hasMore: false,
    });

    const user = userEvent.setup();
    render(
      <OrdersList
        selectedChannel="Todos"
        isAdequacaoActive={false}
        activeTab="alertas"
      />,
    );

    const footer = await waitFor(() => {
      const element = document.getElementById('alerts-load-more');
      expect(element).not.toBeNull();
      return element!;
    });
    expect(screen.getAllByText(/Alerta \d+/)).toHaveLength(25);
    expect(screen.getByText('30 Críticos')).toBeVisible();
    expect(screen.getByText('Aguardando envio')).toBeVisible();
    expect(screen.getByText('Enviado')).toBeVisible();
    expect(screen.getByText('Falhou')).toBeVisible();
    expect(screen.getByText('Não foi possível entregar após novas tentativas.')).toBeVisible();
    expect(screen.getByText('Resultado incerto')).toBeVisible();
    expect(screen.getByText('O provedor não confirmou o resultado. Não reenvie; solicite verificação.')).toBeVisible();
    await user.click(within(footer).getByRole('button', { name: 'Carregar mais 5' }));
    await waitFor(() => expect(screen.getAllByText(/Alerta \d+/)).toHaveLength(30));
    expect(mocks.fetchAlertasPage).toHaveBeenCalledWith(expect.objectContaining({ cursor: 'alerts-2' }));
  });

  it('reutiliza a mesma chave idempotente ao repetir uma tentativa de comunicação', async () => {
    mocks.fetchAlertasPage.mockResolvedValue({
      rows: [], total: 0, pageSize: 25, nextCursor: null, hasMore: false,
    });
    mocks.fetchComunicacoesPage.mockResolvedValue({
      rows: [], total: 0, pageSize: 25, nextCursor: null, hasMore: false,
    });
    mocks.criarComunicacao
      .mockRejectedValueOnce(new Error('falha transitória'))
      .mockResolvedValueOnce({
        id: 'comm-1',
        type: 'Email',
        status: 'Pendente',
        time: '10:00',
        content: 'Prazo renegociado.',
        recipient: 'dev@example.com',
      });

    const user = userEvent.setup();
    render(
      <OrdersList
        selectedChannel="Todos"
        isAdequacaoActive={false}
        activeTab="alertas"
      />,
    );

    await user.click(await screen.findByRole('button', {
      name: /Exibir todas as comunicações comercial/i,
    }));

    const recipient = await screen.findByRole('combobox', { name: /Destinatário/i });
    recipient.focus();
    fireEvent.keyDown(recipient, { key: 'ArrowDown' });
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByRole('option', {
      name: /dev@example\.com/i,
    }));
    await user.type(screen.getByLabelText(/Conteúdo do Alerta/i), 'Prazo renegociado.');

    const submit = screen.getByRole('button', { name: /Confirmar E-mail/i });
    await user.click(submit);
    await waitFor(() => expect(mocks.criarComunicacao).toHaveBeenCalledTimes(1));
    await screen.findByText(/Não foi possível confirmar o agendamento/i);

    // Fechar após uma resposta incerta não descarta a chave: se o servidor
    // tiver persistido antes da perda da resposta, reabrir e repetir o mesmo
    // payload deve continuar sendo replay, não um segundo e-mail.
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(await screen.findByRole('button', {
      name: /Exibir todas as comunicações comercial/i,
    }));
    const retryRecipient = await screen.findByRole('combobox', { name: /Destinatário/i });
    retryRecipient.focus();
    fireEvent.keyDown(retryRecipient, { key: 'ArrowDown' });
    const retryListbox = await screen.findByRole('listbox');
    await user.click(within(retryListbox).getByRole('option', {
      name: /dev@example\.com/i,
    }));
    await user.type(screen.getByLabelText(/Conteúdo do Alerta/i), 'Prazo renegociado.');
    await user.click(screen.getByRole('button', { name: /Confirmar E-mail/i }));
    await waitFor(() => expect(mocks.criarComunicacao).toHaveBeenCalledTimes(2));

    const firstKey = mocks.criarComunicacao.mock.calls[0]?.[0]?.idempotencyKey;
    const retryKey = mocks.criarComunicacao.mock.calls[1]?.[0]?.idempotencyKey;
    expect(firstKey).toEqual(expect.any(String));
    expect(firstKey).toBe(retryKey);
    expect(await screen.findByText('Comunicação agendada para envio.')).toBeVisible();
  });

  it('gera uma nova chave após erro de validação que exige corrigir a tentativa', async () => {
    mocks.fetchAlertasPage.mockResolvedValue({
      rows: [], total: 0, pageSize: 25, nextCursor: null, hasMore: false,
    });
    mocks.fetchComunicacoesPage.mockResolvedValue({
      rows: [], total: 0, pageSize: 25, nextCursor: null, hasMore: false,
    });
    mocks.criarComunicacao
      .mockRejectedValueOnce({ status: 422 })
      .mockResolvedValueOnce({
        id: 'comm-validated',
        type: 'Email',
        status: 'Pendente',
        time: '10:00',
        content: 'Prazo validado.',
        recipient: 'dev@example.com',
      });

    const user = userEvent.setup();
    render(
      <OrdersList
        selectedChannel="Todos"
        isAdequacaoActive={false}
        activeTab="alertas"
      />,
    );
    await user.click(await screen.findByRole('button', {
      name: /Exibir todas as comunicações comercial/i,
    }));
    const recipient = await screen.findByRole('combobox', { name: /Destinatário/i });
    recipient.focus();
    fireEvent.keyDown(recipient, { key: 'ArrowDown' });
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByRole('option', {
      name: /dev@example\.com/i,
    }));
    await user.type(screen.getByLabelText(/Conteúdo do Alerta/i), 'Prazo validado.');

    const submit = screen.getByRole('button', { name: /Confirmar E-mail/i });
    await user.click(submit);
    await screen.findByText(/Dados inválidos/i);
    const invalidKey = mocks.criarComunicacao.mock.calls[0]?.[0]?.idempotencyKey;

    await user.click(submit);
    await waitFor(() => expect(mocks.criarComunicacao).toHaveBeenCalledTimes(2));
    const correctedKey = mocks.criarComunicacao.mock.calls[1]?.[0]?.idempotencyKey;
    expect(invalidKey).toEqual(expect.any(String));
    expect(correctedKey).toEqual(expect.any(String));
    expect(correctedKey).not.toBe(invalidKey);
  });

  it('trata o 202 incerto como estado terminal sem oferecer reenvio automático', async () => {
    mocks.criarComunicacao.mockResolvedValue({
      id: 'comm-unknown',
      type: 'Email',
      status: 'Incerto',
      time: '10:00',
      content: 'Resultado desconhecido.',
      recipient: 'dev@example.com',
    });
    const user = userEvent.setup();
    render(
      <OrdersList
        orders={[]}
        communications={[]}
        setCommunications={vi.fn()}
        alerts={[]}
        setAlerts={vi.fn()}
        selectedChannel="Todos"
        isAdequacaoActive={false}
        activeTab="alertas"
      />,
    );
    await user.click(screen.getByRole('button', {
      name: /Exibir todas as comunicações comercial/i,
    }));
    const recipient = screen.getByRole('combobox', { name: /Destinatário/i });
    recipient.focus();
    fireEvent.keyDown(recipient, { key: 'ArrowDown' });
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByRole('option', {
      name: /dev@example\.com/i,
    }));
    await user.type(screen.getByLabelText(/Conteúdo do Alerta/i), 'Resultado desconhecido.');
    await user.click(screen.getByRole('button', { name: /Confirmar E-mail/i }));

    expect(await screen.findByText('O provedor não confirmou o resultado. Não reenvie; solicite verificação.')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Reenviar|Tentar novamente/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ok' })).toBeVisible();
  });
});
