import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SkipLink } from "../skip-link";

describe("SkipLink", () => {
  test("links to the default primary landmark with an accessible label", () => {
    render(<SkipLink />);

    const link = screen.getByRole("link", {
      name: "Pular para o conteúdo principal",
    });
    expect(link).toHaveAttribute("href", "#main-content");
    expect(link).toHaveAttribute("data-slot", "skip-link");
  });

  test("is the first keyboard stop and reveals itself with opaque focus styles", async () => {
    const user = userEvent.setup();
    render(
      <>
        <SkipLink targetId="conteudo">Ir para o conteúdo</SkipLink>
        <button type="button">Ação seguinte</button>
      </>,
    );

    await user.tab();

    const link = screen.getByRole("link", { name: "Ir para o conteúdo" });
    expect(link).toHaveFocus();
    expect(link).toHaveClass(
      "z-skip-link",
      "focus-visible:opacity-100",
      "focus-visible:ds-focus-ring",
    );
    expect(link.className).not.toMatch(/(?:^|\s)z-(?:\d+|\[)/);
    expect(link.className).not.toMatch(/focus-visible:ring-[^\s]+\//);
  });

  test("forwards native anchor props and consumer classes", () => {
    render(
      <SkipLink
        targetId="resultados"
        aria-label="Atalho para resultados"
        className="left-8"
      />,
    );

    const link = screen.getByRole("link", { name: "Atalho para resultados" });
    expect(link).toHaveAttribute("href", "#resultados");
    expect(link).toHaveClass("left-8");
    expect(link).not.toHaveClass("left-page-gutter");
  });
});
