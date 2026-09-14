// Rede de segurança (Fase 1, Etapa 0) — caracteriza o comportamento ATUAL de
// UsuariosPage: o tradutor de shape (toUserRow), a tabela de usuários e
// permissões, e os fluxos de trocar papel e excluir acesso.
//
// A tela já teve três tabelas. As de solicitações de parâmetros e histórico de
// decisões saíram para `/configuracoes-parametros` (quick 260908-cfp), e a
// cobertura delas foi junto, em `app/(app)/configuracoes-parametros/page.test.tsx`.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeAll, beforeEach } from "vitest";
import type { AdminUser } from "@/entities/usuario/model/types";

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));
vi.mock("@/lib/api/http-client", () => ({ apiFetch: apiFetchMock }));

// Este arquivo testa os fluxos de dados/API da página, não o gating por papel
// (isso é cobertura de page.roles.test.tsx) — `Can`/`usePermissions` entram
// como passthrough sempre-permitido, no mesmo padrão de parametros/page.test.tsx.
vi.mock("@/shared/config/auth/permissions", () => ({
  usePermissions: () => ({ hasMinLevel: (min: number) => min <= 40 }),
  Can: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// O StandardPageHeader monta o BackButton do design system, que chama
// useRouter(). Sem o app router montado, o Next lança "invariant expected app
// router to be mounted" no jsdom.
//
// Só `useRouter` é substituído: o resto do módulo continua o original. Trocar o
// módulo inteiro faria qualquer `usePathname`/`useSearchParams` que a página
// venha a montar falhar com "não é uma função", em vez de um erro legível.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

import UsuariosPage from "./page";

const users: AdminUser[] = [
  { id: 1, email: "gestor@example.com", roles: ["gestor"], confirmed_at: "2026-01-01T00:00:00Z" },
  { id: 2, email: "pendente@example.com", roles: [], confirmed_at: null },
];

// Radix (DropdownMenu/Dialog/Select) usa Pointer Capture, que o jsdom não
// implementa — sem estes stubs abrir o Select lança TypeError no clique.
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

// As ações de linha saíram de controles inline (<select> de papéis) para o menu
// "..." do `DynamicTable` do design system, que rotula o gatilho com a linha
// ("Abrir ações para <nome>"). Ancorar pela linha, e não por índice, mantém o
// teste legível.
async function openRowAction(
  user: ReturnType<typeof userEvent.setup>,
  rowText: string,
  itemName: string,
) {
  const row = screen.getByText(rowText).closest("tr");
  if (!row) throw new Error(`Linha não encontrada para "${rowText}"`);
  await user.click(within(row).getByRole("button", { name: /^Abrir ações para/ }));
  await user.click(await screen.findByRole("menuitem", { name: itemName }));
}

beforeEach(() => {
  apiFetchMock.mockReset();
  apiFetchMock.mockImplementation(async (path: string) => {
    if (path.startsWith("/api/auth/users?")) {
      return {
        rows: users,
        total: users.length,
        page: 1,
        pageSize: 25,
        totalPages: 1,
      };
    }
    if (path.startsWith("/api/auth/users/")) {
      return undefined;
    }
    throw new Error(`unexpected path in test: ${path}`);
  });
});

// O estado de carregando deixou de ser um spinner com o texto "Carregando
// usuários..." visível e passou a ser o esqueleto da tabela. A mensagem
// continua existindo — agora como rótulo acessível da região `status` —, então
// a cobertura de "mostra carregando antes dos dados" só troca de alvo.
describe("UsuariosPage — estado de carregamento", () => {
  it("mostra o esqueleto da tabela, com rótulo acessível, antes de os dados chegarem", () => {
    // Promessa que nunca resolve: congela a tela no estado de carregando.
    apiFetchMock.mockImplementation(() => new Promise(() => {}));

    render(<UsuariosPage />);

    const carregando = screen.getByRole("status");
    expect(carregando).toHaveAttribute("aria-busy", "true");
    expect(carregando).toHaveTextContent("Carregando usuários...");

    // Cabeçalho da página é conteúdo conhecido: aparece de verdade, não como
    // esqueleto (é o que o `manager-route-loading` do Ara faz).
    expect(screen.getByRole("heading", { name: "Gestão de Usuários" })).toBeInTheDocument();

    // A tabela real só entra com os dados — o esqueleto reserva a forma,
    // não promete conteúdo.
    expect(screen.queryByText("Nome / E-mail")).not.toBeInTheDocument();
  });
});

describe("UsuariosPage — caracterização", () => {
  it("toUserRow: lista os usuários com e-mail, papéis e o rótulo de quem não tem papel", async () => {
    render(<UsuariosPage />);

    await waitFor(() => expect(screen.getByText("gestor@example.com")).toBeInTheDocument());

    expect(screen.getByText("pendente@example.com")).toBeInTheDocument();
    expect(screen.getByText("Sem papel atribuído")).toBeInTheDocument();
  });

  it("a tela não mostra mais solicitações de parâmetros nem o histórico de decisões", async () => {
    render(<UsuariosPage />);

    await waitFor(() => expect(screen.getByText("gestor@example.com")).toBeInTheDocument());

    // Os dois quadros migraram para /configuracoes-parametros. O badge
    // "SOLICITAÇÃO" e a coluna do histórico são as marcas de cada um: se
    // voltarem a aparecer aqui, a separação regrediu.
    expect(screen.queryByText("SOLICITAÇÃO")).not.toBeInTheDocument();
    expect(screen.queryByText("Data da Decisão")).not.toBeInTheDocument();

    // E a página não fala mais com o endpoint de change-requests — o mock
    // lançaria em path inesperado, mas a asserção deixa a intenção explícita.
    expect(apiFetchMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/v1\/parametros\/change-requests/),
      expect.anything(),
    );
  });
});

// Etapa 4 — chamadas de apiFetch agora passam pelas funções nomeadas de
// features/usuarios/api/users.api.ts; estes testes garantem que
// endpoint/método/payload continuam idênticos ao comportamento pré-extração.
describe("UsuariosPage — chamadas de API dos fluxos de trocar papel e excluir acesso (Etapa 4)", () => {
  // O `pointerEventsCheck: 0` cobre o `pointer-events: none` que o Dialog do
  // Radix aplica no body enquanto o modal de confirmação está aberto.
  it("trocar o papel de um usuário chama apiFetch com PUT .../roles e { roles: [role] }, depois recarrega usuários", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<UsuariosPage />);

    await waitFor(() => expect(screen.getByText("gestor@example.com")).toBeInTheDocument());

    await openRowAction(user, "gestor@example.com", "Alterar papel");

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("combobox", { name: "Novo papel" }));
    await user.click(await screen.findByRole("option", { name: "administrador" }));

    // A escolha sozinha não pode gravar nada — o PUT só sai no Confirmar.
    expect(apiFetchMock).not.toHaveBeenCalledWith(
      "/api/auth/users/1/roles",
      expect.anything(),
    );

    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenCalledWith("/api/auth/users/1/roles", {
        method: "PUT",
        body: JSON.stringify({ roles: ["administrador"] }),
      })
    );
  });

  it("excluir o acesso de um usuário (confirmado numa janela separada) chama apiFetch com DELETE .../{id}, depois recarrega usuários", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<UsuariosPage />);

    await waitFor(() => expect(screen.getByText("gestor@example.com")).toBeInTheDocument());

    apiFetchMock.mockClear();

    await openRowAction(user, "gestor@example.com", "Alterar papel");

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Excluir acesso" }));

    // Abre uma segunda janela de confirmação — nada foi chamado ainda.
    expect(apiFetchMock).not.toHaveBeenCalled();
    const alertDialog = await screen.findByRole("alertdialog");

    await user.click(within(alertDialog).getByRole("button", { name: "Confirmar exclusão" }));

    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenCalledWith("/api/auth/users/1", { method: "DELETE" }),
    );
    // Reload da lista de usuários depois da exclusão.
    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/^\/api\/auth\/users\?/),
        expect.anything(),
      ),
    );
  });
});
