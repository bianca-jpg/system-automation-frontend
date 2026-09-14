// Regression guard for AlertDialogFooter + slotted ActionButton roots.
//
// AlertDialogAction/Cancel render ActionButton with asChild. The final DOM node
// keeps the Radix data-slot, so the footer must reset those slots explicitly or
// ActionButton's default full width makes cancel/confirm buttons stretch on
// desktop.
import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "../alert-dialog";

describe("AlertDialogFooter — width reset for slotted actions", () => {
  test("targets alert-dialog action and cancel slots in its className", () => {
    const { container } = render(<AlertDialogFooter />);
    const footer = container.querySelector('[data-slot="alert-dialog-footer"]');

    expect(footer).not.toBeNull();
    const className = footer?.getAttribute("class") ?? "";

    expect(className).toMatch(/data-slot=alert-dialog-action/);
    expect(className).toMatch(/data-slot=alert-dialog-cancel/);
    expect(className).toMatch(/sm:.*w-auto/);
  });

  test("Action and Cancel render as alert-dialog slots", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Excluir conta</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação remove a conta permanentemente.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );

    const footer = document.body.querySelector(
      '[data-slot="alert-dialog-footer"]',
    );
    expect(footer).not.toBeNull();
    expect(
      footer?.querySelector(':scope > [data-slot="alert-dialog-cancel"]'),
    ).not.toBeNull();
    expect(
      footer?.querySelector(':scope > [data-slot="alert-dialog-action"]'),
    ).not.toBeNull();
  });
});
