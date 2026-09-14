import type * as React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BackButton, toInternalHref } from "../back-button";

const router = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("next/link", () => ({
  default: ({
    children,
    replace,
    ...props
  }: React.ComponentProps<"a"> & { replace?: boolean }) => (
    <a
      data-next-link="true"
      data-replace={replace ? "true" : undefined}
      {...props}
    >
      {children}
    </a>
  ),
}));

let historyLengthSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  historyLengthSpy = vi
    .spyOn(window.history, "length", "get")
    .mockReturnValue(1);
});

afterEach(() => historyLengthSpy.mockRestore());

describe("BackButton", () => {
  test("delegates controlled history actions before using the router", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<BackButton onClick={onClick} fallbackHref="/inicio" />);

    await user.click(screen.getByRole("button", { name: "Voltar" }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(router.back).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  test("uses Next Link for a safe internal link destination", () => {
    render(<BackButton mode="link" href="/vagas?status=aberta" replace label="Vagas" />);

    const link = screen.getByRole("link", { name: "Vagas" });
    expect(link).toHaveAttribute("href", "/vagas?status=aberta");
    expect(link).toHaveAttribute("data-next-link", "true");
    expect(link).toHaveAttribute("data-replace", "true");
  });

  test("uses browser history when an earlier entry exists", async () => {
    historyLengthSpy.mockReturnValue(2);
    const user = userEvent.setup();
    render(<BackButton mode="history" fallbackHref="/inicio" />);

    await user.click(screen.getByRole("button", { name: "Voltar" }));

    expect(router.back).toHaveBeenCalledOnce();
    expect(router.push).not.toHaveBeenCalled();
  });

  test("uses a safe fallback and honors replace without prior history", async () => {
    const user = userEvent.setup();
    render(
      <BackButton mode="history" fallbackHref="/inicio" replace />,
    );

    await user.click(screen.getByRole("button", { name: "Voltar" }));

    expect(router.replace).toHaveBeenCalledWith("/inicio");
    expect(router.push).not.toHaveBeenCalled();
  });

  test("rejects external and browser-normalized external destinations", async () => {
    const user = userEvent.setup();
    render(
      <BackButton
        mode="link"
        href="/\\malicioso.example"
        fallbackHref="/seguro"
      />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    expect(router.push).toHaveBeenCalledWith("/seguro");

    expect(toInternalHref("https://malicioso.example")).toBeUndefined();
    expect(toInternalHref("//malicioso.example")).toBeUndefined();
    expect(toInternalHref("/\\malicioso.example")).toBeUndefined();
    expect(toInternalHref("/vagas#detalhes")).toBe("/vagas#detalhes");
  });

  test("keeps icon-only controls named and ripple-enabled", () => {
    render(
      <BackButton
        onBack={() => undefined}
        iconOnly
        accessibleLabel="Voltar para candidatos"
      />,
    );

    const button = screen.getByRole("button", {
      name: "Voltar para candidatos",
    });
    expect(button).toHaveClass("rounded-full");
  });
});
