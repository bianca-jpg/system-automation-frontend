// Plan 38-3 Task 2 — composeStories smoke test (FE-QUAL-10).
// One test per exported story; enumerates them automatically so new stories get
// coverage for free. Pure render smoke — interaction tests are Playwright (Plan 38-4).
//
// Assertion shape: render() returning (i.e. not throwing) is the smoke contract.
// Some stories deliberately render null (caps-lock-warning Hidden, icon-count-badge
// ZeroHidden) — those are legitimate states; `container` is always a Node, so the
// test passes when render completes. Using `expect(container).toBeInstanceOf(Node)`
// asserts the smoke happened without imposing visual content.
import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { composeStories } from "@storybook/react";

import { Button } from "../button";
import { buttonVariants } from "../variants";
import * as stories from "../button.stories";

const composed = composeStories(stories);

describe("Button (composeStories smoke)", () => {
  Object.entries(composed).forEach(([name, Story]) => {
    test(`renders ${name} without errors`, () => {
      const { container } = render(<Story />);
      expect(container).toBeInstanceOf(Node);
    });
  });
});

describe("Button accessibility contract", () => {
  test("uses the high-contrast semantic information color for links", () => {
    const classes = buttonVariants({ variant: "link" });

    expect(classes).toContain("text-info-text");
    expect(classes).not.toContain("text-info ");
    expect(classes).not.toContain("text-info/80");
  });

  test("announces its loading state without replacing the accessible action", () => {
    render(
      <Button loading loadingLabel="Salvando alterações">
        Salvar
      </Button>,
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Salvando alterações");
  });

  test("makes a disabled asChild link inert for focus and activation", () => {
    const buttonOnClick = vi.fn();
    const childHandlers = {
      onClick: vi.fn(),
      onClickCapture: vi.fn(),
      onKeyDown: vi.fn(),
      onKeyDownCapture: vi.fn(),
      onKeyUp: vi.fn(),
      onKeyUpCapture: vi.fn(),
      onPointerDown: vi.fn(),
      onPointerDownCapture: vi.fn(),
      onPointerUp: vi.fn(),
      onPointerUpCapture: vi.fn(),
    };
    render(
      <Button asChild disabled onClick={buttonOnClick}>
        <a href="/destino" {...childHandlers}>
          Continuar
        </a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Continuar" });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveAttribute("tabindex", "-1");
    fireEvent.pointerDown(link);
    fireEvent.pointerUp(link);
    fireEvent.keyDown(link, { key: "Enter" });
    fireEvent.keyUp(link, { key: "Enter" });
    expect(fireEvent.click(link)).toBe(false);
    expect(buttonOnClick).not.toHaveBeenCalled();
    Object.values(childHandlers).forEach((handler) => {
      expect(handler).not.toHaveBeenCalled();
    });
  });

  test("preserves child activation handlers for an enabled asChild link", () => {
    const childOnClick = vi.fn();
    const childOnKeyDown = vi.fn();
    const childOnPointerDown = vi.fn();

    render(
      <Button asChild>
        <a
          href="/destino"
          onClick={childOnClick}
          onKeyDown={childOnKeyDown}
          onPointerDown={childOnPointerDown}
        >
          Continuar
        </a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Continuar" });
    fireEvent.pointerDown(link);
    fireEvent.keyDown(link, { key: "Enter" });
    fireEvent.click(link);

    expect(childOnPointerDown).toHaveBeenCalledOnce();
    expect(childOnKeyDown).toHaveBeenCalledOnce();
    expect(childOnClick).toHaveBeenCalledOnce();
  });

  test("forwards capture handlers from the native button path", () => {
    const onClickCapture = vi.fn();
    const onKeyDownCapture = vi.fn();
    const onPointerDownCapture = vi.fn();

    render(
      <Button
        onClickCapture={onClickCapture}
        onKeyDownCapture={onKeyDownCapture}
        onPointerDownCapture={onPointerDownCapture}
      >
        Continuar
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Continuar" });
    fireEvent.pointerDown(button);
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.click(button);

    expect(onPointerDownCapture).toHaveBeenCalledOnce();
    expect(onKeyDownCapture).toHaveBeenCalledOnce();
    expect(onClickCapture).toHaveBeenCalledOnce();
  });

  test("forwards the native element ref used by composed primitives", () => {
    const ref = createRef<HTMLButtonElement>();

    render(<Button ref={ref}>Abrir ações</Button>);

    expect(ref.current).toBe(
      screen.getByRole("button", { name: "Abrir ações" }),
    );
  });
});
