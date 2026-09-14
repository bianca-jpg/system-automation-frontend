// Ver create-parameter-modal.test: mesma cobertura para o modal de edição —
// os <select> nativos viraram o Select do design system (Radix) e a
// obrigatoriedade do Valor booleano, antes garantida pelo `required` nativo,
// agora é validação explícita antes de chamar onSubmit.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { ParameterEditDraft } from "@/entities/parametro/model/types";
import { EditParameterModal } from "./edit-parameter-modal";

// Radix (Dialog/Select) usa Pointer Capture, que o jsdom não implementa.
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

// O Dialog do Radix marca `pointer-events: none` no body enquanto está aberto.
function setupUser() {
  return userEvent.setup({ pointerEventsCheck: 0 });
}

const baseParam: ParameterEditDraft = {
  id: 7,
  nome: "Margem de adequação",
  tipo: "float",
  valor: "5",
  descricao: "Tolerância do motor",
};

function renderModal(overrides: Partial<ParameterEditDraft> = {}) {
  const onChangeParamToEdit = vi.fn();
  // Espelha o handler real da página, que chama preventDefault antes de tocar a
  // API — sem isso o jsdom tentaria submeter o formulário de verdade.
  const onSubmit = vi.fn(async (e: React.FormEvent) => {
    e.preventDefault();
  });
  render(
    <EditParameterModal
      isOpen
      onClose={vi.fn()}
      paramToEdit={{ ...baseParam, ...overrides }}
      onChangeParamToEdit={onChangeParamToEdit}
      onSubmit={onSubmit}
      isSubmitting={false}
      modalFeedback={null}
    />
  );
  return { onChangeParamToEdit, onSubmit };
}

describe("EditParameterModal — campo Tipo", () => {
  it("mostra o tipo atual no gatilho e propaga o value da opção escolhida", async () => {
    const user = setupUser();
    const { onChangeParamToEdit } = renderModal();

    const tipo = screen.getByRole("combobox", { name: "Tipo" });
    expect(tipo).toHaveTextContent("Número Decimal (Valores quebrados ou percentuais, ex: 10,5)");

    await user.click(tipo);
    await user.click(await screen.findByRole("option", { name: /Número Inteiro/ }));

    expect(onChangeParamToEdit).toHaveBeenCalledWith({ ...baseParam, tipo: "int" });
  });
});

describe("EditParameterModal — campo Valor booleano", () => {
  it("propaga o value da opção escolhida", async () => {
    const user = setupUser();
    const { onChangeParamToEdit } = renderModal({ tipo: "bool", valor: "" });

    await user.click(screen.getByRole("combobox", { name: "Valor" }));
    await user.click(await screen.findByRole("option", { name: "Não (false)" }));

    expect(onChangeParamToEdit).toHaveBeenCalledWith({ ...baseParam, tipo: "bool", valor: "false" });
  });

  it("bloqueia o envio e avisa quando nenhum valor foi escolhido", async () => {
    const user = setupUser();
    const { onSubmit } = renderModal({ tipo: "bool", valor: "" });

    await user.click(screen.getByRole("button", { name: "Salvar Alterações" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Selecione o valor (Sim ou Não).");
    expect(screen.getByRole("combobox", { name: "Valor" })).toHaveAttribute("aria-invalid", "true");
  });

  it("envia normalmente quando há valor escolhido", async () => {
    const user = setupUser();
    const { onSubmit } = renderModal({ tipo: "bool", valor: "true" });

    await user.click(screen.getByRole("button", { name: "Salvar Alterações" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
