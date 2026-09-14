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
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";

import * as stories from "../select-with-search.stories";
import { SelectSearch } from "../select-with-search";

const composed = composeStories(stories);

describe("SelectWithSearch (composeStories smoke)", () => {
  Object.entries(composed).forEach(([name, Story]) => {
    test(`renders ${name} without errors`, () => {
      const { container } = render(<Story />);
      expect(container).toBeInstanceOf(Node);
    });
  });

  test("associates the trigger with its validation error", () => {
    function Demo() {
      const form = useForm({ defaultValues: { state: "" } });
      return (
        <SelectSearch
          name="state"
          control={form.control}
          label="Estado"
          options={[{ label: "São Paulo", value: "SP" }]}
          error={{ type: "required", message: "Selecione um estado" }}
        />
      );
    }

    render(<Demo />);

    const trigger = screen.getByRole("combobox", { name: "Estado" });
    const error = screen.getByRole("alert");
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger).toHaveAttribute("aria-describedby", error.id);
  });

  test("filters options without requiring accents", async () => {
    const user = userEvent.setup();

    function Demo() {
      const form = useForm({ defaultValues: { state: "" } });
      return (
        <SelectSearch
          name="state"
          control={form.control}
          label="Estado"
          searchPlaceholder="Filtrar estados"
          options={[
            { label: "São Paulo", value: "SP" },
            { label: "Paraná", value: "PR" },
          ]}
        />
      );
    }

    render(<Demo />);
    const trigger = screen.getByRole("combobox", { name: "Estado" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    await user.type(
      await screen.findByRole("searchbox", { name: "Filtrar estados" }),
      "sao",
    );

    expect(screen.getByRole("option", { name: "São Paulo" })).toBeVisible();
    expect(
      screen.queryByRole("option", { name: "Paraná" }),
    ).not.toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        screen.queryByRole("searchbox", { name: "Filtrar estados" }),
      ).not.toBeInTheDocument(),
    );
  });
});
