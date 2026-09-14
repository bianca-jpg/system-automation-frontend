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
import { render, screen, waitFor } from "@testing-library/react";
import { composeStories } from "@storybook/react";
import { useForm } from "react-hook-form";

import * as stories from "../Form.stories";
import { Form, FormField, useFormField } from "../Form";

const composed = composeStories(stories);

describe("Form (composeStories smoke)", () => {
  Object.entries(composed).forEach(([name, Story]) => {
    test(`renders ${name} without errors`, () => {
      const { container } = render(<Story />);
      expect(container).toBeInstanceOf(Node);
    });
  });

  test("fails clearly when useFormField is outside FormField", () => {
    function Probe() {
      useFormField();
      return null;
    }

    expect(() => render(<Probe />)).toThrow(
      "useFormField should be used within <FormField>",
    );
  });

  test("fails clearly when a FormField has no FormItem", () => {
    function Probe() {
      useFormField();
      return null;
    }

    function MissingItem() {
      const form = useForm({ defaultValues: { name: "" } });
      return (
        <Form {...form}>
          <FormField
            control={form.control}
            name="name"
            render={() => <Probe />}
          />
        </Form>
      );
    }

    expect(() => render(<MissingItem />)).toThrow(
      "useFormField should be used within <FormItem>",
    );
  });

  test("uses the accessible destructive text token for labels and messages", async () => {
    render(<composed.WithErrors />);

    await waitFor(() => {
      expect(screen.getByText("Email inválido")).toBeInTheDocument();
    });

    expect(screen.getByText("Email")).toHaveClass(
      "data-[error=true]:text-destructive-text",
    );
    expect(screen.getByText("Email inválido")).toHaveClass(
      "text-destructive-text",
    );
  });
});
