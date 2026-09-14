// O esqueleto de carregamento das telas servidas pelo OrdersList tem duas
// obrigações que valem teste: continuar ANUNCIANDO o carregamento para leitor de
// tela (o texto grande do spinner virou rótulo acessível) e desenhar o MESMO
// número de colunas da tabela real — esqueleto com contagem diferente promete
// uma forma e entrega outra, fazendo a tela pular quando os dados chegam.
import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Order } from "@/shared/types/models";

vi.mock("@/shared/config/auth/permissions", () => ({
  usePermissions: () => ({ hasMinLevel: (min: number) => min <= 40 }),
}));

vi.mock("@/features/realtime", () => ({
  useRealtime: () => ({
    topicRevisions: { orders: 0, alerts: 0, communications: 0, history: 0 },
    markTopicRead: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/lib/api/http-client", () => ({
  apiFetch: vi
    .fn()
    .mockResolvedValue({
      rows: [], total: 0, pageSize: 25, nextCursor: null, hasMore: false,
      page: 1, totalPages: 1,
    }),
}));

vi.mock("@/features/pedidos/model/use-tolerancia-adequacao", () => ({
  useToleranciaAdequacaoFator: () => 1.05,
}));

import { OrdersList } from "./orders-list";
import { OrdersListSkeleton } from "./orders-list-skeleton";

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "#1000",
    client: "Cliente Teste",
    value: 200,
    originalValueBeforeAdequacao: 200,
    status: "Liberados para faturamento",
    motivo: "",
    canal: "Franquia",
    items: [
      {
        name: "Camisa Polo Piquet",
        code: "303643",
        unitValue: 100,
        qty: 2,
        cdStatus: "Regular" as const,
      },
    ],
    adequacaoAplicada: false,
    adequacaoValorAjustado: 0,
    ...overrides,
  };
}

const noop = () => {};

function renderOrdersList(activeTab: "abertos" | "historico" | "alertas") {
  return render(
    <OrdersList
      orders={[makeOrder()]}
      communications={[]}
      setCommunications={noop}
      alerts={[]}
      setAlerts={noop}
      selectedChannel="Todos"
      isAdequacaoActive={false}
      activeTab={activeTab}
    />,
  );
}

/**
 * Cabeçalhos de coluna da tabela real (`<th>`) dentro de uma tabela específica.
 *
 * O seletor é passado inteiro porque cada `DynamicTable` se identifica pelo
 * `aria-label` vindo de `tableLabel`.
 */
function colunasDaTabela(container: HTMLElement, seletorDaTabela: string) {
  const cabecalhos = container.querySelectorAll(`${seletorDaTabela} thead th`);
  // Sem esta guarda, um seletor que deixou de casar (tabela renomeada, `id`
  // removido numa migração) devolveria 0 e o teste passaria comparando duas
  // ausências.
  expect(cabecalhos.length).toBeGreaterThan(0);
  return cabecalhos.length;
}

/**
 * Colunas do esqueleto: a grade da `DataTableSkeleton` declara as faixas em
 * `style`, então as linhas com estilo inline são exatamente o cabeçalho e o
 * corpo da tabela — a primeira delas é o cabeçalho.
 */
function colunasDoEsqueleto(container: HTMLElement) {
  const linhas = container.querySelectorAll<HTMLElement>("div[style]");
  expect(linhas.length).toBeGreaterThan(0);
  return linhas[0]!.children.length;
}

describe("OrdersListSkeleton", () => {
  it("anuncia o carregamento por rótulo acessível em vez de texto na tela", () => {
    render(<OrdersListSkeleton activeTab="abertos" />);

    const regiao = screen.getByRole("status");
    expect(regiao).toHaveAttribute("aria-busy", "true");
    expect(
      within(regiao).getByText("Carregando pedidos do servidor..."),
    ).toBeInTheDocument();
  });

  it("usa o rótulo que a tela passa", () => {
    render(
      <OrdersListSkeleton
        activeTab="historico"
        label="Carregando histórico do servidor..."
      />,
    );

    expect(
      screen.getByText("Carregando histórico do servidor..."),
    ).toBeInTheDocument();
  });

  it("reserva as mesmas colunas da tabela de pedidos aguardando faturamento", () => {
    const esqueleto = render(<OrdersListSkeleton activeTab="abertos" />);
    const colunasEsqueleto = colunasDoEsqueleto(esqueleto.container);
    esqueleto.unmount();

    const real = renderOrdersList("abertos");

    // 6 colunas de dados + a coluna de ações do `DynamicTable` (o menu "...").
    expect(colunasEsqueleto).toBe(
      colunasDaTabela(
        real.container,
        'table[aria-label="Pedidos aguardando faturamento, agrupados por produto"]',
      ),
    );
  });

  it("reserva as mesmas colunas da tabela do histórico", async () => {
    const esqueleto = render(<OrdersListSkeleton activeTab="historico" />);
    const colunasEsqueleto = colunasDoEsqueleto(esqueleto.container);
    esqueleto.unmount();

    const real = renderOrdersList("historico");
    // O histórico busca a página no back-end no mount; sem esperar, o setState da
    // resposta cairia fora do act().
    await act(async () => {});

    expect(colunasEsqueleto).toBe(
      colunasDaTabela(
        real.container,
        'table[aria-label="Histórico de pedidos, agrupado por produto"]',
      ),
    );
  });

  // Rodapé errado desloca tudo o que vem abaixo na hora da troca: a faixa
  // numerada tem 40px de altura e fica encostada à direita; a de "carregar mais"
  // empilha contagem e botão no centro e passa de 90px. As listas por produto
  // usam a faixa numerada, então é ela que o esqueleto tem de reservar.
  it("reserva a barra numerada na tela de pedidos, não o rodapé de 'carregar mais'", () => {
    const esqueleto = render(<OrdersListSkeleton activeTab="abertos" />);

    expect(
      esqueleto.container.querySelector('[data-slot="table-skeleton-pagination"]'),
    ).not.toBeNull();
    expect(
      esqueleto.container.querySelector('[data-slot="table-skeleton-load-more"]'),
    ).toBeNull();
  });

  it("o histórico reserva a mesma barra numerada", () => {
    const esqueleto = render(<OrdersListSkeleton activeTab="historico" />);

    expect(
      esqueleto.container.querySelector('[data-slot="table-skeleton-pagination"]'),
    ).not.toBeNull();
    expect(
      esqueleto.container.querySelector('[data-slot="table-skeleton-load-more"]'),
    ).toBeNull();
  });

  it("reserva os dois cartões lado a lado da tela de alertas", () => {
    const esqueleto = render(<OrdersListSkeleton activeTab="alertas" />);
    const grade = esqueleto.container.querySelector<HTMLElement>(
      '[class*="lg:grid-cols-2"]',
    );

    expect(grade?.children).toHaveLength(2);
  });
});
