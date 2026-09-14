// Gating de UsuariosPage por papel — a tela inteira é sensível (lista de
// usuários + edição de papel via updateUserRole), então o gate aqui é
// tudo-ou-nada: quem não é administrador (nível 40+) não vê a tabela nem
// dispara o fetch de usuários. Defesa própria da página, independente do que o
// middleware/proxy.ts decidir sobre a rota.
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

import UsuariosPage from "./page";

function renderComNivel(nivel: number) {
  nivelAtual.valor = nivel;
  apiFetchMock.mockReset();
  apiFetchMock.mockImplementation(async (path: string) => {
    if (path.startsWith("/api/auth/users?")) {
      return { rows: [], total: 0, page: 1, pageSize: 25, totalPages: 1 };
    }
    throw new Error(`unexpected path in test: ${path}`);
  });
  return render(<UsuariosPage />);
}

describe("UsuariosPage — gating por papel", () => {
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
    expect(screen.queryByRole("heading", { name: "Gestão de Usuários" })).not.toBeInTheDocument();
    // Nenhum fetch sensível dispara para quem não tem permissão.
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("administrador (nível 40): vê a tela normalmente", async () => {
    renderComNivel(40);

    expect(await screen.findByRole("heading", { name: "Gestão de Usuários" })).toBeInTheDocument();
    expect(screen.queryByText("Acesso restrito")).not.toBeInTheDocument();
    expect(apiFetchMock).toHaveBeenCalled();
  });

  it("admin_tecnico (nível 50): vê a tela normalmente", async () => {
    renderComNivel(50);

    expect(await screen.findByRole("heading", { name: "Gestão de Usuários" })).toBeInTheDocument();
    expect(apiFetchMock).toHaveBeenCalled();
  });
});
