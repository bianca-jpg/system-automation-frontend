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

import { Badge } from "../badge";
import { badgeToneClassNames, badgeVariants } from "../variants";
import * as stories from "../badge.stories";

const composed = composeStories(stories);

describe("Badge (composeStories smoke)", () => {
  Object.entries(composed).forEach(([name, Story]) => {
    test(`renders ${name} without errors`, () => {
      const { container } = render(<Story />);
      expect(container).toBeInstanceOf(Node);
    });
  });
});

describe("Badge dot + size label (redesign 2026-06)", () => {
  test("dot renders an aria-hidden bg-current indicator before the text", () => {
    const { container } = render(
      <Badge size="label" variant="success" dot>
        Aprovada
      </Badge>,
    );
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge).not.toBeNull();
    const dot = badge?.querySelector('span[aria-hidden="true"]');
    expect(dot).not.toBeNull();
    expect(dot?.className).toContain("bg-current");
    expect(badge?.textContent).toBe("Aprovada");
  });

  test("without dot no indicator span is rendered", () => {
    const { container } = render(<Badge size="label">Categoria</Badge>);
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.querySelector('span[aria-hidden="true"]')).toBeNull();
  });

  test("size label uses normal-case and no forced min-width", () => {
    const { container } = render(<Badge size="label">Em análise</Badge>);
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.className).toContain("normal-case");
    expect(badge?.className).not.toContain("min-w-[5.5rem]");
    expect(badge?.className).not.toContain("min-w-[6rem]");
  });

  test("asChild ignores dot and keeps the single child intact", () => {
    const { container } = render(
      <Badge asChild variant="info" dot>
        <a href="#vaga">Linked</a>
      </Badge>,
    );
    const anchor = container.querySelector('a[data-slot="badge"]');
    expect(anchor).not.toBeNull();
    expect(anchor?.querySelector('span[aria-hidden="true"]')).toBeNull();
    expect(anchor?.textContent).toBe("Linked");
  });
});

describe("Badge semantic contrast contract", () => {
  test.each([
    ["success", "text-success-text"],
    ["warning", "text-warning-text"],
    ["destructive", "text-destructive-text"],
    ["info", "text-info-text"],
  ] as const)(
    "%s uses its subtle-surface text token",
    (variant, tokenClass) => {
      expect(badgeToneClassNames[variant]).toContain(tokenClass);
    },
  );

  test("uses the available 500 weight instead of synthesizing 600", () => {
    const classes = badgeVariants();
    expect(classes).toContain("font-medium");
    expect(classes).not.toContain("font-semibold");
  });
});
