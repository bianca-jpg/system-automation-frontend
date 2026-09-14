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

import { IconCountBadge } from "../icon-count-badge";
import * as stories from "../icon-count-badge.stories";

const composed = composeStories(stories);

describe("IconCountBadge (composeStories smoke)", () => {
  Object.entries(composed).forEach(([name, Story]) => {
    test(`renders ${name} without errors`, () => {
      const { container } = render(<Story />);
      expect(container).toBeInstanceOf(Node);
    });
  });
});

describe("IconCountBadge dot display", () => {
  test("renders as a small blue dot without numeric text", () => {
    render(
      <IconCountBadge
        aria-label="Há mensagens não lidas"
        count={12}
        display="dot"
      />,
    );

    const badge = screen.getByLabelText("Há mensagens não lidas");

    expect(badge.textContent).toBe("");
    expect(badge.getAttribute("data-display")).toBe("dot");
    expect(badge.className).toContain("bg-info");
    expect(badge.className).toContain("text-info-foreground-strong");
    expect(badge.className).toContain("size-2.5");
    expect(badge.className).not.toContain("bg-destructive");
  });

  test("uses the accessible foreground paired with each semantic background", () => {
    const { rerender } = render(<IconCountBadge count={12} variant="info" />);

    expect(screen.getByText("12")).toHaveClass(
      "text-info-foreground-strong",
    );

    rerender(<IconCountBadge count={12} variant="destructive" />);

    expect(screen.getByText("12")).toHaveClass(
      "text-destructive-foreground-strong",
    );
  });
});
