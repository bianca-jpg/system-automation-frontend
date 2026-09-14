// Cobertura dos fluxos de dados/API de ConfiguracoesParametrosPage: os
// tradutores de shape (toHistoryItem/toRequestRow/formatDate), a tabela de
// solicitações pendentes, o histórico de decisões e o modal de decisão.
//
// Estes casos vinham de `app/(app)/usuarios/page.test.tsx` — os dois quadros
// moravam em Gestão de Usuários antes de ganharem tela própria (quick 260908-cfp).
// A massa de teste e os helpers foram preservados junto com eles, para a
// mudança de rota não passar por cima da rede de segurança que já existia.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeAll, beforeEach } from "vitest";
import type { ParameterChangeRequest } from "@/entities/parametro/model/types";

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

import ConfiguracoesParametrosPage from "./page";

const pendingCreate: ParameterChangeRequest = {
  id: 101,
  requested_by: 7,
  target_chave: null,
  change_type: "create",
  proposed_payload: { chave: "nova_margem" },
  justification: "Precisamos de uma margem maior no inverno.",
  status: "pending",
  reviewed_by: null,
  reviewed_at: null,
  created_at: "2026-01-10T12:00:00Z",
  updated_at: "2026-01-10T12:00:00Z",
};

const pendingUpdate: ParameterChangeRequest = {
  id: 102,
  requested_by: 8,
  target_chave: "tolerancia_adequacao",
  change_type: "update",
  proposed_payload: { valor: "0.08" },
  justification: null,
  status: "pending",
  reviewed_by: null,
  reviewed_at: null,
  created_at: "2026-01-11T09:30:00Z",
  updated_at: "2026-01-11T09:30:00Z",
};

const approvedDelete: ParameterChangeRequest = {
  id: 103,
  requested_by: 9,
  target_chave: "criterio_selecao",
  change_type: "delete",
  proposed_payload: {},
  justification: "Parâmetro obsoleto.",
  status: "approved",
  reviewed_by: 1,
  reviewed_at: "2026-01-12T15:00:00Z",
  created_at: "2026-01-09T08:00:00Z",
  updated_at: "2026-01-12T15:00:00Z",
};

const rejectedUpdate: ParameterChangeRequest = {
  id: 104,
  requested_by: 10,
  target_chave: "meta_pausas",
  change_type: "update",
  proposed_payload: { valor: "valor" },
  justification: null,
  status: "rejected",
  reviewed_by: 2,
  reviewed_at: "2026-01-13T10:00:00Z",
  created_at: "2026-01-08T08:00:00Z",
  updated_at: "2026-01-13T10:00:00Z",
};

// requested_by/reviewed_by nulos: usuário que solicitou/revisou foi excluído
// (hard delete + ON DELETE SET NULL da migration 032) — não pode virar
// "Usuário #null"/"Usuário #undefined" na tela.
const pendingSolicitanteExcluido: ParameterChangeRequest = {
  id: 105,
  requested_by: null,
  target_chave: "meta_giro",
  change_type: "update",
  proposed_payload: { valor: "0.5" },
  justification: null,
  status: "pending",
  reviewed_by: null,
  reviewed_at: null,
  created_at: "2026-01-14T08:00:00Z",
  updated_at: "2026-01-14T08:00:00Z",
};

const resolvidaRevisorExcluido: ParameterChangeRequest = {
  id: 106,
  requested_by: 11,
  target_chave: "limite_desconto",
  change_type: "update",
  proposed_payload: { valor: "0.1" },
  justification: null,
  status: "approved",
  reviewed_by: null,
  reviewed_at: "2026-01-15T10:00:00Z",
  created_at: "2026-01-14T08:00:00Z",
  updated_at: "2026-01-15T10:00:00Z",
};

function expectedDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// Radix (DropdownMenu/Dialog/Select) usa Pointer Capture, que o jsdom não
// implementa — sem estes stubs abrir o Select lança TypeError no clique.
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

// As ações de linha vivem no menu "..." do `DynamicTable` do design system, que
// rotula o gatilho com a linha ("Abrir ações para <nome>"). Ancorar pela linha,
// e não por índice, mantém o teste legível.
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
    if (path.startsWith("/api/v1/parametros/change-requests?")) {
      const isPending = path.includes("statusFilter=pending");
      const rows = isPending
        ? [pendingCreate, pendingUpdate]
        : [approvedDelete, rejectedUpdate];
      return {
        rows,
        total: rows.length,
        page: 1,
        pageSize: 25,
        totalPages: 1,
      };
    }
    if (path.startsWith("/api/v1/parametros/change-requests/")) {
      return undefined;
    }
    throw new Error(`unexpected path in test: ${path}`);
  });
});

describe("ConfiguracoesParametrosPage — estado de carregamento", () => {
  it("mostra o esqueleto das duas tabelas, com rótulo acessível, antes de os dados chegarem", () => {
    // Promessa que nunca resolve: congela a tela no estado de carregando.
    apiFetchMock.mockImplementation(() => new Promise(() => {}));

    render(<ConfiguracoesParametrosPage />);

    const carregando = screen.getByRole("status");
    expect(carregando).toHaveAttribute("aria-busy", "true");
    expect(carregando).toHaveTextContent("Carregando solicitações e histórico de parâmetros...");

    // Cabeçalho da página é conteúdo conhecido: aparece de verdade, não como
    // esqueleto (é o que o `manager-route-loading` do Ara faz).
    expect(
      screen.getByRole("heading", { name: "Configurações de Parâmetros" }),
    ).toBeInTheDocument();

    // As tabelas reais só entram com os dados — o esqueleto reserva a forma,
    // não promete conteúdo.
    expect(screen.queryByText("Nome / E-mail")).not.toBeInTheDocument();
    expect(screen.queryByText("Data da Decisão")).not.toBeInTheDocument();
  });
});

describe("ConfiguracoesParametrosPage — caracterização", () => {
  it("lista as solicitações pendentes com o subtitle traduzido via CHANGE_TYPE_LABEL", async () => {
    render(<ConfiguracoesParametrosPage />);

    await waitFor(() => expect(screen.getByText("nova_margem")).toBeInTheDocument());

    // toRequestRow: subtitle = CHANGE_TYPE_LABEL[change_type]
    expect(screen.getByText("Criação de parâmetro")).toBeInTheDocument();
    expect(screen.getByText("Atualização de parâmetro")).toBeInTheDocument();
    // target_chave ausente -> cai no fallback de proposed_payload.chave
    expect(screen.getByText("nova_margem")).toBeInTheDocument();
    // target_chave presente -> usado direto
    expect(screen.getByText("tolerancia_adequacao")).toBeInTheDocument();

    // Só as PENDENTES entram nessa tabela (badge "SOLICITAÇÃO") — aprovada/
    // rejeitada vão para o histórico, mais abaixo na mesma página, então checar
    // a CONTAGEM do badge é mais preciso que checar ausência de texto.
    expect(screen.getAllByText("SOLICITAÇÃO")).toHaveLength(2);
  });

  it("a tela não carrega mais a lista de usuários — isso é de Gestão de Usuários", async () => {
    render(<ConfiguracoesParametrosPage />);

    await waitFor(() => expect(screen.getByText("nova_margem")).toBeInTheDocument());

    // O mock lança em path inesperado; um GET de usuários aqui viraria erro de
    // teste. Esta asserção deixa a intenção explícita: a página nova só fala
    // com o endpoint de change-requests.
    expect(apiFetchMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/auth\/users/),
      expect.anything(),
    );
  });

  it("toHistoryItem: solicitações não-pendentes viram o histórico, com decision/admin/notes traduzidos", async () => {
    render(<ConfiguracoesParametrosPage />);

    await waitFor(() => expect(screen.getAllByText("criterio_selecao").length).toBeGreaterThan(0));

    // approvedDelete -> decision "Aprovado", admin "Usuário #1"
    expect(screen.getByText("Aprovado")).toBeInTheDocument();
    // rejectedUpdate -> decision "Rejeitado", admin "Usuário #2", sem justification -> "Sem observações."
    expect(screen.getByText("Rejeitado")).toBeInTheDocument();
    expect(screen.getByText("Sem observações.")).toBeInTheDocument();
    expect(screen.getByText(expectedDate(approvedDelete.reviewed_at!))).toBeInTheDocument();
  });

  it("abrir uma solicitação pendente mostra o modal com os dados da requisição", async () => {
    const user = userEvent.setup();
    render(<ConfiguracoesParametrosPage />);

    await waitFor(() => expect(screen.getByText("nova_margem")).toBeInTheDocument());

    await openRowAction(user, "nova_margem", "Ver solicitação");

    expect(await screen.findByText("Precisamos de uma margem maior no inverno.")).toBeInTheDocument();
    expect(screen.getByText("Solicitação #101")).toBeInTheDocument();
  });
});

describe("ConfiguracoesParametrosPage — chamadas de API do fluxo de decidir solicitação", () => {
  it("aprovar uma solicitação pendente chama apiFetch com POST .../{id}/approve e fecha o modal", async () => {
    const user = userEvent.setup();
    render(<ConfiguracoesParametrosPage />);

    await waitFor(() => expect(screen.getByText("nova_margem")).toBeInTheDocument());
    await openRowAction(user, "nova_margem", "Ver solicitação");
    await screen.findByText("Solicitação #101");

    await user.click(screen.getByRole("button", { name: "Confirmar a aprovação" }));

    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/parametros/change-requests/101/approve", { method: "POST" })
    );
    await waitFor(() => expect(screen.queryByText("Solicitação #101")).not.toBeInTheDocument());
  });

  it("rejeitar uma solicitação pendente chama apiFetch com POST .../{id}/reject", async () => {
    const user = userEvent.setup();
    render(<ConfiguracoesParametrosPage />);

    await waitFor(() => expect(screen.getByText("nova_margem")).toBeInTheDocument());
    await openRowAction(user, "nova_margem", "Ver solicitação");
    await screen.findByText("Solicitação #101");

    await user.click(screen.getByRole("radio", { name: "Rejeitado" }));
    await user.click(screen.getByRole("button", { name: "Confirmar a reprovação" }));

    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/parametros/change-requests/101/reject", { method: "POST" })
    );
  });
});

describe("ConfiguracoesParametrosPage — 'Usuário removido' quando requested_by/reviewed_by vêm nulos", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/v1/parametros/change-requests?")) {
        const isPending = path.includes("statusFilter=pending");
        const rows = isPending
          ? [pendingSolicitanteExcluido]
          : [resolvidaRevisorExcluido];
        return { rows, total: rows.length, page: 1, pageSize: 25, totalPages: 1 };
      }
      throw new Error(`unexpected path in test: ${path}`);
    });
  });

  it("toRequestRow mostra 'Usuário removido' em vez de 'Usuário #null' quando requested_by é nulo", async () => {
    render(<ConfiguracoesParametrosPage />);

    await waitFor(() => expect(screen.getByText("meta_giro")).toBeInTheDocument());

    // Duas ocorrências nesta massa de teste: a linha de solicitação pendente
    // (requester) E a linha do histórico (admin, resolvidaRevisorExcluido).
    expect(screen.getAllByText("Usuário removido").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Usuário #null/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Usuário #undefined/)).not.toBeInTheDocument();
  });

  it("toHistoryItem mostra 'Usuário removido' no requerente e no admin quando requested_by/reviewed_by são nulos", async () => {
    render(<ConfiguracoesParametrosPage />);

    await waitFor(() => expect(screen.getAllByText("limite_desconto").length).toBeGreaterThan(0));

    // resolvidaRevisorExcluido: requested_by=11 (mostra "Usuário #11"),
    // reviewed_by=null (mostra "Usuário removido" no lugar de "—"). A mesma
    // mensagem também aparece na tabela de pendentes (pendingSolicitanteExcluido),
    // então checa ao menos uma ocorrência, não unicidade.
    expect(screen.getByText("Usuário #11")).toBeInTheDocument();
    expect(screen.getAllByText("Usuário removido").length).toBeGreaterThanOrEqual(1);
  });
});
