// Gating da tela de Parâmetros por papel, conforme o modelo de acesso acordado:
//
//   basico (10) / operacional (20) -> só o "Resumo da Aplicação"; não solicitam
//                                     nem aprovam parâmetro
//   gestor (30)                    -> vê a tabela e SOLICITA alteração/exclusão
//                                     (os itens do menu "..." da linha abrem os
//                                     modais que criam a solicitação; o backend
//                                     exige gestor no POST /change-requests)
//   administrador (40)             -> idem, e é quem aprova
//
// As ações de linha seguem o padrão do manager: um gatilho por linha, rotulado
// pelo `DynamicTable` do design system com o nome da linha ("Abrir ações para
// <parâmetro>"); os rótulos dos itens (Editar/Excluir vs. Solicitar
// alteração/exclusão) só existem no DOM depois que o menu abre — por isso os
// testes de gestor/admin abrem o menu.
//
// O `Can` é mockado fielmente (respeita minLevel via hasMinLevel), diferente de
// page.test.tsx, que o trata como passthrough para testar os fluxos de API.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Parameter } from "@/entities/parametro/model/types";

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

// O StandardPageHeader monta o BackButton do design system, que chama
// useRouter(). Sem o app router montado, o Next lança "invariant expected app
// router to be mounted" no jsdom.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

import ParametrosPage from "./page";

const PARAM: Parameter = {
  id: 1,
  name: "tolerancia_adequacao",
  type: "float",
  value: "5",
  unit: "%",
  limits: "0-100",
  limitsDetail: "",
  description: "Tolerância da adequação de grade",
  status: "Ativo",
};

function renderComNivel(nivel: number, { carregando = false } = {}) {
  nivelAtual.valor = nivel;
  apiFetchMock.mockReset();
  apiFetchMock.mockImplementation(carregando
    ? () => new Promise(() => {})
    : async (path: string) => path.startsWith("/api/v1/parametros?")
      ? {
          rows: [{
            id: PARAM.id,
            chave: PARAM.name,
            valor: String(PARAM.value),
            tipo: PARAM.type,
            descricao: PARAM.description,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          }],
          total: 1,
          page: 1,
          pageSize: 25,
          totalPages: 1,
        }
      : undefined);
  return render(<ParametrosPage />);
}

/** Abre o menu "..." da (única) linha renderizada. */
async function abrirAcoesDaLinha(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /^Abrir ações para / }));
  return screen.findByRole("menu");
}

describe("ParametrosPage — o que cada papel vê", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // A tabela do design system guarda ordenação e busca em localStorage
    // (`persistKey`) — limpar mantém cada papel partindo do mesmo estado. O
    // encadeamento opcional é necessário: o jsdom desta suíte roda sem storage
    // real (`window.localStorage` é um objeto vazio).
    window.localStorage?.clear?.();
  });

  it.each([
    ["basico", 10],
    ["operacional", 20],
  ])("%s (nível %i): vê só o Resumo, sem a tabela de parâmetros", (_papel, nivel) => {
    renderComNivel(nivel);

    // O resumo consolidado é visível para todos.
    expect(screen.getByText("Resumo da Aplicação")).toBeInTheDocument();
    // A tabela detalhada, não: nem cabeçalhos nem a linha do parâmetro.
    expect(screen.queryByText("Valor atual")).not.toBeInTheDocument();
    expect(screen.queryByText("tolerancia_adequacao")).not.toBeInTheDocument();
    // Nem os atalhos de escrita.
    expect(screen.queryByRole("button", { name: /Novo parâmetro/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Abrir ações para / })).not.toBeInTheDocument();
    expect(screen.getByText(/Somente leitura/i)).toBeInTheDocument();
  });

  it("gestor (nível 30): vê a tabela e pode SOLICITAR alteração e exclusão", async () => {
    const user = userEvent.setup();
    renderComNivel(30);

    expect(await screen.findByText("tolerancia_adequacao")).toBeInTheDocument();
    // Regressão que este teste protege: as ações estavam em minLevel 40, então o
    // gestor via um cadeado e não tinha como solicitar nada — apesar de o backend
    // liberar POST /change-requests para ele.
    await abrirAcoesDaLinha(user);
    expect(screen.getByRole("menuitem", { name: "Solicitar alteração" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Solicitar exclusão" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Novo parâmetro/i })).toBeInTheDocument();
    // E é avisado de que o que ele faz vira solicitação.
    expect(screen.getByText(/solicitação para aprovação do Admin/i)).toBeInTheDocument();
    expect(screen.queryByText(/Somente leitura/i)).not.toBeInTheDocument();
  });

  // O esqueleto respeita o mesmo `Can minLevel={30}` da tabela: quem não vê a
  // tabela também não vê o esqueleto dela — caso contrário a tela prometeria,
  // para basico/operacional, um conteúdo que nunca chega.
  it("basico (nível 10) carregando: esqueleto só dos indicadores, nenhum da tabela", () => {
    renderComNivel(10, { carregando: true });

    const regioes = screen.getAllByRole("status");
    expect(regioes).toHaveLength(1);
    expect(regioes[0]).toHaveTextContent("Carregando indicadores do resumo...");
    expect(screen.queryByText("Carregando parâmetros...")).not.toBeInTheDocument();
  });

  it("gestor (nível 30) carregando: esqueleto da tabela e dos indicadores", () => {
    renderComNivel(30, { carregando: true });

    const regioes = screen.getAllByRole("status");
    expect(regioes).toHaveLength(2);
    expect(regioes[0]).toHaveTextContent("Carregando parâmetros...");
    expect(regioes[1]).toHaveTextContent("Carregando indicadores do resumo...");
  });

  it("administrador (nível 40): altera direto, sem o aviso de solicitação", async () => {
    const user = userEvent.setup();
    renderComNivel(40);

    expect(await screen.findByText("tolerancia_adequacao")).toBeInTheDocument();
    await abrirAcoesDaLinha(user);
    expect(screen.getByRole("menuitem", { name: "Editar" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Excluir" })).toBeInTheDocument();
    expect(screen.queryByText(/solicitação para aprovação do Admin/i)).not.toBeInTheDocument();
  });
});
