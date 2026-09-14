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

import * as stories from "../typography.stories";
import {
  TYPOGRAPHY_COLOR_CLASSES,
  TYPOGRAPHY_ROLE_CLASSES,
} from "../tokens";

const composed = composeStories(stories);

describe("Typography (composeStories smoke)", () => {
  Object.entries(composed).forEach(([name, Story]) => {
    test(`renders ${name} without errors`, () => {
      const { container } = render(<Story />);
      expect(container).toBeInstanceOf(Node);
    });
  });
});

describe("Typography font-weight contract", () => {
  test("uses only the loaded 400/500/700 weights", () => {
    const classes = Object.values(TYPOGRAPHY_ROLE_CLASSES).join(" ");

    expect(classes).not.toContain("font-semibold");
    expect(classes).not.toContain("font-[600]");
    expect(TYPOGRAPHY_ROLE_CLASSES.h1).toContain("font-bold");
    expect(TYPOGRAPHY_ROLE_CLASSES.h2).toContain("font-bold");
    expect(TYPOGRAPHY_ROLE_CLASSES.h3).toContain("font-bold");
    expect(TYPOGRAPHY_ROLE_CLASSES.h4).toContain("font-bold");
    // O corpo acompanha o peso base do <body> (500). 400 ficava fino demais e
    // Satoshi não tem eixo variável para um meio-termo.
    expect(TYPOGRAPHY_ROLE_CLASSES.body).toContain("font-medium");
    expect(TYPOGRAPHY_ROLE_CLASSES.lead).toContain("font-medium");
    expect(TYPOGRAPHY_ROLE_CLASSES.small).toContain("font-medium");
    expect(TYPOGRAPHY_ROLE_CLASSES.caption).toContain("font-medium");
  });
});

describe("Typography color contrast contract", () => {
  test("maps semantic status colors to their AA text tokens", () => {
    expect(TYPOGRAPHY_COLOR_CLASSES.secondary).toBe("text-info-text");
    expect(TYPOGRAPHY_COLOR_CLASSES.info).toBe("text-info-text");
    expect(TYPOGRAPHY_COLOR_CLASSES.destructive).toBe(
      "text-destructive-text",
    );
  });
});
