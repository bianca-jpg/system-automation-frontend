import { render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// jsdom não implementa matchMedia, e a sidebar consulta o breakpoint mobile
// para decidir se vira diálogo modal. Sem o stub o mount lança antes da
// asserção. `matches: false` = viewport desktop, que é o cenário destes testes.
beforeAll(() => {
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
});

vi.mock("next/navigation", () => ({ usePathname: () => "/visao-geral" }));
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
  // A identidade do usuário migrou do header (removido) para o menu do rodapé
  // da sidebar, então ela agora depende da sessão.
  useSession: () => ({
    data: { user: { name: "Ana Souza", role: "gestor" } },
    status: "authenticated",
  }),
}));
const realtimeMocks = vi.hoisted(() => ({
  collapsed: false,
  clearPersistedState: vi.fn(),
  useRealtime: vi.fn(),
}));

vi.mock("@/shared/providers/sidebar-context", () => ({
  useSidebar: () => ({
    isSidebarCollapsed: realtimeMocks.collapsed,
    toggleSidebar: () => {},
  }),
}));
vi.mock("@/shared/config/auth/permissions", () => ({
  Can: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/features/realtime", () => ({
  useRealtime: realtimeMocks.useRealtime,
}));

import { AppSidebar } from "./app-sidebar";

describe("AppSidebar — smoke test", () => {
  beforeEach(() => {
    realtimeMocks.collapsed = false;
    realtimeMocks.clearPersistedState.mockReset();
    realtimeMocks.useRealtime.mockReturnValue({
      clearPersistedState: realtimeMocks.clearPersistedState,
      unseenTopics: {
        orders: false,
        alerts: false,
        communications: false,
        history: false,
      },
    });
  });

  it("mostra somente ponto e texto acessível para eventos novos de Pedidos", () => {
    realtimeMocks.useRealtime.mockReturnValue({
      clearPersistedState: realtimeMocks.clearPersistedState,
      unseenTopics: {
        orders: true,
        alerts: false,
        communications: false,
        history: false,
      },
    });

    render(<AppSidebar />);

    expect(
      screen.getByRole("link", { name: "Pedidos, com novas atualizações" }),
    ).toBeInTheDocument();
    const dot = document.querySelector('[data-slot="icon-count-badge"]');
    expect(dot).toHaveAttribute("data-display", "dot");
    expect(dot).toHaveTextContent("");
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("sinaliza Histórico e Alertas pelas revisões não vistas, sem contagens", () => {
    realtimeMocks.useRealtime.mockReturnValue({
      clearPersistedState: realtimeMocks.clearPersistedState,
      unseenTopics: {
        orders: false,
        alerts: true,
        communications: false,
        history: true,
      },
    });

    render(<AppSidebar />);

    expect(
      screen.getByRole("link", { name: "Histórico, com novas atualizações" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Alertas, com novas atualizações" }),
    ).toBeInTheDocument();
    expect(document.querySelectorAll('[data-display="dot"]')).toHaveLength(2);
  });

  it("uma comunicação nova aponta para Alertas, sua seção semântica", () => {
    realtimeMocks.useRealtime.mockReturnValue({
      clearPersistedState: realtimeMocks.clearPersistedState,
      unseenTopics: {
        orders: false,
        alerts: false,
        communications: true,
        history: false,
      },
    });

    render(<AppSidebar />);

    expect(
      screen.getByRole("link", { name: "Alertas, com novas atualizações" }),
    ).toBeInTheDocument();
  });

  it("mantém o ponto e seu nome acessível quando a sidebar está recolhida", () => {
    realtimeMocks.collapsed = true;
    realtimeMocks.useRealtime.mockReturnValue({
      clearPersistedState: realtimeMocks.clearPersistedState,
      unseenTopics: {
        orders: true,
        alerts: false,
        communications: false,
        history: false,
      },
    });

    render(<AppSidebar />);

    expect(
      screen.getByRole("link", { name: "Pedidos, com novas atualizações" }),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-display="dot"]')).toBeInTheDocument();
  });

  it("sem eventos novos renderiza a navegação sem pontos", () => {
    render(<AppSidebar />);

    expect(screen.getByText("Pedidos")).toBeInTheDocument();
    expect(document.querySelector('[data-display="dot"]')).not.toBeInTheDocument();
  });

  it("menu do usuário no rodapé mostra o nome da sessão (o app não tem mais top bar)", () => {
    render(<AppSidebar />);

    // Um no header mobile (sem rótulo visível) e outro no rodapé desktop.
    expect(
      screen.getAllByRole("button", { name: "Abrir menu de Ana Souza" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
  });
});
