// Plan 38-3 Task 2 — composeStories smoke test (FE-QUAL-10).
// One test per exported story; enumerates them automatically so new stories get
// coverage for free. Pure render smoke — interaction tests are Playwright (Plan 38-4).
//
// Assertion shape: render() returning (i.e. not throwing) is the smoke contract.
// Some stories deliberately render null (caps-lock-warning Hidden, icon-count-badge
// ZeroHidden) — those are legitimate states; `container` is always a Node, so the
// test passes when render completes. Using `expect(container).toBeInstanceOf(Node)`
// asserts the smoke happened without imposing visual content.
import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { composeStories } from "@storybook/react";

import * as stories from "../input-otp.stories";

const composed = composeStories(stories);

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("InputOtp (composeStories smoke)", () => {
  Object.entries(composed).forEach(([name, Story]) => {
    test(`renders ${name} without errors`, () => {
      vi.useFakeTimers();
      const { container, unmount } = render(<Story />);

      act(() => {
        vi.runOnlyPendingTimers();
      });

      expect(container).toBeInstanceOf(Node);
      unmount();
      vi.clearAllTimers();
    });
  });

  test.each([
    ["Default", composed.Default, "One-time code"],
    ["FourDigits", composed.FourDigits, "Four-digit code"],
    ["Disabled", composed.Disabled, "Disabled one-time code"],
  ])("gives the %s story input an accessible name", (_, Story, name) => {
    render(<Story />);
    expect(screen.getByRole("textbox", { name })).toBeInTheDocument();
  });
});
