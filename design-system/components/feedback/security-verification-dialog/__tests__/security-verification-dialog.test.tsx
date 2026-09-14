import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SecurityVerificationDialog } from "../security-verification-dialog";

describe("SecurityVerificationDialog", () => {
  it("renders the shared verification hierarchy and content", () => {
    render(
      <SecurityVerificationDialog open onOpenChange={vi.fn()}>
        <div>Desafio do provedor</div>
      </SecurityVerificationDialog>,
    );

    expect(
      screen.getByRole("dialog", { name: "Verificação de segurança" }),
    ).toBeVisible();
    expect(
      screen.getByText("Confirme que você é humano para continuar."),
    ).toBeVisible();
    expect(screen.getByText("Desafio do provedor")).toBeVisible();
    expect(screen.getByRole("button", { name: "Fechar" })).toBeVisible();
  });

  it("keeps a required verification open without a close affordance", () => {
    const onOpenChange = vi.fn();
    render(
      <SecurityVerificationDialog
        open
        dismissible={false}
        onOpenChange={onOpenChange}
      >
        <div>Desafio obrigatório</div>
      </SecurityVerificationDialog>,
    );

    const dialog = screen.getByRole("dialog", {
      name: "Verificação de segurança",
    });
    expect(screen.queryByRole("button", { name: "Fechar" })).toBeNull();

    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(dialog).toBeVisible();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
