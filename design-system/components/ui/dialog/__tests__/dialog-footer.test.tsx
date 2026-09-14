// Regression guard for the DialogFooter + ActionButton interaction.
//
// ActionButton emits `data-slot="action-button"` (not `data-slot="button"`)
// and defaults to `width: full`. DialogFooter must reset that width on
// desktop so cancel/save buttons line up on the right at auto width.
// Without the action-button reset the primary button stretches to full
// width and the secondary button gets squeezed out of view.
import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";

import { DialogFooter } from "../dialog";
import { ActionButton } from "../../action-button";

describe("DialogFooter — width reset for ActionButton", () => {
  test("renders both data-slot targets in its className", () => {
    const { container } = render(<DialogFooter />);
    const footer = container.querySelector('[data-slot="dialog-footer"]');

    expect(footer).not.toBeNull();
    const className = footer?.getAttribute("class") ?? "";

    // The selector must target ActionButton's data-slot too, otherwise
    // ActionButton's default `w-full` wins and the layout breaks.
    expect(className).toMatch(/data-slot=action-button/);
    expect(className).toMatch(/data-slot=button/);
    expect(className).toMatch(/sm:.*w-auto/);
  });

  test("ActionButton children render with data-slot=action-button", () => {
    const { container } = render(
      <DialogFooter>
        <ActionButton variant="secondary">Fechar</ActionButton>
        <ActionButton variant="primary">Salvar</ActionButton>
      </DialogFooter>,
    );

    const footer = container.querySelector('[data-slot="dialog-footer"]');
    expect(footer).not.toBeNull();

    const actionSlots = footer?.querySelectorAll(
      ':scope > [data-slot="action-button"]',
    );
    expect(actionSlots?.length).toBe(2);
  });
});
