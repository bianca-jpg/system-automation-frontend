import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PaginationControls } from "./PaginationControls";

describe("PaginationControls", () => {
  it("mostra páginas numeradas e navega pelo botão do design system", async () => {
    const user = userEvent.setup();
    const setPage = vi.fn();
    render(
      <PaginationControls
        page={2}
        pageSize={25}
        totalItems={80}
        setPage={setPage}
        noun={["usuário", "usuários"]}
      />,
    );

    expect(screen.getByText("Mostrando 26–50 de 80 usuários")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ir para a página 2" }))
      .toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("button", { name: "Ir para a página 3" }));
    expect(setPage).toHaveBeenCalledWith(3);
  });

  it("desabilita a navegação durante a troca de página", () => {
    render(
      <PaginationControls page={1} pageSize={25} totalItems={30} setPage={() => {}} loading />,
    );
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ir para a página 2" })).toBeDisabled();
  });
});
