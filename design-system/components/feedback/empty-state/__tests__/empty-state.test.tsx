import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { EmptyState } from "../empty-state";

describe("EmptyState", () => {
  test("associates the region with its heading", () => {
    render(
      <EmptyState
        title="Nenhuma vaga"
        description="Novas vagas aparecerão aqui."
        action={<button type="button">Atualizar</button>}
      />,
    );

    const region = screen.getByRole("region", { name: "Nenhuma vaga" });
    expect(region).toContainElement(
      screen.getByRole("heading", { name: "Nenhuma vaga", level: 2 }),
    );
    expect(screen.getByRole("button", { name: "Atualizar" })).toBeVisible();
  });
});
