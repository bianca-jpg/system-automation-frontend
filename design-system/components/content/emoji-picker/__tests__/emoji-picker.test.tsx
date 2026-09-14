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
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { composeStories } from "@storybook/react";

import { EmojiPickerButton } from "../emoji-picker";
import * as stories from "../emoji-picker.stories";

const composed = composeStories(stories);

describe("EmojiPicker (composeStories smoke)", () => {
  Object.entries(composed).forEach(([name, Story]) => {
    test(`renders ${name} without errors`, () => {
      const { container } = render(<Story />);
      expect(container).toBeInstanceOf(Node);
    });
  });
});

// Interaction contract for the Radix-based popover (converted from the manual
// toggle+listeners implementation). Also acts as a freeze regression guard:
// the documented Radix DropdownMenu × React 19.2 infinite-loop would hang this
// test, so a green run is evidence the Popover primitive doesn't share it.
describe("EmojiPickerButton (Radix Popover interaction)", () => {
  test("opens on click, closes on Escape", async () => {
    render(<EmojiPickerButton onEmojiSelect={() => undefined} />);

    const trigger = screen.getByRole("button", { name: "Escolher emoji" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "true"),
    );
    expect(
      document.querySelector('[data-slot="emoji-picker-popover"]'),
    ).not.toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "false"),
    );
    expect(
      document.querySelector('[data-slot="emoji-picker-popover"]'),
    ).toBeNull();
  });

  test("disabled button does not open the popover", () => {
    render(<EmojiPickerButton onEmojiSelect={() => undefined} disabled />);

    const trigger = screen.getByRole("button", { name: "Escolher emoji" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(
      document.querySelector('[data-slot="emoji-picker-popover"]'),
    ).toBeNull();
  });
});
