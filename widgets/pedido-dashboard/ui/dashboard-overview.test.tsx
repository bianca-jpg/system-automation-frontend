// Rede de segurança (Fase 3, Etapa 0) — smoke test de dashboard-overview.tsx
// (alvo da Etapa 4). Caracteriza a apuração de status/peças bloqueadas ANTES de
// qualquer quebra do arquivo.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Order } from "@/shared/types/models";

const { useAppDataMock } = vi.hoisted(() => ({ useAppDataMock: vi.fn() }));
vi.mock("@/features/pedidos/model/app-data-provider", () => ({ useAppData: useAppDataMock }));

import { DashboardOverview } from "./dashboard-overview";

function makeOrder(overrides: Partial<Order>): Order {
  return {
    id: "#1",
    client: "Cliente",
    value: 100,
    originalValueBeforeAdequacao: 100,
    status: "Liberados para faturamento",
    motivo: "",
    canal: "Franquia",
    items: [],
    adequacaoAplicada: false,
    adequacaoValorAjustado: 0,
    ...overrides,
  };
}

describe("DashboardOverview — smoke test", () => {
  it("apura contagem por status e peças bloqueadas por falta de estoque (demanda - estoque)", () => {
    useAppDataMock.mockReturnValue({ evolucaoFaturamento: [], resumo: null });

    const liberado = makeOrder({
      id: "#1",
      status: "Liberados para faturamento",
      items: [{ name: "Produto A", code: "A1", unitValue: 100, qty: 5, cdStatus: "Regular", stock: 3 }],
    });
    const bloqueadoCredito = makeOrder({ id: "#2", status: "Bloqueado sem crédito" });

    render(
      <DashboardOverview
        orders={[liberado, bloqueadoCredito]}
        selectedChannel="Todos"
        setSelectedChannel={() => {}}
      />
    );

    // total = 1 liberado + 1 bloqueado sem crédito = 2; pecasBloqueadas também dá 2
    // (max(0, demanda(5) - estoque(3))) — coincidência do fixture, daí getAllByText.
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(2);
    // liberadosCount = 1, bloqueadosSemCreditoCount = 1
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(2);
  });

  it("renderiza os big numbers como MetricCard e o cabeçalho padrão do card de gráfico", () => {
    useAppDataMock.mockReturnValue({ evolucaoFaturamento: [], resumo: null });

    render(
      <DashboardOverview
        orders={[makeOrder({ id: "#1" })]}
        selectedChannel="Todos"
        setSelectedChannel={() => {}}
      />
    );

    // Rótulos dos KPIs preservados na migração para o MetricCard do design
    // system. `getAllByText` porque "Pedidos Acumulados" também rotula uma das
    // distribuições do card de gráfico.
    for (const titulo of [
      "Pedidos Acumulados",
      "Pedidos Liberados",
      "Peças Bloqueadas Estoque",
      "Bloqueados sem crédito",
    ]) {
      expect(screen.getAllByText(titulo).length).toBeGreaterThanOrEqual(1);
    }

    // O ChartCardHeader troca o ícone solto por um acionador de tooltip rotulado.
    expect(
      screen.getByRole("button", { name: "Informações sobre Desempenho de Pedidos" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Informações sobre Faturamento Distribuído por Coleção",
      })
    ).toBeInTheDocument();
  });

  it("sem pedidos: contagens zeradas, sem quebrar", () => {
    useAppDataMock.mockReturnValue({ evolucaoFaturamento: [], resumo: null });

    render(
      <DashboardOverview
        orders={[]}
        selectedChannel="Todos"
        setSelectedChannel={() => {}}
      />
    );

    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });
});
