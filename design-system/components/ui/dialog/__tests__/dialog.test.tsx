// Plan 38-3 Task 2 — composeStories smoke test (FE-QUAL-10).
// One test per exported story; enumerates them automatically so new stories get
// coverage for free. Pure render smoke — interaction tests are Playwright (Plan 38-4).
//
// Assertion shape: render() returning (i.e. not throwing) is the smoke contract.
// Some stories deliberately render null (caps-lock-warning Hidden, icon-count-badge
// ZeroHidden) — those are legitimate states; `container` is always a Node, so the
// test passes when render completes. Using `expect(container).toBeInstanceOf(Node)`
// asserts the smoke happened without imposing visual content.
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "../../alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../dialog";
import * as stories from "../dialog.stories";

const composed = composeStories(stories);

describe("Dialog (composeStories smoke)", () => {
  Object.entries(composed).forEach(([name, Story]) => {
    test(`renders ${name} without errors`, () => {
      const { container } = render(<Story />);
      expect(container).toBeInstanceOf(Node);
    });
  });
});

function DialogFromDropdownHarness({
  onNavigate,
}: {
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button type="button">Menu do usuario</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => setOpen(true)}>
            Configuracoes
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Configuracoes</DialogTitle>
          <DialogDescription>Preferencias da conta.</DialogDescription>
        </DialogContent>
      </Dialog>

      <button type="button" onClick={onNavigate}>
        Continuar navegando
      </button>
    </>
  );
}

describe("Dialog aberto por DropdownMenu", () => {
  test("libera a pagina depois que o dialogo e fechado", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<DialogFromDropdownHarness onNavigate={onNavigate} />);

    await user.click(screen.getByRole("button", { name: "Menu do usuario" }));
    await user.click(screen.getByRole("menuitem", { name: "Configuracoes" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fechar" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    expect(document.body.style.pointerEvents).not.toBe("none");
    await user.click(
      screen.getByRole("button", { name: "Continuar navegando" }),
    );
    expect(onNavigate).toHaveBeenCalledOnce();
  });
});

function NestedConfirmationHarness({
  onContinue,
}: {
  onContinue: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(true);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogTitle>Detalhes</DialogTitle>
          <DialogDescription>Revise as informações.</DialogDescription>
          <button type="button" onClick={() => setConfirmationOpen(true)}>
            Abrir confirmação
          </button>
          <button type="button" onClick={onContinue}>
            Continuar no diálogo
          </button>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Confirmar alteração</AlertDialogTitle>
          <AlertDialogDescription>
            Confirme para atualizar o registro.
          </AlertDialogDescription>
          <AlertDialogAction>Confirmar</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

describe("AlertDialog sobre Dialog", () => {
  test("devolve a interação ao dialogo inferior depois da confirmação", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<NestedConfirmationHarness onContinue={onContinue} />);

    await user.click(
      screen.getByRole("button", { name: "Abrir confirmação" }),
    );
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("alertdialog", { name: "Confirmar alteração" }),
      ).not.toBeInTheDocument(),
    );
    await user.click(
      screen.getByRole("button", { name: "Continuar no diálogo" }),
    );
    expect(onContinue).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Fechar" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(document.body.style.pointerEvents).not.toBe("none");
  });
});
