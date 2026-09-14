import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { FeatureBoundary } from "../feature-boundary";

function ThrowingChild(): never {
  throw new Error("sensitive internal failure");
}

describe("FeatureBoundary", () => {
  test("renders design-system recovery actions without exposing the error", () => {
    const onRecovery = vi.fn();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      render(
        <FeatureBoundary
          fallback={<div>Carregando</div>}
          recoveryActions={[
            { label: "Abrir início", href: "/" },
            { label: "Ajuda", onClick: onRecovery },
          ]}
        >
          <ThrowingChild />
        </FeatureBoundary>,
      );

      expect(screen.getByRole("alert")).toHaveClass("bg-background");
      expect(screen.getByRole("alert")).not.toHaveTextContent(
        "sensitive internal failure",
      );
      expect(
        screen.getByRole("button", { name: "Tentar novamente" }),
      ).toHaveAttribute("data-slot", "button");
      expect(screen.getByRole("button", { name: "Ajuda" })).toHaveAttribute(
        "data-slot",
        "button",
      );
      expect(screen.getByRole("link", { name: "Abrir início" })).toHaveClass(
        "ds-border-control",
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
