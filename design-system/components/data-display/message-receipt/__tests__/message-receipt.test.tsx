import { render, screen } from "@testing-library/react";
import { composeStories } from "@storybook/react";
import { describe, expect, it } from "vitest";

import { MessageReceipt } from "../message-receipt";
import * as stories from "../message-receipt.stories";

const composedStories = composeStories(stories);

describe("MessageReceipt stories", () => {
  Object.entries(composedStories).forEach(([name, Story]) => {
    it(`renders ${name} without errors`, () => {
      const { container } = render(<Story />);
      expect(container).toBeInstanceOf(Node);
    });
  });
});

describe("MessageReceipt", () => {
  it.each([
    ["sending", "Enviando", 1],
    ["received", "Recebida pelo sistema", 2],
    ["read", "Visualizada", 2],
  ] as const)(
    "renders the %s state with its pt-BR label and expected marks",
    (status, label, checkCount) => {
      const { container } = render(<MessageReceipt status={status} />);

      const receipt = screen.getByRole("img", { name: label });
      expect(receipt).toHaveAttribute("data-status", status);
      expect(receipt).toHaveAttribute("title", label);
      expect(receipt).not.toHaveAttribute("tabindex");
      expect(container.querySelectorAll("svg")).toHaveLength(checkCount);
    },
  );

  it("can omit the pointer tooltip without removing the accessible name", () => {
    render(<MessageReceipt status="read" showTooltip={false} />);

    const receipt = screen.getByRole("img", { name: "Visualizada" });
    expect(receipt).not.toHaveAttribute("title");
  });
});
