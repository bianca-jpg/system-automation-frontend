// Rede de segurança (Fase 1, Etapa 0) — caracteriza ParameterHistoryTable.
//
// A tabela agora é o `DynamicTable` do design system. Duas coisas mudaram junto
// e estão cobertas aqui:
//  - o rodapé "Mostrando os últimos 3 registros" era hardcoded e mentia sobre a
//    quantidade; quem conta agora é a própria tabela;
//  - a rota de teclado para o detalhe deixou de ser um botão "Ver detalhes de X"
//    por linha e passou a ser o menu "..." ("Abrir ações para X" → "Ver
//    detalhes"), que é focável e navegável por setas.
//
// Nota de merge: o componente exportava `mockHistory` e o usava como default da
// prop `history`. O time removeu isso (mock data fora de componente de produção)
// e `history` passou a ser obrigatória — os casos abaixo passam dados explícitos.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { ParameterHistoryItem } from "@/entities/parametro/model/types";
import { ParameterHistoryTable } from "./parameter-history-table";

// Radix (DropdownMenu/Dialog) usa Pointer Capture, que o jsdom não implementa.
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

// O Dialog do Radix marca `pointer-events: none` no body enquanto está aberto.
function setupUser() {
  return userEvent.setup({ pointerEventsCheck: 0 });
}

const historico: ParameterHistoryItem[] = [
  {
    id: 1,
    date: "01/01/2026",
    parameter: "percentual_adequacao",
    requester: "Usuário #7",
    decision: "Aprovado",
    admin: "Usuário #1",
    notes: "Ajuste solicitado pelo comercial.",
  },
  {
    id: 2,
    date: "02/01/2026",
    parameter: "janela_edicao_horas",
    requester: "Usuário #9",
    decision: "Rejeitado",
    admin: "Usuário #1",
    notes: "Fora da política vigente.",
  },
];

/** Conteúdo da coluna "Parâmetro Afetado", na ordem em que está no DOM. */
function parametrosNaOrdem(): string[] {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((linha) => within(linha).getAllByRole("cell")[1]?.textContent?.trim() ?? "");
}

describe("ParameterHistoryTable — caracterização", () => {
  it("o rodapé conta os registros realmente renderizados", () => {
    render(<ParameterHistoryTable history={[historico[0]!]} />);
    expect(screen.getByText("Mostrando 1 registro")).toBeInTheDocument();
  });

  it("renderiza uma linha por item de history", () => {
    render(<ParameterHistoryTable history={historico} />);
    for (const item of historico) {
      expect(screen.getByText(item.parameter)).toBeInTheDocument();
    }
  });

  it("sem histórico, mostra o estado vazio da tabela", () => {
    render(<ParameterHistoryTable history={[]} />);
    expect(screen.getByText("Nenhuma decisão de parâmetro registrada")).toBeInTheDocument();
  });

  it("clicar numa linha abre o HistoryDetailsModal com os dados daquela linha", async () => {
    const user = setupUser();
    render(<ParameterHistoryTable history={historico} />);

    await user.click(screen.getByText(historico[0]!.parameter));

    expect(await screen.findByText("Detalhes do Registro Histórico")).toBeInTheDocument();
    // A linha da tabela continua atrás do modal (não desmonta), então as notas
    // aparecem 2x na página: no <span title> truncado da linha e no <p> do modal.
    expect(screen.getAllByText(historico[0]!.notes)).toHaveLength(2);
  });

  // O clique na <tr> é atalho de mouse. A rota de teclado é o menu de ações do
  // DynamicTable — sem ela o histórico ficaria inalcançável sem mouse.
  it("cada linha tem um gatilho focável que abre o detalhe pelo teclado", async () => {
    const user = setupUser();
    render(<ParameterHistoryTable history={historico} />);

    const gatilho = screen.getByRole("button", {
      name: `Abrir ações para ${historico[1]!.parameter}`,
    });

    gatilho.focus();
    expect(gatilho).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(await screen.findByRole("menuitem", { name: "Ver detalhes" })).toBeInTheDocument();
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Detalhes do Registro Histórico")).toBeInTheDocument();
    expect(screen.getAllByText(historico[1]!.notes)).toHaveLength(2);
  });

  // O badge migrou para o <Badge> do design system: as classes de paleta crua
  // (green-*/red-*) foram trocadas pelas famílias semânticas success/destructive,
  // que resolvem claro e escuro.
  it("badge de decisão usa ícone/cor diferente para Aprovado vs Rejeitado", () => {
    render(<ParameterHistoryTable history={historico} />);
    expect(screen.getByText("Aprovado").className).toMatch(/success/);
    expect(screen.getByText("Rejeitado").className).toMatch(/destructive/);
  });
});

describe("ParameterHistoryTable — ordenação e busca", () => {
  it("ordena a coluna Data cronologicamente, não pelo texto formatado", async () => {
    const user = setupUser();
    const janeiro: ParameterHistoryItem = { ...historico[0]!, id: 31, parameter: "param_janeiro", date: "31/01/2026" };
    const fevereiro: ParameterHistoryItem = { ...historico[1]!, id: 2, parameter: "param_fevereiro", date: "01/02/2026" };

    render(<ParameterHistoryTable history={[fevereiro, janeiro]} />);

    await user.click(screen.getByRole("button", { name: "Data da Decisão" }));

    // Ordenar o texto exibido colocaria "01/02/2026" antes de "31/01/2026".
    expect(parametrosNaOrdem()).toEqual(["param_janeiro", "param_fevereiro"]);
  });

  it("clicar em 'Parâmetro Afetado' alterna entre crescente e decrescente", async () => {
    const user = setupUser();
    render(<ParameterHistoryTable history={historico} />);

    const cabecalho = screen.getByRole("button", { name: "Parâmetro Afetado" });

    await user.click(cabecalho);
    expect(parametrosNaOrdem()).toEqual(["janela_edicao_horas", "percentual_adequacao"]);

    await user.click(cabecalho);
    expect(parametrosNaOrdem()).toEqual(["percentual_adequacao", "janela_edicao_horas"]);
  });

  it("Observações não é ordenável — texto livre não responde nenhuma pergunta ordenado", () => {
    render(<ParameterHistoryTable history={historico} />);
    expect(screen.queryByRole("button", { name: "Observações" })).not.toBeInTheDocument();
    expect(screen.getByText("Observações")).toBeInTheDocument();
  });

  it("a busca filtra por parâmetro, solicitante ou observação", async () => {
    const user = setupUser();
    render(<ParameterHistoryTable history={historico} />);

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar no histórico de parâmetros" }),
      "política",
    );

    expect(parametrosNaOrdem()).toEqual(["janela_edicao_horas"]);
  });
});
