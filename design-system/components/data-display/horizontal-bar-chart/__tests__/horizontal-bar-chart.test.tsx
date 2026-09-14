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
import { act, render, screen } from "@testing-library/react";
import { composeStories } from "@storybook/react";

import * as stories from "../horizontal-bar-chart.stories";
import { HorizontalBarChart } from "../horizontal-bar-chart";

const composed = composeStories(stories);

describe("HorizontalBarChart (composeStories smoke)", () => {
  Object.entries(composed).forEach(([name, Story]) => {
    test(`renders ${name} without errors`, () => {
      const { container } = render(<Story />);
      expect(container).toBeInstanceOf(Node);
    });
  });

  test("maps legacy color names to semantic chart tokens", () => {
    const { container } = render(
      <composed.Default
        data={[
          { name: "Primary", value: 75, color: "blue" },
          { name: "Success", value: 50, color: "emerald" },
        ]}
      />,
    );
    const bars = container.querySelectorAll(
      '[data-slot="horizontal-bar-chart-bar"]',
    );

    expect(bars[0]).toHaveStyle({
      backgroundColor: "var(--analytics-chart-primary)",
    });
    expect(bars[1]).toHaveStyle({
      backgroundColor: "var(--analytics-chart-success)",
    });
  });

  test("exposes clamped finite values as progressbars", () => {
    render(
      <HorizontalBarChart
        data={[
          { name: "Below", value: -10 },
          { name: "Above", value: 150 },
          { name: "Invalid", value: Number.NaN },
          { name: "Infinite", value: Number.POSITIVE_INFINITY },
        ]}
      />,
    );

    expect(
      screen.getByRole("progressbar", { name: "Below: 0.0%" }),
    ).toHaveAttribute("aria-valuenow", "0");
    expect(
      screen.getByRole("progressbar", { name: "Above: 100.0%" }),
    ).toHaveAttribute("aria-valuenow", "100");
    expect(
      screen.getByRole("progressbar", { name: "Invalid: 0.0%" }),
    ).toHaveStyle({ width: "0%" });
    expect(
      screen.getByRole("progressbar", { name: "Infinite: 0.0%" }),
    ).toHaveStyle({ width: "0%" });
  });

  test("uses a focusable contextual trigger for tooltip details", async () => {
    render(
      <HorizontalBarChart
        data={[
          {
            name: "Engineering",
            value: 78,
            tooltip: {
              title: "Engineering detail",
              description: "Tooltip reached from the keyboard.",
            },
          },
        ]}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "Mais informações sobre Engineering",
    });
    act(() => trigger.focus());
    expect(trigger).toHaveFocus();
    expect(
      (await screen.findAllByText("Tooltip reached from the keyboard.")).length,
    ).toBeGreaterThan(0);
  });
});
