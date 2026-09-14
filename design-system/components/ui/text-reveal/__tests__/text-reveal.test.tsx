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
import { render } from "@testing-library/react";
import { composeStories } from "@storybook/react";

import { TextReveal } from "../text-reveal";
import * as stories from "../text-reveal.stories";

const composed = composeStories(stories);

describe("TextReveal (composeStories smoke)", () => {
  Object.entries(composed).forEach(([name, Story]) => {
    test(`renders ${name} without errors`, () => {
      const { container } = render(<Story />);
      expect(container).toBeInstanceOf(Node);
    });
  });
});

describe("TextReveal accessibility contract", () => {
  test("exposes one intact sentence while hiding the split visual words", () => {
    const { container } = render(
      <TextReveal
        segments={[{ text: "Bem-vindo à" }, { text: "System Automation." }]}
      />,
    );

    expect(
      container.querySelector('[data-slot="text-reveal-accessible"]'),
    ).toHaveTextContent("Bem-vindo à System Automation.");
    expect(
      container.querySelector('[data-slot="text-reveal-visual"]'),
    ).toHaveAttribute("aria-hidden", "true");
    expect(
      container.querySelector('[data-slot="text-reveal"]'),
    ).toHaveClass("text-foreground");
    expect(
      container.querySelector('[data-slot="text-reveal"]'),
    ).not.toHaveStyle({ opacity: "0" });
    expect(
      container.querySelector('[data-slot="text-reveal-word"] > span'),
    ).not.toHaveStyle({ opacity: "0" });
  });
});
