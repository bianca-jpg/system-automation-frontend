// Cobertura do modal "Registrar Comunicação" depois da migração
// dos dropdowns para o `Select` do design system. Como o Radix não é um
// <select> nativo, os testes exercitam o combobox por teclado — mesmo caminho
// que os testes do próprio DS usam, porque o jsdom não implementa
// pointer capture e o clique no gatilho não abre o popover.
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { NewMessageModal } from './new-message-modal';
import { commercialEmails } from '@/shared/config/commercial-emails';
import { technicalTeamEmail } from '@/shared/config/technical-team-email';
import type { Order } from '@/shared/types/models';
import { useOrderLookup } from '@/features/pedidos/model/use-order-lookup';

vi.mock('@/features/pedidos/model/use-order-lookup', () => ({
  useOrderLookup: vi.fn(),
}));

const useOrderLookupMock = vi.mocked(useOrderLookup);

const serverOrders = [
  { id: 991, client: 'Cliente do Histórico', canal: 'Multimarca' as const, status: 'Processado no ERP', motivo: null, value: 2500 },
  { id: 992, client: 'Loja com Devolução', canal: 'Franquia' as const, status: 'Ajuste no ERP', motivo: null, value: -99.9 },
];

beforeEach(() => {
  useOrderLookupMock.mockImplementation(({ enabled, search }) => {
    const query = search.toLocaleLowerCase('pt-BR');
    const rows = enabled
      ? serverOrders.filter(row => String(row.id).includes(query) || row.client.toLocaleLowerCase('pt-BR').includes(query))
      : [];
    return {
      rows,
      total: rows.length,
      pageSize: 25,
      nextCursor: null,
      hasMore: false,
      loading: false,
      loadingMore: false,
      refreshing: false,
      error: null,
      loadedOnce: enabled,
      reload: vi.fn().mockResolvedValue(true),
      loadMore: vi.fn().mockResolvedValue(false),
      setRows: vi.fn(),
      debouncedSearch: search,
      searching: false,
    };
  });
});

function makeOrder(overrides: Partial<Order> & Pick<Order, 'id' | 'client'>): Order {
  return {
    value: 1000,
    originalValueBeforeAdequacao: 1000,
    status: 'Liberados para faturamento',
    motivo: 'Aguardando aprovação comercial',
    canal: 'Franquia',
    items: [],
    adequacaoAplicada: false,
    adequacaoValorAjustado: 0,
    ...overrides,
  } as Order;
}

const orders: Order[] = [
  makeOrder({ id: '#14789', client: 'Loja Centro' }),
  makeOrder({ id: '#14790', client: 'Multimarca Sul' }),
];

/** Casca controlada: o modal não guarda o rascunho, quem guarda é o widget. */
function Harness({
  onSend = vi.fn(),
  onClose = vi.fn(),
  sending = false,
}: {
  onSend?: (e: React.FormEvent) => void;
  onClose?: () => void;
  sending?: boolean;
}) {
  const [recipient, setRecipient] = React.useState('');
  const [body, setBody] = React.useState('');
  const [orderRef, setOrderRef] = React.useState('');

  return (
    <NewMessageModal
      isOpen
      onClose={onClose}
      orders={orders}
      draftRecipient={recipient}
      setDraftRecipient={setRecipient}
      draftBody={body}
      setDraftBody={setBody}
      selectedOrderRefForDraft={orderRef}
      setSelectedOrderRefForDraft={setOrderRef}
      onSend={onSend}
      sending={sending}
    />
  );
}

/** Abre o popover do Radix pelo teclado e devolve a listbox. */
async function openSelect(trigger: HTMLElement) {
  trigger.focus();
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  return screen.findByRole('listbox');
}

describe('NewMessageModal — destinatário', () => {
  test('mostra o placeholder enquanto nada foi escolhido', () => {
    render(<Harness />);

    expect(
      screen.getByRole('combobox', { name: /Destinatário/i })
    ).toHaveTextContent('Selecione um destinatário...');
  });

  test('escolher um destinatário pré-definido preenche o e-mail', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole('combobox', { name: /Destinatário/i });
    const listbox = await openSelect(trigger);
    const [first] = commercialEmails;
    await user.click(within(listbox).getByRole('option', { name: new RegExp(first.email, 'i') }));

    expect(trigger).toHaveTextContent(first.email);
    // Sem "Outro", o campo de e-mail livre não aparece.
    expect(screen.queryByPlaceholderText(/Digite o e-mail do destinatário/i)).toBeNull();
  });

  test('oferece "Time Técnico" como preset fixo, ao lado dos e-mails comerciais', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole('combobox', { name: /Destinatário/i });
    const listbox = await openSelect(trigger);
    await user.click(
      within(listbox).getByRole('option', { name: new RegExp(technicalTeamEmail.email, 'i') }),
    );

    expect(trigger).toHaveTextContent(technicalTeamEmail.email);
    // Preset, não "Outro": o campo de e-mail livre não aparece.
    expect(screen.queryByPlaceholderText(/Digite o e-mail do destinatário/i)).toBeNull();
  });

  test('"Outro (digitar e-mail)" revela o campo livre e valida o formato', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole('combobox', { name: /Destinatário/i });
    const listbox = await openSelect(trigger);
    await user.click(within(listbox).getByRole('option', { name: 'Outro (digitar e-mail)' }));

    const freeInput = await screen.findByRole('textbox', { name: 'E-mail do destinatário' });
    expect(freeInput).toBeRequired();

    await user.type(freeInput, 'nao-e-email');
    expect(screen.getByText('Informe um e-mail válido.')).toBeVisible();

    await user.clear(freeInput);
    await user.type(freeInput, 'comercial@example.com');
    expect(screen.queryByText('Informe um e-mail válido.')).toBeNull();
  });
});

describe('NewMessageModal — pedido relacionado', () => {
  test('parte de "Não associado" e filtra a lista pela busca', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole('combobox', { name: /Selecione Pedido Relacionado/i });
    expect(trigger).toHaveTextContent('Não associado a pedido específico');

    const listbox = await openSelect(trigger);
    await user.type(
      screen.getByRole('combobox', { name: /Buscar por cliente ou pedido/i }),
      'multimarca'
    );

    expect(within(listbox).getByRole('option', { name: /#14790/ })).toBeVisible();
    expect(within(listbox).queryByRole('option', { name: /#14789/ })).toBeNull();
    // A opção de limpar continua disponível mesmo com filtro ativo.
    expect(
      within(listbox).getByRole('option', { name: 'Não associado a pedido específico' })
    ).toBeVisible();
  });

  test('selecionar um pedido preenche o corpo da mensagem com os dados reais', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole('combobox', { name: /Selecione Pedido Relacionado/i });
    const listbox = await openSelect(trigger);
    await user.click(within(listbox).getByRole('option', { name: /#14789/ }));

    expect(trigger).toHaveTextContent('#14789 - Loja Centro');

    const body = screen.getByLabelText(/Conteúdo do Alerta/i) as HTMLTextAreaElement;
    expect(body.value).toContain('#14789 — Loja Centro (Franquia)');
    // Regex para não prender o teste ao espaço não-quebrável que o Intl insere.
    expect(body.value).toMatch(/Valor do pedido: R\$\s1\.000,00\./);
    expect(body.value).toContain('Ação negociada:');
  });

  test('busca sem resultado mostra o aviso e mantém a opção de limpar', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole('combobox', { name: /Selecione Pedido Relacionado/i });
    const listbox = await openSelect(trigger);
    await user.type(
      screen.getByRole('combobox', { name: /Buscar por cliente ou pedido/i }),
      'zzz'
    );

    expect(screen.getByText('Nenhum pedido encontrado.')).toBeVisible();
    expect(
      within(listbox).getByRole('option', { name: 'Não associado a pedido específico' })
    ).toBeVisible();
  });
});

describe('NewMessageModal — lookup independente e teclado', () => {
  test('primeira falha encerra o spinner e oferece retry explícito', async () => {
    const reload = vi.fn().mockResolvedValue(true);
    useOrderLookupMock.mockReturnValue({
      rows: [],
      total: 0,
      pageSize: 25,
      nextCursor: null,
      hasMore: false,
      loading: false,
      loadingMore: false,
      refreshing: false,
      error: 'lookup indisponível',
      loadedOnce: false,
      reload,
      loadMore: vi.fn().mockResolvedValue(false),
      setRows: vi.fn(),
      debouncedSearch: '',
      searching: false,
    });
    const user = userEvent.setup();
    render(<Harness />);

    fireEvent.keyDown(
      screen.getByRole('combobox', { name: /Selecione Pedido Relacionado/i }),
      { key: 'ArrowDown' },
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/Não foi possível atualizar a busca/i);
    expect(screen.queryByText('Buscando pedidos...')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  test('localiza pedido do histórico mesmo sem receber filas em props', async () => {
    const user = userEvent.setup();

    function EmptyQueuesHarness() {
      const [body, setBody] = React.useState('');
      const [orderRef, setOrderRef] = React.useState('');
      return (
        <NewMessageModal
          isOpen
          onClose={vi.fn()}
          orders={[]}
          draftRecipient=""
          setDraftRecipient={vi.fn()}
          draftBody={body}
          setDraftBody={setBody}
          selectedOrderRefForDraft={orderRef}
          setSelectedOrderRefForDraft={setOrderRef}
          onSend={vi.fn()}
        />
      );
    }

    render(<EmptyQueuesHarness />);
    const trigger = screen.getByRole('combobox', { name: /Selecione Pedido Relacionado/i });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const search = await screen.findByRole('combobox', { name: /Buscar por cliente ou pedido/i });
    await user.type(search, 'histórico');

    expect(await screen.findByRole('option', { name: /#991 - Cliente do Histórico/i })).toBeVisible();
    // A seleção inteira é feita no campo: seta pula "sem pedido" e Enter confirma.
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });

    expect(trigger).toHaveTextContent('#991 - Cliente do Histórico');
    expect((screen.getByLabelText(/Conteúdo do Alerta/i) as HTMLTextAreaElement).value).toContain('#991');
  });

  test('não busca antes de abrir e Escape devolve o foco sem prender Tab', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(useOrderLookupMock).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false, search: '' }));

    const trigger = screen.getByRole('combobox', { name: /Selecione Pedido Relacionado/i });
    await user.click(trigger);
    expect(useOrderLookupMock).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true, search: '' }));

    const search = await screen.findByRole('combobox', { name: /Buscar por cliente ou pedido/i });
    fireEvent.keyDown(search, { key: 'Escape' });
    await new Promise(resolve => window.requestAnimationFrame(resolve));
    expect(trigger).toHaveFocus();

    await user.tab();
    expect(trigger).not.toHaveFocus();
  });

  test('mantém o sinal de devolução no valor vindo do lookup histórico', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole('combobox', { name: /Selecione Pedido Relacionado/i });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const search = await screen.findByRole('combobox', { name: /Buscar por cliente ou pedido/i });
    await user.type(search, '992');
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });

    expect(trigger).toHaveTextContent('#992 - Loja com Devolução');
    expect((screen.getByLabelText(/Conteúdo do Alerta/i) as HTMLTextAreaElement).value)
      .toMatch(/Valor do pedido: -R\$\s99,90\./);
  });
});

describe('NewMessageModal — agendamento', () => {
  test('bloqueia X, Escape e Cancelar enquanto o POST está em voo', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Harness onClose={onClose} sending />);

    expect(screen.queryByRole('button', { name: 'Fechar' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  test('limita o conteúdo ao contrato de 10.000 caracteres e mostra contador', () => {
    render(<Harness />);
    const body = screen.getByLabelText(/Conteúdo do Alerta/i) as HTMLTextAreaElement;
    fireEvent.change(body, { target: { value: 'x'.repeat(10_001) } });

    expect(body).toHaveAttribute('maxLength', '10000');
    expect(body.value).toHaveLength(10_000);
    expect(screen.getByText('10.000 / 10.000')).toBeVisible();
  });

  test('o botão só habilita com e-mail válido e corpo preenchido', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn(e => e.preventDefault());
    render(<Harness onSend={onSend} />);

    const submit = screen.getByRole('button', { name: /Confirmar E-mail/i });
    expect(submit).toBeDisabled();

    const trigger = screen.getByRole('combobox', { name: /Destinatário/i });
    const listbox = await openSelect(trigger);
    const [first] = commercialEmails;
    await user.click(within(listbox).getByRole('option', { name: new RegExp(first.email, 'i') }));

    // Destinatário válido, mas corpo ainda vazio.
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/Conteúdo do Alerta/i), 'Prazo renegociado.');
    expect(submit).toBeEnabled();

    await user.click(submit);
    expect(onSend).toHaveBeenCalledTimes(1);
  });
});
