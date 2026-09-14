// Rede de segurança (Fase 1, Etapa 0) — caracteriza UserManagementTable,
// incluindo o tipo UserTableRow fundido (kind: "request" | "user") que a
// Etapa 3 desta fase vai separar.
//
// A tabela agora é o `DynamicTable` do design system: a coluna "Ações" e o menu
// "..." vêm dele (gatilho rotulado "Abrir ações para <linha>"), assim como a
// busca, o contador de registros e a ordenação por clique no cabeçalho. Os
// testes de interação acompanham esse DOM; o que eles guardam — quem vê qual
// ação, o que abre a solicitação, e o modal de troca de papel — não mudou.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { UserManagementTable, type UserTableRow } from "./user-management-table";

// Radix (DropdownMenu/Dialog/Select) usa Pointer Capture, que o jsdom não
// implementa — sem estes stubs abrir o Select lança TypeError no clique.
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

// O Dialog do Radix marca `pointer-events: none` no body enquanto está aberto;
// o userEvent recusaria qualquer clique dentro do modal por causa disso.
function setupUser() {
  return userEvent.setup({ pointerEventsCheck: 0 });
}

const requestRow: UserTableRow = {
  kind: "request",
  id: "param-1",
  parameterRequestId: 1,
  title: "tolerancia_adequacao",
  subtitle: "Atualização de parâmetro",
  requester: "Usuário #5",
  date: "01/01/2026",
};

const userRowConfirmed: UserTableRow = {
  kind: "user",
  id: 10,
  title: "gestor@example.com",
  roles: ["gestor"],
  confirmedAt: "2026-01-01T00:00:00Z",
};

const userRowUnconfirmed: UserTableRow = {
  kind: "user",
  id: 11,
  title: "novo@example.com",
  roles: [],
  confirmedAt: null,
};

const userRowLegacyRole: UserTableRow = {
  kind: "user",
  id: 12,
  title: "legado@example.com",
  roles: ["hype_user"],
  confirmedAt: "2026-01-01T00:00:00Z",
};

/** Abre o menu "..." da linha indicada e clica no item pedido. */
async function openRowAction(
  user: ReturnType<typeof setupUser>,
  rowLabel: string,
  itemName: string,
) {
  await user.click(screen.getByRole("button", { name: `Abrir ações para ${rowLabel}` }));
  await user.click(await screen.findByRole("menuitem", { name: itemName }));
}

/**
 * Conteúdo da primeira coluna, na ordem em que as linhas estão no DOM — é o que
 * revela o efeito de ordenar. Linhas de espaçamento do virtualizador são
 * `aria-hidden` e ficam fora de `getAllByRole`; a primeira linha é o cabeçalho.
 */
function nomesNaOrdem(): string[] {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((linha) => within(linha).getAllByRole("cell")[0]?.textContent?.trim() ?? "");
}

describe("UserManagementTable — caracterização", () => {
  it("renderiza linhas de solicitação com badge SOLICITAÇÃO e o subtitle/requester/date", () => {
    render(<UserManagementTable rows={[requestRow]} />);
    expect(screen.getByText("tolerancia_adequacao")).toBeInTheDocument();
    expect(screen.getByText("Atualização de parâmetro")).toBeInTheDocument();
    expect(screen.getByText("SOLICITAÇÃO")).toBeInTheDocument();
    expect(screen.getByText("Usuário #5")).toBeInTheDocument();
    expect(screen.getByText("01/01/2026")).toBeInTheDocument();
  });

  it("renderiza linhas de usuário com papéis, ou 'Sem papel atribuído' quando vazio", () => {
    render(<UserManagementTable rows={[userRowConfirmed, userRowUnconfirmed]} />);
    // "gestor" agora aparece uma única vez: a lista de papéis atribuíveis saiu
    // da célula (era um <option> por papel em cada linha) e só existe dentro do
    // modal de troca de papel, que começa fechado.
    expect(screen.getByText("gestor")).toBeInTheDocument();
    expect(screen.getByText("Sem papel atribuído")).toBeInTheDocument();
    expect(screen.getByText("CONFIRMADO")).toBeInTheDocument();
    expect(screen.getByText("AGUARDANDO CONFIRMAÇÃO")).toBeInTheDocument();
  });

  it("cada linha expõe o menu de ações '...' com a ação do seu tipo", async () => {
    const user = setupUser();
    render(<UserManagementTable rows={[requestRow, userRowConfirmed]} />);

    const triggers = screen.getAllByRole("button", { name: /^Abrir ações para/ });
    expect(triggers).toHaveLength(2);

    await user.click(
      screen.getByRole("button", { name: "Abrir ações para tolerancia_adequacao" }),
    );
    expect(await screen.findByRole("menuitem", { name: "Ver solicitação" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Alterar papel" })).not.toBeInTheDocument();

    await user.keyboard("{Escape}");

    await user.click(
      screen.getByRole("button", { name: "Abrir ações para gestor@example.com" }),
    );
    expect(await screen.findByRole("menuitem", { name: "Alterar papel" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Ver solicitação" })).not.toBeInTheDocument();
  });

  it("o modal oferece o papel legado quando o papel atual não está em automation_ROLES", async () => {
    const user = setupUser();
    render(<UserManagementTable rows={[userRowLegacyRole]} onChangeRole={vi.fn()} />);

    await openRowAction(user, "legado@example.com", "Alterar papel");

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("legado@example.com")).toBeInTheDocument();

    // O papel legado atual já vem selecionado — o modal não pode abrir vazio e
    // fazer parecer que o usuário está sem papel.
    const combobox = within(dialog).getByRole("combobox", { name: "Novo papel" });
    expect(combobox).toHaveTextContent("hype_user");

    await user.click(combobox);

    expect(await screen.findByRole("option", { name: "hype_user" })).toBeInTheDocument();
    // papel legado + as 5 opções padrão
    expect(screen.getAllByRole("option")).toHaveLength(6);
  });

  // O clique na LINHA foi removido de propósito: o DynamicTable liga a
  // interatividade por tabela, não por linha, e esta mistura solicitações com
  // usuários — toda linha de usuário virava parada de tabulação anunciando
  // "Abrir registro <e-mail>" para uma ação inexistente. A solicitação continua
  // alcançável pelo item do menu, que é focável e corretamente rotulado.
  it("'Ver solicitação' abre a solicitação, e a linha em si não é clicável", async () => {
    const user = setupUser();
    const onSelect = vi.fn();
    render(<UserManagementTable rows={[requestRow]} onSelectParameterRequest={onSelect} />);

    await user.click(screen.getByText("tolerancia_adequacao"));
    expect(onSelect).not.toHaveBeenCalled();

    await openRowAction(user, "tolerancia_adequacao", "Ver solicitação");
    expect(onSelect).toHaveBeenCalledWith(1);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("clicar numa linha de usuário não abre solicitação nenhuma", async () => {
    const user = setupUser();
    const onSelect = vi.fn();
    render(
      <UserManagementTable
        rows={[requestRow, userRowConfirmed]}
        onSelectParameterRequest={onSelect}
      />,
    );

    await user.click(screen.getByText("gestor@example.com"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("trocar o papel pelo modal chama onChangeRole com o id do usuário e o novo papel", async () => {
    const user = setupUser();
    const onChangeRole = vi.fn();
    render(<UserManagementTable rows={[userRowConfirmed]} onChangeRole={onChangeRole} />);

    await openRowAction(user, "gestor@example.com", "Alterar papel");

    const dialog = await screen.findByRole("dialog");
    // O papel atual fica visível antes de qualquer escolha — no resumo e como
    // valor inicial do seletor.
    expect(within(dialog).getByText("Papel atual")).toBeInTheDocument();
    expect(within(dialog).getByRole("combobox", { name: "Novo papel" })).toHaveTextContent("gestor");

    await user.click(within(dialog).getByRole("combobox", { name: "Novo papel" }));
    await user.click(await screen.findByRole("option", { name: "administrador" }));

    // Escolher no seletor ainda não grava nada — só o Confirmar grava.
    expect(onChangeRole).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    expect(onChangeRole).toHaveBeenCalledWith(10, "administrador");
    expect(onChangeRole).toHaveBeenCalledTimes(1);
  });

  it("cancelar o modal não chama onChangeRole, mesmo com um papel já escolhido", async () => {
    const user = setupUser();
    const onChangeRole = vi.fn();
    render(<UserManagementTable rows={[userRowConfirmed]} onChangeRole={onChangeRole} />);

    await openRowAction(user, "gestor@example.com", "Alterar papel");

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("combobox", { name: "Novo papel" }));
    await user.click(await screen.findByRole("option", { name: "administrador" }));

    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(onChangeRole).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("reabrir o modal descarta a escolha abandonada no cancelamento anterior", async () => {
    const user = setupUser();
    const onChangeRole = vi.fn();
    render(<UserManagementTable rows={[userRowConfirmed]} onChangeRole={onChangeRole} />);

    await openRowAction(user, "gestor@example.com", "Alterar papel");
    let dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("combobox", { name: "Novo papel" }));
    await user.click(await screen.findByRole("option", { name: "administrador" }));
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await openRowAction(user, "gestor@example.com", "Alterar papel");
    dialog = await screen.findByRole("dialog");
    // Voltou para o papel atual: Confirmar fica inerte até haver mudança real,
    // exatamente como o <select> nativo, que só emitia onChange ao mudar.
    expect(within(dialog).getByRole("button", { name: "Confirmar" })).toBeDisabled();
    expect(onChangeRole).not.toHaveBeenCalled();
  });

  it("'Excluir acesso' abre uma janela de confirmação separada, sem chamar onDeleteUser ainda", async () => {
    const user = setupUser();
    const onDeleteUser = vi.fn();
    render(
      <UserManagementTable
        rows={[userRowConfirmed]}
        onChangeRole={vi.fn()}
        onDeleteUser={onDeleteUser}
      />,
    );

    await openRowAction(user, "gestor@example.com", "Alterar papel");
    const dialog = await screen.findByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "Excluir acesso" }));

    expect(onDeleteUser).not.toHaveBeenCalled();
    // A confirmação vira uma segunda janela (role="alertdialog"), não um
    // segundo estado do mesmo botão — o "Alterar papel" original continua
    // aberto por baixo.
    const alertDialog = await screen.findByRole("alertdialog");
    expect(
      within(alertDialog).getByRole("heading", { name: "Excluir acesso" }),
    ).toBeInTheDocument();
    // O "Alterar papel" continua no DOM por baixo — Radix marca o layer
    // anterior aria-hidden enquanto o alertdialog está aberto, então a
    // checagem é presença no documento, não `getByRole` (que respeita
    // aria-hidden por padrão).
    expect(dialog).toBeInTheDocument();
  });

  it("confirmar na janela de exclusão chama onDeleteUser com o id certo e fecha as duas janelas", async () => {
    const user = setupUser();
    const onDeleteUser = vi.fn();
    render(
      <UserManagementTable
        rows={[userRowConfirmed]}
        onChangeRole={vi.fn()}
        onDeleteUser={onDeleteUser}
      />,
    );

    await openRowAction(user, "gestor@example.com", "Alterar papel");
    const dialog = await screen.findByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "Excluir acesso" }));
    const alertDialog = await screen.findByRole("alertdialog");
    await user.click(within(alertDialog).getByRole("button", { name: "Confirmar exclusão" }));

    expect(onDeleteUser).toHaveBeenCalledWith(10);
    expect(onDeleteUser).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Cancelar na janela de exclusão fecha só ela, sem chamar onDeleteUser; o modal de papel continua aberto", async () => {
    const user = setupUser();
    const onDeleteUser = vi.fn();
    render(
      <UserManagementTable
        rows={[userRowConfirmed]}
        onChangeRole={vi.fn()}
        onDeleteUser={onDeleteUser}
      />,
    );

    await openRowAction(user, "gestor@example.com", "Alterar papel");
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Excluir acesso" }));
    const alertDialog = await screen.findByRole("alertdialog");
    await user.click(within(alertDialog).getByRole("button", { name: "Cancelar" }));

    expect(onDeleteUser).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    // A janela de confirmação some, mas o "Alterar papel" que a abriu continua
    // aberto — cancelar a exclusão não deve fechar o fluxo inteiro.
    expect(dialog).toBeInTheDocument();

    // Reabrir o mesmo usuário depois de fechar o modal também não deve herdar
    // a janela de exclusão aberta.
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await openRowAction(user, "gestor@example.com", "Alterar papel");
    const reopened = await screen.findByRole("dialog");
    expect(
      within(reopened).getByRole("button", { name: "Excluir acesso" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("sem onDeleteUser, o botão de exclusão não aparece no rodapé do modal", async () => {
    const user = setupUser();
    render(<UserManagementTable rows={[userRowConfirmed]} onChangeRole={vi.fn()} />);

    await openRowAction(user, "gestor@example.com", "Alterar papel");
    const dialog = await screen.findByRole("dialog");

    expect(
      within(dialog).queryByRole("button", { name: "Excluir acesso" }),
    ).not.toBeInTheDocument();
  });

  it("desabilita 'Alterar papel' quando a tabela não recebe onChangeRole", async () => {
    const user = setupUser();
    render(<UserManagementTable rows={[userRowConfirmed]} />);

    await user.click(
      screen.getByRole("button", { name: "Abrir ações para gestor@example.com" }),
    );
    expect(await screen.findByRole("menuitem", { name: "Alterar papel" })).toHaveAttribute(
      "data-disabled",
    );
  });

  it("desabilita 'Ver solicitação' quando a tabela não recebe onSelectParameterRequest", async () => {
    const user = setupUser();
    render(<UserManagementTable rows={[requestRow]} />);

    await user.click(
      screen.getByRole("button", { name: "Abrir ações para tolerancia_adequacao" }),
    );
    expect(await screen.findByRole("menuitem", { name: "Ver solicitação" })).toHaveAttribute(
      "data-disabled",
    );
  });

  it("o rodapé conta os registros realmente renderizados", () => {
    render(<UserManagementTable rows={[requestRow, userRowConfirmed, userRowUnconfirmed]} />);
    expect(screen.getByText("Mostrando 3 registros")).toBeInTheDocument();
  });

  it("sem linhas, mostra o estado vazio da tabela", () => {
    render(<UserManagementTable rows={[]} />);
    expect(screen.getByText("Nenhum usuário ou solicitação encontrado")).toBeInTheDocument();
  });
});

describe("UserManagementTable — ordenação pelo cabeçalho", () => {
  it("clicar em 'Nome / E-mail' alterna entre crescente e decrescente", async () => {
    const user = setupUser();
    render(
      <UserManagementTable rows={[requestRow, userRowConfirmed, userRowUnconfirmed]} />,
    );

    const cabecalho = screen.getByRole("button", { name: "Nome / E-mail" });

    await user.click(cabecalho);
    expect(nomesNaOrdem()).toEqual([
      "gestor@example.com",
      "novo@example.com",
      "tolerancia_adequacaoAtualização de parâmetro",
    ]);

    await user.click(cabecalho);
    expect(nomesNaOrdem()).toEqual([
      "tolerancia_adequacaoAtualização de parâmetro",
      "novo@example.com",
      "gestor@example.com",
    ]);
  });

  it("ordena a coluna Data cronologicamente, não pelo texto formatado", async () => {
    const user = setupUser();
    const janeiro: UserTableRow = { ...requestRow, id: "param-31", parameterRequestId: 31, title: "param_janeiro", date: "31/01/2026" };
    const fevereiro: UserTableRow = { ...requestRow, id: "param-2", parameterRequestId: 2, title: "param_fevereiro", date: "01/02/2026" };

    render(<UserManagementTable rows={[fevereiro, janeiro]} />);

    await user.click(screen.getByRole("button", { name: "Data" }));

    // Ordenar o texto exibido colocaria "01/02/2026" antes de "31/01/2026".
    expect(nomesNaOrdem()).toEqual([
      "param_janeiroAtualização de parâmetro",
      "param_fevereiroAtualização de parâmetro",
    ]);
  });

  it("a busca filtra por nome, papel e solicitante", async () => {
    const user = setupUser();
    render(
      <UserManagementTable rows={[requestRow, userRowConfirmed, userRowUnconfirmed]} />,
    );

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar usuários e solicitações" }),
      "gestor",
    );

    expect(nomesNaOrdem()).toEqual(["gestor@example.com"]);
  });
});
