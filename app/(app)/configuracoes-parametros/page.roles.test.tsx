// Gating de ConfiguracoesParametrosPage por papel — a tela inteira é sensível
// (decidir solicitação de parâmetro via reviewChangeRequest), então o gate aqui
// é tudo-ou-nada: quem não é administrador (nível 40+) não vê as tabelas nem
// dispara os fetches de solicitações/histórico. É o mesmo nível que estes
// quadros já exigiam em `/usuarios`, de onde vieram (quick 260908-cfp).
//
// Defesa própria da página, independente do que o proxy.ts decidir sobre a
// rota — a trava de URL direta vive em `canAccessPath` e tem teste separado em
// `shared/config/auth/automation-roles.test.ts`.
//
// O `Can` é mockado fielmente (respeita minLevel via hasMinLevel), diferente
// de page.test.tsx, que o trata como passthrough para testar os fluxos de API.
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));
vi.mock("@/lib/api/http-client", () => ({ apiFetch: apiFetchMock }));

// Nível corrente, mutável por teste.
const { nivelAtual } = vi.hoisted(() => ({ nivelAtual: { valor: 10 } }));
vi.mock("@/shared/config/auth/permissions", () => {
  const hasMinLevel = (min: number) => nivelAtual.valor >= min;
  return {
    usePermissions: () => ({ hasMinLevel }),
    Can: ({
      minLevel,
      children,
      fallback = null,
    }: {
      minLevel?: number;
      children: React.ReactNode;
      fallback?: React.ReactNode;
    }) => <>{minLevel !== undefined && hasMinLevel(minLevel) ? children : fallback}</>,
  };
});

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

import ConfiguracoesParametrosPage from "./page";

function renderComNivel(nivel: number) {
  nivelAtual.valor = nivel;
  apiFetchMock.mockReset();
  apiFetchMock.mockImplementation(async (path: string) => {
    if (path.startsWith("/api/v1/parametros/change-requests?")) {
      return { rows: [], total: 0, page: 1, pageSize: 25, totalPages: 1 };
    }
    throw new Error(`unexpected path in test: ${path}`);
  });
  return render(<ConfiguracoesParametrosPage />);
}

describe("ConfiguracoesParametrosPage — gating por papel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["basico", 10],
    ["operacional", 20],
    ["gestor", 30],
  ])("%s (nível %i): não vê a tela, só a mensagem de acesso restrito", (_papel, nivel) => {
    renderComNivel(nivel);

    expect(screen.getByRole("alert")).toHaveTextContent("Acesso restrito");
    expect(
      screen.queryByRole("heading", { name: "Configurações de Parâmetros" }),
    ).not.toBeInTheDocument();
    // Nenhum fetch sensível dispara para quem não tem permissão.
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("gestor (nível 30) enxerga /parametros mas não esta tela — solicitar não é decidir", () => {
    renderComNivel(30);

    // Fronteira que a separação de telas criou: gestor continua podendo pedir
    // mudança de parâmetro, e não pode julgar a própria solicitação.
    expect(screen.getByRole("alert")).toHaveTextContent("Acesso restrito");
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("administrador (nível 40): vê a tela normalmente", async () => {
    renderComNivel(40);

    expect(
      await screen.findByRole("heading", { name: "Configurações de Parâmetros" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Acesso restrito")).not.toBeInTheDocument();
    expect(apiFetchMock).toHaveBeenCalled();
  });

  it("admin_tecnico (nível 50): vê a tela normalmente", async () => {
    renderComNivel(50);

    expect(
      await screen.findByRole("heading", { name: "Configurações de Parâmetros" }),
    ).toBeInTheDocument();
    expect(apiFetchMock).toHaveBeenCalled();
  });
});
