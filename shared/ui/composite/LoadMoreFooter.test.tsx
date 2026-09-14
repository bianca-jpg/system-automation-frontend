import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LoadMoreFooter } from "./LoadMoreFooter";

describe("LoadMoreFooter", () => {
  it("usa o loading nativo do design system e bloqueia cliques duplicados", async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();

    render(
      <LoadMoreFooter
        loaded={25}
        total={40}
        onLoadMore={onLoadMore}
        loading
        noun={["produto", "produtos"]}
      />,
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Carregando mais 15");

    await user.click(button);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("informa o tamanho real do próximo lote", async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();

    render(
      <LoadMoreFooter
        loaded={25}
        total={30}
        onLoadMore={onLoadMore}
        noun={["produto", "produtos"]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Carregar mais 5" }));
    expect(onLoadMore).toHaveBeenCalledOnce();
  });
});
