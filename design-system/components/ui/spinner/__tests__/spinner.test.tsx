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
import { composeStories } from "@storybook/react";

import { Spinner } from "../spinner";
import * as stories from "../spinner.stories";

const composed = composeStories(stories);

describe("Spinner (composeStories smoke)", () => {
  Object.entries(composed).forEach(([name, Story]) => {
    test(`renders ${name} without errors`, () => {
      const { container } = render(<Story />);
      expect(container).toBeInstanceOf(Node);
    });
  });
});

describe("Spinner accessibility contract", () => {
  test("is decorative by default", () => {
    render(<Spinner data-testid="spinner" />);

    expect(screen.getByTestId("spinner")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("becomes an announced status when a label is provided", () => {
    render(<Spinner label="Carregando candidatos" />);

    const status = screen.getByRole("status", {
      name: "Carregando candidatos",
    });
    expect(status).not.toHaveAttribute("aria-hidden");
  });
});
