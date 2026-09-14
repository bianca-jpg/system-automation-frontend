// Cobre a migração dos <select> nativos para o Select do design system (Radix):
// a escolha continua chegando ao callback com o mesmo value e — o ponto crítico
// — a obrigatoriedade que o `required` nativo garantia no campo Valor booleano
// virou validação explícita, já que o Radix não é um <select> e não participa da
// validação nativa do formulário.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CreateParameterModal } from "./create-parameter-modal";

// Radix (Dialog/Select) usa Pointer Capture, que o jsdom não implementa — sem
// estes stubs abrir o Select lança TypeError no clique.
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

const baseParam = { nome: "Parametro X", tipo: "string", valor: "42", descricao: "Descrição" };

function renderModal(overrides: Partial<typeof baseParam> = {}) {
  const onChangeNovoParam = vi.fn();
  // Espelha o handler real da página, que chama preventDefault antes de tocar a
  // API — sem isso o jsdom tentaria submeter o formulário de verdade.
  const onSubmit = vi.fn(async (e: React.FormEvent) => {
    e.preventDefault();
  });
  render(
    <CreateParameterModal
      isOpen
      onClose={vi.fn()}
      novoParam={{ ...baseParam, ...overrides }}
      onChangeNovoParam={onChangeNovoParam}
      onSubmit={onSubmit}
      isSubmitting={false}
      modalFeedback={null}
    />
  );
  return { onChangeNovoParam, onSubmit };
}

describe("CreateParameterModal — campo Tipo", () => {
  it("mostra o tipo atual no gatilho e propaga o value da opção escolhida", async () => {
    const user = setupUser();
    const { onChangeNovoParam } = renderModal();

    const tipo = screen.getByRole("combobox", { name: "Tipo" });
    expect(tipo).toHaveTextContent("Texto (Palavras, frases ou nomes)");

    await user.click(tipo);
    await user.click(await screen.findByRole("option", { name: /Booleano/ }));

    expect(onChangeNovoParam).toHaveBeenCalledWith({ ...baseParam, tipo: "bool" });
  });
});

describe("CreateParameterModal — campo Valor booleano", () => {
  it("propaga o value da opção escolhida", async () => {
    const user = setupUser();
    const { onChangeNovoParam } = renderModal({ tipo: "bool", valor: "" });

    await user.click(screen.getByRole("combobox", { name: "Valor Desejado" }));
    await user.click(await screen.findByRole("option", { name: "Sim (true)" }));

    expect(onChangeNovoParam).toHaveBeenCalledWith({ ...baseParam, tipo: "bool", valor: "true" });
  });

  it("bloqueia o envio e avisa quando nenhum valor foi escolhido", async () => {
    const user = setupUser();
    const { onSubmit } = renderModal({ tipo: "bool", valor: "" });

    await user.click(screen.getByRole("button", { name: "Solicitar Criação" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Selecione o valor desejado (Sim ou Não).");
    expect(screen.getByRole("combobox", { name: "Valor Desejado" })).toHaveAttribute(
      "aria-invalid",
      "true"
    );
  });

  it("envia normalmente quando há valor escolhido", async () => {
    const user = setupUser();
    const { onSubmit } = renderModal({ tipo: "bool", valor: "false" });

    await user.click(screen.getByRole("button", { name: "Solicitar Criação" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
