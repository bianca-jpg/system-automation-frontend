// Rede de segurança (Fase 3, Etapa 0) — smoke test do maior god file do domínio
// de pedidos (2288 linhas). NÃO cobre exaustivamente cada interação/aba/modal —
// isso fica para as etapas que tocam especificamente cada pedaço (3, 7, 8).
// Aqui só garantimos que a máquina de estados (isAwaitingFaturamento/
// isInEditWindow) e os cálculos duplicados (formatCurrency, fator de
// adequação — mockado em 1.05 via use-tolerancia-adequacao) produzem os
// valores corretos hoje, antes de qualquer refatoração.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Communication, Order, OrderAlert } from "@/shared/types/models";
import { apiFetch } from "@/lib/api/http-client";

vi.mock("@/shared/config/auth/permissions", () => ({
  usePermissions: () => ({ hasMinLevel: (min: number) => min <= 40 }),
}));

vi.mock("@/lib/api/http-client", () => ({ apiFetch: vi.fn().mockResolvedValue({}) }));
vi.mock("@/features/realtime", () => ({
  useRealtime: () => ({
    topicRevisions: { orders: 0, alerts: 0, communications: 0, history: 0 },
    markTopicRead: vi.fn().mockResolvedValue(undefined),
  }),
}));
// Fator real vem de GET /api/v1/parametros (CONTRACT-01); mockado aqui com o
// mesmo 1.05 que era hardcoded antes, para não alterar as expectativas deste
// smoke test — a cobertura do hook em si fica em use-tolerancia-adequacao.test.ts.
vi.mock("@/features/pedidos/model/use-tolerancia-adequacao", () => ({
  useToleranciaAdequacaoFator: () => 1.05,
}));

import { OrdersList } from "./orders-list";

const apiFetchMock = vi.mocked(apiFetch);

function makeItem(overrides: Partial<Order["items"][number]> = {}) {
  return { name: "Camisa Polo Piquet", code: "303643", unitValue: 100, qty: 2, cdStatus: "Regular" as const, ...overrides };
}

function makeOrder(overrides: Partial<Order>): Order {
  return {
    id: "#1000",
    client: "Cliente Teste",
    value: 200,
    originalValueBeforeAdequacao: 200,
    status: "Liberados para faturamento",
    motivo: "",
    canal: "Franquia",
    items: [makeItem()],
    adequacaoAplicada: false,
    adequacaoValorAjustado: 0,
    ...overrides,
  };
}

const noop = () => {};

// Um produto DIFERENTE por pedido: as tabelas da aba "abertos" agrupam por
// produto, então N pedidos com o mesmo código dariam 1 linha só e o "carregar
// mais" não teria o que paginar.
function pedidosComProdutosDistintos(qtd: number): Order[] {
  return Array.from({ length: qtd }, (_, i) =>
    makeOrder({
      id: `#${2000 + i}`,
      client: `Cliente ${i}`,
      items: [makeItem({ code: `COD${String(i).padStart(4, "0")}`, name: `Produto ${i}` })],
    }),
  );
}

describe("OrdersList — smoke test (aba 'abertos')", () => {
  it("mantém o processamento de OR em single-flight mesmo com duplo clique", async () => {
    let resolveRequest!: (value: unknown) => void;
    apiFetchMock.mockClear();
    apiFetchMock
      .mockImplementationOnce(() => new Promise(resolve => {
        resolveRequest = resolve;
      }))
      .mockResolvedValueOnce({
        jobId: '550e8400-e29b-41d4-a716-446655440000',
        mode: 'sem_adequar',
        channel: 'Franquia',
        status: 'succeeded',
        progressCurrent: 1,
        progressTotal: 1,
        attempts: 1,
        maxAttempts: 3,
        retryable: false,
        requestedAt: '2026-08-08T10:00:00Z',
        updatedAt: '2026-08-08T10:00:01Z',
        startedAt: '2026-08-08T10:00:00Z',
        finishedAt: '2026-08-08T10:00:01Z',
        deadlineAt: '2026-08-08T10:20:00Z',
        result: {
          plannedCount: 1,
          appliedCount: 1,
          deferredCount: 0,
          blockedCreditCount: 0,
        },
        errorCode: null,
      });

    render(
      <OrdersList
        orders={[makeOrder({ id: "#1001" })]}
        communications={[]}
        setCommunications={noop}
        alerts={[]}
        setAlerts={noop}
        selectedChannel="Franquia"
        isAdequacaoActive={false}
        activeTab="abertos"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Efetuar OR sem adequação/i }));
    const dialog = await screen.findByRole("alertdialog");
    const confirm = within(dialog).getByRole("button", { name: "Ok" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    await within(dialog).findByRole('heading', { name: 'Processamento' });
    expect(within(dialog).getByRole('button', { name: 'Processando...' })).toBeDisabled();

    resolveRequest({
      jobId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'succeeded',
      replayed: false,
      coalesced: false,
      statusUrl: '/api/v1/pedidos/processamentos/550e8400-e29b-41d4-a716-446655440000',
      progressCurrent: 1,
      progressTotal: 1,
    });
    await waitFor(() => {
      expect(screen.getByText(/Processamento sem adequação concluído: 1 de 1 par produto-cliente/i)).toBeVisible();
    });
    expect(apiFetchMock).toHaveBeenCalledTimes(2);
  });

  it("classifica corretamente aguardando-faturamento vs em-edição e soma os totais com o fator de adequação (1.05)", () => {
    const awaitingOrder = makeOrder({ id: "#1001" }); // status default = 'Liberados para faturamento', sem processedAt/aprovado
    const emEdicaoOrder = makeOrder({
      id: "#1002",
      processedAt: Date.now() - 2 * 60 * 60 * 1000, // há 2h — dentro da janela de 24h
      aprovado: false,
    });

    render(
      <OrdersList
        orders={[awaitingOrder, emEdicaoOrder]}
        communications={[]}
        setCommunications={noop}
        alerts={[]}
        setAlerts={noop}
        selectedChannel="Todos"
        isAdequacaoActive={false}
        activeTab="abertos"
      />
    );

    // 1 pedido em cada estágio (isAwaitingFaturamento / isInEditWindow)
    expect(screen.getByText("Pedidos Aguardando Faturamento")).toBeInTheDocument();
    expect(screen.getByText("Pedidos Liberados para Edição")).toBeInTheDocument();
    expect(screen.getAllByText("1")).not.toHaveLength(0);

    // base = 2 * 100 = 200 (só o pedido aguardando entra nessa soma)
    expect(screen.getAllByText("R$ 200,00").length).toBeGreaterThanOrEqual(1);
    // com adequação = base * 1.05 = 210
    expect(screen.getByText("R$ 210,00")).toBeInTheDocument();
  });

  it("sem nenhum pedido: mostra 0 em ambos os contadores e R$ 0,00 nos totais", () => {
    render(
      <OrdersList
        orders={[]}
        communications={[]}
        setCommunications={noop}
        alerts={[]}
        setAlerts={noop}
        selectedChannel="Todos"
        isAdequacaoActive={false}
        activeTab="abertos"
      />
    );

    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("R$ 0,00").length).toBeGreaterThanOrEqual(2);
  });

  it("não mistura o mesmo código entre Franquia e Multimarca no canal Todos", () => {
    render(
      <OrdersList
        orders={[
          makeOrder({ id: "#1101", canal: "Franquia" }),
          makeOrder({ id: "#1102", canal: "Multimarca" }),
        ]}
        communications={[]}
        setCommunications={noop}
        alerts={[]}
        setAlerts={noop}
        selectedChannel="Todos"
        isAdequacaoActive={false}
        activeTab="abertos"
      />,
    );

    expect(screen.getAllByText("303643")).toHaveLength(2);
    expect(screen.getAllByText("1 loja(s)")).toHaveLength(2);
  });
});

// Os dois cabeçalhos recolhíveis passaram por duas formas erradas antes de
// chegarem aqui: primeiro o <h3> ficava DENTRO do <button> (heading aninhado em
// controle, ruim para leitor de tela), depois o controle encolheu para só o
// chevron de 32x32 e o título virou texto morto. A forma correta é a do
// WAI-ARIA: o botão DENTRO do heading. Estes testes fixam isso.
function renderAbertos(orders?: Order[]) {
  const awaitingOrder = makeOrder({ id: "#1001" });
  const emEdicaoOrder = makeOrder({
    id: "#1002",
    processedAt: Date.now() - 2 * 60 * 60 * 1000,
    aprovado: false,
  });

  render(
    <OrdersList
      orders={orders ?? [awaitingOrder, emEdicaoOrder]}
      communications={[]}
      setCommunications={noop}
      alerts={[]}
      setAlerts={noop}
      selectedChannel="Todos"
      isAdequacaoActive={false}
      activeTab="abertos"
    />,
  );
}

describe("OrdersList — cabeçalhos recolhíveis", () => {
  it("o título é o próprio gatilho, dentro de um heading — não um chevron solto", () => {
    renderAbertos();

    // Se o alvo de clique voltar a ser só o ícone, o nome acessível deixa de
    // conter a frase e este `getByRole` falha.
    const gatilho = screen.getByRole("button", {
      name: /Relação de Pedidos Aguardando Faturamento/i,
    });
    expect(gatilho).toHaveAttribute("aria-expanded");
    expect(gatilho).toHaveAttribute("aria-controls");

    // O heading continua existindo com o nível certo: o botão está DENTRO dele,
    // e não o contrário.
    const heading = screen.getByRole("heading", {
      name: /Relação de Pedidos Aguardando Faturamento/i,
    });
    expect(heading.tagName).toBe("H3");
    expect(heading).toContainElement(gatilho);
  });

  it("alternar o cabeçalho troca o estado de aria-expanded", async () => {
    const user = userEvent.setup();
    renderAbertos();

    const gatilho = screen.getByRole("button", {
      name: /Relação de Pedidos Aguardando Faturamento/i,
    });
    const inicial = gatilho.getAttribute("aria-expanded");

    await user.click(gatilho);

    expect(gatilho.getAttribute("aria-expanded")).not.toBe(inicial);
  });

  it("a seção da janela de edição segue a mesma forma", () => {
    renderAbertos();

    const gatilho = screen.getByRole("button", {
      name: /Pedidos Liberados — Janela de Edição/i,
    });
    expect(gatilho).toHaveAttribute("aria-expanded");

    const heading = screen.getByRole("heading", {
      name: /Pedidos Liberados — Janela de Edição/i,
    });
    expect(heading).toContainElement(gatilho);
  });
});

// As duas listas da aba "abertos" trocaram a tabela montada à mão pelo
// `DynamicTable` do design system. O que estes testes fixam é justamente o que
// a troca poderia perder: as pílulas de ordenação viraram cabeçalho clicável, e
// os botões coloridos por linha viraram itens do menu "...".
describe("OrdersList — DynamicTable na aba 'abertos'", () => {
  const tabelaAguardando = () =>
    screen.getByRole("table", { name: /aguardando faturamento/i });
  const tabelaEmEdicao = () =>
    screen.getByRole("table", { name: /janela de edição/i });

  it("as pílulas de ordenação saíram — quem ordena agora é o cabeçalho", async () => {
    const user = userEvent.setup();
    renderAbertos();

    // As pílulas segmentadas ("Cliente", "Maior Valor", "Mais Recentes") não
    // existem mais como controles.
    expect(screen.queryByRole("button", { name: "Maior Valor" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Mais Recentes" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cliente" })).toBeNull();

    const coluna = within(tabelaAguardando()).getByRole("columnheader", {
      name: /Valor Total/i,
    });
    expect(coluna).toHaveAttribute("aria-sort", "none");

    // Coluna numérica começa em descendente — o primeiro clique dá exatamente o
    // "Maior Valor" que a pílula entregava por padrão.
    await user.click(within(coluna).getByRole("button", { name: /Valor Total/i }));
    expect(coluna).toHaveAttribute("aria-sort", "descending");

    await user.click(within(coluna).getByRole("button", { name: /Valor Total/i }));
    expect(coluna).toHaveAttribute("aria-sort", "ascending");
  });

  it("a antiga pílula 'Mais Recentes' virou a coluna ordenável 'Últ. Pedido'", () => {
    renderAbertos();

    const coluna = within(tabelaAguardando()).getByRole("columnheader", {
      name: /Últ\. Pedido/i,
    });
    expect(coluna).toHaveAttribute("aria-sort", "none");
  });

  // "Mais Tempo / Menos Tempo" existia no toolbar da janela de edição mas NENHUM
  // memo lia esse estado — clicar não reordenava nada. Virou coluna ordenável.
  it("a janela de edição ordena por 'Tempo Restante' pelo cabeçalho", async () => {
    const user = userEvent.setup();
    renderAbertos();

    const coluna = within(tabelaEmEdicao()).getByRole("columnheader", {
      name: /Tempo Restante/i,
    });
    expect(coluna).toHaveAttribute("aria-sort", "none");

    // Numérica (ms restantes): o primeiro clique é "Mais Tempo".
    await user.click(within(coluna).getByRole("button", { name: /Tempo Restante/i }));
    expect(coluna).toHaveAttribute("aria-sort", "descending");
  });

  // "Pedidos Similares" NÃO é ordenação de coluna: reordena os pedidos por
  // assinatura de cesta antes do agrupamento por produto. Por isso continua um
  // controle do toolbar, e não um <th> clicável.
  it("'Pedidos similares' continua como alternador do toolbar", async () => {
    const user = userEvent.setup();
    renderAbertos();

    const alternador = screen.getByRole("button", { name: /Pedidos similares/i });
    expect(alternador).toHaveAttribute("aria-pressed", "false");

    await user.click(alternador);
    expect(alternador).toHaveAttribute("aria-pressed", "true");
  });

  it("as duas ações de OR por produto viraram itens do menu '...' e seguem habilitadas", async () => {
    const user = userEvent.setup();
    renderAbertos();

    const gatilho = within(tabelaAguardando()).getByRole("button", {
      name: /Abrir ações para 303643/i,
    });
    await user.click(gatilho);

    const semAdequacao = await screen.findByRole("menuitem", {
      name: /Efetuar OR sem adequação/i,
    });
    // Habilitadas de propósito: o clique abre o aviso que explica por que a OR
    // de um produto isolado não existe e o que fazer no lugar. `disabledReason`
    // viraria um `title` — só hover, sem teclado nem toque.
    expect(semAdequacao).not.toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("menuitem", { name: /Efetuar OR com adequação/i }),
    ).toBeInTheDocument();
  });

  // A tabela recebe só o LOTE carregado (`footerRow` + `LoadMoreButton` do
  // design system). Sem estes testes, um `data={listaInteira}` de volta passaria
  // despercebido: o `DynamicTable` virtualiza, então a tela fica igual.
  it("mostra o primeiro lote de 25 produtos e o rodapé com o total", () => {
    renderAbertos(pedidosComProdutosDistintos(60));

    const rodape = document.getElementById("awaiting-orders-load-more")!;
    expect(rodape).toHaveTextContent("Mostrando 25 de 60 produtos");
    expect(
      within(rodape).getByRole("button", { name: "Carregar mais 25" }),
    ).toBeInTheDocument();
  });

  it("'carregar mais' cresce de 25 em 25 e o último lote leva só o que sobrou", async () => {
    const user = userEvent.setup();
    renderAbertos(pedidosComProdutosDistintos(60));

    const rodape = () => document.getElementById("awaiting-orders-load-more")!;

    await user.click(within(rodape()).getByRole("button", { name: "Carregar mais 25" }));
    expect(rodape()).toHaveTextContent("Mostrando 50 de 60 produtos");

    // Sobram 10: o botão promete 10, não 25.
    await user.click(within(rodape()).getByRole("button", { name: "Carregar mais 10" }));
    expect(rodape()).toHaveTextContent("Mostrando 60 de 60 produtos");
    // Chegou ao fim: some o botão, fica só a contagem.
    expect(within(rodape()).queryByRole("button")).toBeNull();
  });

  // A busca filtra os PEDIDOS antes do agrupamento (é global, não só do lote),
  // então a janela precisa voltar ao começo — senão quem carregou 50 linhas
  // continuaria com 50 linhas de um conjunto que a busca acabou de trocar.
  it("mudar a busca devolve a janela ao primeiro lote", async () => {
    const user = userEvent.setup();
    renderAbertos(pedidosComProdutosDistintos(60));

    const rodape = () => document.getElementById("awaiting-orders-load-more")!;
    await user.click(within(rodape()).getByRole("button", { name: "Carregar mais 25" }));
    expect(rodape()).toHaveTextContent("Mostrando 50 de 60 produtos");

    // "Cliente" casa com todos os 60 pedidos: o conjunto não muda de tamanho, só
    // a janela é que volta — isolando o reset do efeito da filtragem.
    await user.type(
      screen.getByRole("searchbox", { name: /Buscar pedidos aguardando faturamento/i }),
      "Cliente",
    );

    await waitFor(() =>
      expect(rodape()).toHaveTextContent("Mostrando 25 de 60 produtos"),
    );
  });

  // A janela de edição tem rodapé próprio: as duas listas contam separado.
  it("a janela de edição tem o próprio rodapé de carregar mais", () => {
    renderAbertos(
      pedidosComProdutosDistintos(40).map(o => ({
        ...o,
        processedAt: Date.now() - 2 * 60 * 60 * 1000,
        aprovado: false,
      })),
    );

    const rodape = document.getElementById("em-edicao-load-more")!;
    expect(rodape).toHaveTextContent("Mostrando 25 de 40 produtos");
  });

  // A moldura do painel passou a depender da contagem SEM busca: antes um termo
  // sem resultado levava embora a própria caixa de busca.
  it("busca sem resultado mantém a caixa de busca e mostra o vazio na tabela", async () => {
    const user = userEvent.setup();
    renderAbertos();

    const busca = screen.getByRole("searchbox", {
      name: /Buscar pedidos aguardando faturamento/i,
    });
    await user.type(busca, "zzzznaoexiste");

    expect(
      screen.getByRole("searchbox", { name: /Buscar pedidos aguardando faturamento/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Nenhum produto condizente com a busca."),
    ).toBeInTheDocument();
  });
});

// ── Aba "alertas" ────────────────────────────────────────────────────────────
// Os dois cartões desta aba são listas de CARTÕES, não tabelas: ninguém as
// virtualiza. O de alertas pintava todos os itens de uma vez; o de comunicações
// mostrava `slice(0, 3)` e deixava o resto inalcançável — sem botão, sem
// rolagem, sem contagem dizendo que existia mais.
function makeAlerts(qtd: number): OrderAlert[] {
  return Array.from({ length: qtd }, (_, i) => ({
    id: `alert-${i}`,
    orderId: `#${3000 + i}`,
    type: i % 2 === 0 ? ("error" as const) : ("warning" as const),
    message: `Pedido #${3000 + i} — Cliente ${i}: bloqueado por falta de estoque.`,
    time: "01/01 10:00",
  }));
}

function makeComms(qtd: number): Communication[] {
  return Array.from({ length: qtd }, (_, i) => ({
    id: `comm-${i}`,
    type: i % 2 === 0 ? ("Email" as const) : ("WhatsApp" as const),
    status: "Enviado" as const,
    time: "10:00",
    content: `Mensagem ${i} para o comercial.`,
    recipient: `comercial${i}@example.com`,
  }));
}

function renderAlertas(alerts: OrderAlert[], communications: Communication[]) {
  return render(
    <OrdersList
      orders={[]}
      communications={communications}
      setCommunications={noop}
      alerts={alerts}
      setAlerts={noop}
      selectedChannel="Todos"
      isAdequacaoActive={false}
      activeTab="alertas"
    />,
  );
}

const itensDeAlerta = (c: HTMLElement) => c.querySelectorAll('[id^="alert-badge-item-"]').length;
const itensDeComunicacao = (c: HTMLElement) => c.querySelectorAll('[id^="comm-feed-item-"]').length;

describe("OrdersList — carregar mais na aba 'alertas'", () => {
  it("pinta 25 alertas por vez em vez da lista inteira", async () => {
    const user = userEvent.setup();
    const { container } = renderAlertas(makeAlerts(60), []);

    expect(itensDeAlerta(container)).toBe(25);

    const rodape = document.getElementById("alerts-load-more")!;
    expect(rodape).toHaveTextContent("Mostrando 25 de 60 alertas");

    await user.click(within(rodape).getByRole("button", { name: "Carregar mais 25" }));
    expect(itensDeAlerta(container)).toBe(50);
  });

  it("o feed de comunicações deixa de parar em 3 itens inalcançáveis", async () => {
    const user = userEvent.setup();
    const { container } = renderAlertas([], makeComms(60));

    // Antes: 3, com as outras 57 sem nenhum caminho na tela.
    expect(itensDeComunicacao(container)).toBe(25);

    const rodape = document.getElementById("comms-load-more")!;
    expect(rodape).toHaveTextContent("Mostrando 25 de 60 comunicações");

    await user.click(within(rodape).getByRole("button", { name: "Carregar mais 25" }));
    expect(itensDeComunicacao(container)).toBe(50);
  });

  // Rodapé com "N de N" e sem botão seria ruído: quem tem 8 alertas não precisa
  // saber que a lista poderia ser paginada.
  it("lista menor que um lote não ganha rodapé", () => {
    const { container } = renderAlertas(makeAlerts(8), makeComms(8));

    expect(itensDeAlerta(container)).toBe(8);
    expect(itensDeComunicacao(container)).toBe(8);
    expect(document.getElementById("alerts-load-more")).toBeNull();
    expect(document.getElementById("comms-load-more")).toBeNull();
  });
});
