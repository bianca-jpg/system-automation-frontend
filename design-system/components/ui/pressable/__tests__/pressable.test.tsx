import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { Pressable } from "../pressable";

describe("Pressable", () => {
  test("uses native button semantics and invokes clicks", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Pressable onClick={onClick}>Abrir</Pressable>);

    const pressable = screen.getByRole("button", { name: "Abrir" });
    expect(pressable).toHaveAttribute("type", "button");
    await user.click(pressable);
    expect(onClick).toHaveBeenCalledOnce();
  });

  test("makes a disabled slotted link inert", () => {
    const pressableOnClick = vi.fn();
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
      <Pressable asChild disabled onClick={pressableOnClick}>
        <a href="/destino" {...childHandlers}>
          Destino
        </a>
      </Pressable>,
    );

    const link = screen.getByRole("link", { name: "Destino" });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveAttribute("tabindex", "-1");
    fireEvent.pointerDown(link);
    fireEvent.pointerUp(link);
    fireEvent.keyDown(link, { key: "Enter" });
    fireEvent.keyUp(link, { key: "Enter" });
    expect(fireEvent.click(link)).toBe(false);
    expect(pressableOnClick).not.toHaveBeenCalled();
    Object.values(childHandlers).forEach((handler) => {
      expect(handler).not.toHaveBeenCalled();
    });
  });

  test("preserves child activation handlers for an enabled slotted link", () => {
    const childOnClick = vi.fn();
    const childOnKeyDown = vi.fn();
    const childOnPointerDown = vi.fn();

    render(
      <Pressable asChild>
        <a
          href="/destino"
          onClick={childOnClick}
          onKeyDown={childOnKeyDown}
          onPointerDown={childOnPointerDown}
        >
          Destino
        </a>
      </Pressable>,
    );

    const link = screen.getByRole("link", { name: "Destino" });
    fireEvent.pointerDown(link);
    fireEvent.keyDown(link, { key: "Enter" });
    fireEvent.click(link);

    expect(childOnPointerDown).toHaveBeenCalledOnce();
    expect(childOnKeyDown).toHaveBeenCalledOnce();
    expect(childOnClick).toHaveBeenCalledOnce();
  });

  test("announces loading and pressed state", () => {
    render(
      <Pressable loading pressed>
        Salvar
      </Pressable>,
    );
    const pressable = screen.getByRole("button", { name: "Salvar" });
    expect(pressable).toHaveAttribute("aria-busy", "true");
    expect(pressable).toHaveAttribute("aria-pressed", "true");
    expect(pressable).toBeDisabled();
  });
});
