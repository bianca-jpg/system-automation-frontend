// Identidade da pessoa logada no menu do rodapé da sidebar: nome, rótulo do
// papel e iniciais no avatar.
//
// Arquivo separado de `app-sidebar.test.tsx` porque aqui a sessão precisa
// variar por teste (nome presente/ausente, papel com/sem rótulo) — lá ela é
// fixa, a serviço dos testes de navegação e pontos de não-visto.
import { render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// jsdom não implementa matchMedia, e a sidebar consulta o breakpoint mobile
// para decidir se vira diálogo modal. `matches: false` = viewport desktop.
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

const sessionMock = vi.hoisted(() => ({
  user: {} as { name?: string; email?: string; role?: string; roleTitle?: string },
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/visao-geral" }));
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
  useSession: () => ({ data: { user: sessionMock.user }, status: "authenticated" }),
}));

const realtimeMocks = vi.hoisted(() => ({
  clearPersistedState: vi.fn(),
  useRealtime: vi.fn(),
}));

vi.mock("@/shared/providers/sidebar-context", () => ({
  useSidebar: () => ({ isSidebarCollapsed: false, toggleSidebar: () => {} }),
}));
vi.mock("@/shared/config/auth/permissions", () => ({
  Can: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/features/realtime", () => ({
  useRealtime: realtimeMocks.useRealtime,
}));

import { AppSidebar } from "./app-sidebar";

beforeEach(() => {
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

describe("AppSidebar — identidade do usuário", () => {
  it("mostra o nome real e o rótulo do papel", () => {
    sessionMock.user = {
      name: "Victoria Mollica",
      email: "victoria@example.com",
      role: "admin_tecnico",
      roleTitle: "Admin Técnico",
    };

    render(<AppSidebar />);

    expect(screen.getAllByText("Victoria Mollica").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Admin Técnico").length).toBeGreaterThan(0);
    // O e-mail sai da tela: era ele que aparecia no lugar do nome antes de o
    // backend capturar o claim `name` do SSO.
    expect(screen.queryByText("victoria@example.com")).not.toBeInTheDocument();
  });

  it("usa as iniciais do nome no avatar", () => {
    sessionMock.user = {
      name: "Victoria Mollica",
      roleTitle: "Admin Técnico",
    };

    render(<AppSidebar />);

    expect(screen.getAllByText("VM").length).toBeGreaterThan(0);
  });

  it("sem rótulo de papel não renderiza linha vazia embaixo do nome", () => {
    // Conta que ainda não relogou desde a migration 036 pode não ter rótulo.
    sessionMock.user = { name: "Ana Souza", role: "gestor" };

    render(<AppSidebar />);

    expect(screen.getAllByText("Ana Souza").length).toBeGreaterThan(0);
    expect(screen.queryByText("Gestor")).not.toBeInTheDocument();
  });

  it("sem nome cai no e-mail e NÃO gera iniciais a partir dele", () => {
    // "victoria.mollica" viraria "V", que diz menos que o ícone genérico.
    sessionMock.user = {
      email: "victoria@example.com",
      role: "basico",
      roleTitle: "Básico",
    };

    render(<AppSidebar />);

    expect(
      screen.getAllByText("victoria@example.com").length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("V")).not.toBeInTheDocument();
    expect(screen.queryByText("VM")).not.toBeInTheDocument();
  });

  it("sessão sem nome nem e-mail não quebra a sidebar", () => {
    sessionMock.user = {};

    render(<AppSidebar />);

    expect(screen.getAllByText("Usuário").length).toBeGreaterThan(0);
  });
});
