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

import * as stories from "../radial-chart.stories";
import RadialChart from "..";

const composed = composeStories(stories);

describe("RadialChart (composeStories smoke)", () => {
  Object.entries(composed).forEach(([name, Story]) => {
    test(`renders ${name} without errors`, () => {
      const { container } = render(<Story />);
      expect(container).toBeInstanceOf(Node);
    });
  });
});

describe("RadialChart default label boundaries", () => {
  // O label default nunca pode implicar anel vazio/cheio que o dado não
  // sustenta: sub-max nunca vira "100%", não-zero nunca vira "0%" — inclusive
  // nos casos em que toFixed(1) re-arredondaria (99.96 → "100.0").
  test.each([
    [99.96, "99.9%"],
    [99.7, "99.7%"],
    [0.04, "0.1%"],
    [0.3, "0.3%"],
    [100, "100%"],
    [0, "0%"],
    [75, "75%"],
  ])("value=%s renders %s", (value, expected) => {
    const { getByText } = render(<RadialChart value={value} max={100} />);
    expect(getByText(expected)).toBeTruthy();
  });
});

describe("RadialChart accessibility contract", () => {
  test("exposes its normalized value even when the visual label is hidden", () => {
    render(
      <RadialChart
        value={12}
        max={20}
        showLabel={false}
        ariaLabel="Compatibilidade cultural"
      />,
    );

    const chart = screen.getByRole("progressbar", {
      name: "Compatibilidade cultural",
    });
    expect(chart).toHaveAttribute("aria-valuemin", "0");
    expect(chart).toHaveAttribute("aria-valuemax", "20");
    expect(chart).toHaveAttribute("aria-valuenow", "12");
    expect(chart).toHaveAttribute("aria-valuetext", "60%");
  });
});
