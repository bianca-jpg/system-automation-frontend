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

import { PageTabs, PageTabsBar } from "../page-tabs";
import * as stories from "../page-tabs.stories";

const composed = composeStories(stories);

describe("PageTabs (composeStories smoke)", () => {
  Object.entries(composed).forEach(([name, Story]) => {
    test(`renders ${name} without errors`, () => {
      const { container } = render(<Story />);
      expect(container).toBeInstanceOf(Node);
    });
  });
});

describe("PageTabsBar count chip (redesign 2026-06)", () => {
  const renderBar = (
    items: { value: string; label: string; count?: number | string | null }[],
  ) =>
    render(
      <PageTabs value={items[0]?.value ?? ""} onValueChange={() => {}}>
        <PageTabsBar items={items} />
      </PageTabs>,
    );

  test("renders the count chip when count is provided", () => {
    const { container } = renderBar([
      { value: "my", label: "Minhas vagas", count: 24 },
      { value: "all", label: "Todas", count: "99+" },
    ]);
    const chips = container.querySelectorAll(
      '[data-slot="page-tabs-trigger-count"]',
    );
    expect(chips).toHaveLength(2);
    expect(chips[0]?.textContent).toBe("24");
    expect(chips[1]?.textContent).toBe("99+");
  });

  test("uses the high-contrast semantic foreground for every count chip", () => {
    const { container } = renderBar([
      { value: "my", label: "Minhas vagas", count: 24 },
      { value: "all", label: "Todas", count: "99+" },
    ]);
    const chips = container.querySelectorAll(
      '[data-slot="page-tabs-trigger-count"]',
    );

    for (const chip of chips) {
      expect(chip).toHaveClass("bg-background/80", "text-foreground");
      expect(chip).not.toHaveClass("text-muted-foreground");
    }
  });

  test("renders no chip when count is undefined or null", () => {
    const { container } = renderBar([
      { value: "my", label: "Minhas vagas" },
      { value: "all", label: "Todas", count: null },
    ]);
    expect(
      container.querySelectorAll('[data-slot="page-tabs-trigger-count"]'),
    ).toHaveLength(0);
  });

  test("renders the chip for count zero", () => {
    const { container } = renderBar([
      { value: "shared", label: "Compartilhadas", count: 0 },
    ]);
    const chip = container.querySelector(
      '[data-slot="page-tabs-trigger-count"]',
    );
    expect(chip?.textContent).toBe("0");
  });
});
