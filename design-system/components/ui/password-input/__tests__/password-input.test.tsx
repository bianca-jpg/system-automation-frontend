// Plan 38-3 Task 2 — composeStories smoke test (FE-QUAL-10).
// One test per exported story; enumerates them automatically so new stories get
// coverage for free. Pure render smoke — interaction tests are Playwright (Plan 38-4).
//
// Assertion shape: render() returning (i.e. not throwing) is the smoke contract.
// Some stories deliberately render null (caps-lock-warning Hidden, icon-count-badge
// ZeroHidden) — those are legitimate states; `container` is always a Node, so the
// test passes when render completes. Using `expect(container).toBeInstanceOf(Node)`
// asserts the smoke happened without imposing visual content.
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react";

import { PasswordInput } from "../password-input";
import * as stories from "../password-input.stories";

const composed = composeStories(stories);

describe("PasswordInput (composeStories smoke)", () => {
  Object.entries(composed).forEach(([name, Story]) => {
    test(`renders ${name} without errors`, () => {
      const { container } = render(<Story />);
      expect(container).toBeInstanceOf(Node);
    });
  });

  test("gives the controlled story input an accessible name", () => {
    render(<composed.Controlled />);
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
  });
});

describe("PasswordInput keyboard contract", () => {
  test("includes the visibility control in the default tab order", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Senha" defaultValue="segredo" />);

    await user.tab();
    expect(screen.getByLabelText("Senha")).toHaveFocus();
    await user.tab();

    const toggle = screen.getByRole("button", { name: "Mostrar senha" });
    expect(toggle).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "text");
  });

  test("disables the visibility control with the input", () => {
    render(<PasswordInput aria-label="Senha" disabled />);

    expect(
      screen.getByRole("button", { name: "Mostrar senha" }),
    ).toBeDisabled();
  });
});
