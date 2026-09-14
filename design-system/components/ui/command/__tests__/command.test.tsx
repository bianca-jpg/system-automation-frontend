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

import * as stories from "../command.stories";

const composed = composeStories(stories);

describe("Command (composeStories smoke)", () => {
  Object.entries(composed).forEach(([name, Story]) => {
    test(`renders ${name} without errors`, () => {
      const { container } = render(<Story />);
      expect(container).toBeInstanceOf(Node);
    });
  });

  test("keeps listbox children within the allowed ARIA roles", () => {
    const { container } = render(<composed.Default />);

    expect(
      container.querySelector('[data-slot="command-separator"]'),
    ).toHaveAttribute("role", "presentation");
  });

  test("represents the empty state as a disabled listbox option", () => {
    render(<composed.Empty />);

    expect(
      screen.getByRole("option", { name: "No results found." }),
    ).toHaveAttribute("aria-disabled", "true");
  });
});
