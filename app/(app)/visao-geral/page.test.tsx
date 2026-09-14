// Cobertura do estado de carregamento da visão geral: antes de os pedidos
// chegarem a página mostra o esqueleto do painel — não os indicadores zerados,
// que seriam número errado passando por dado real.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { useAppDataMock } = vi.hoisted(() => ({ useAppDataMock: vi.fn() }));
vi.mock("@/features/pedidos/model/app-data-provider", () => ({ useAppData: useAppDataMock }));

// O StandardPageHeader monta o BackButton do design system, que chama
// useRouter(). Sem o app router montado, o Next lança "invariant expected app
// router to be mounted" no jsdom. Só `useRouter` é substituído — o resto do
// módulo continua o original.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

import VisaoGeralPage from "./page";

function mockAppData({ ordersLoading }: { ordersLoading: boolean }) {
  useAppDataMock.mockReturnValue({
    overviewLoading: ordersLoading,
    overviewError: null,
    refetchOverview: vi.fn(),
    selectedChannel: "Todos",
    setSelectedChannel: vi.fn(),
    evolucaoFaturamento: [],
    resumo: null,
  });
}

describe("VisaoGeralPage — estado de carregamento", () => {
  it("enquanto os pedidos carregam mostra o esqueleto do painel, anunciado ao leitor de tela", () => {
    mockAppData({ ordersLoading: true });

    render(<VisaoGeralPage />);

    // O rótulo acessível substitui o texto "Carregando..." do antigo spinner:
    // quem enxerga entende o carregamento pela forma do esqueleto.
    expect(
      screen.getByRole("status", { name: "Carregando visão geral..." })
    ).toBeInTheDocument();

    // O painel de verdade não pode aparecer junto — indicador zerado durante o
    // carregamento é exatamente o que o esqueleto evita.
    expect(screen.queryByText("Pedidos Liberados")).not.toBeInTheDocument();

    // O cabeçalho da rota não é dado que carrega: continua renderizado.
    expect(
      screen.getByRole("heading", { name: "Visão Geral - Dashboard Comercial" })
    ).toBeInTheDocument();
  });

  it("com os pedidos carregados troca o esqueleto pelo painel", () => {
    mockAppData({ ordersLoading: false });

    render(<VisaoGeralPage />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("Pedidos Liberados")).toBeInTheDocument();
  });
});
