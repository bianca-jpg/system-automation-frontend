import { beforeAll, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RichTextEditor } from "../rich-text-editor";

beforeAll(() => {
  const rect = new DOMRect(0, 0, 1, 1);
  Object.defineProperty(window, "scrollBy", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(Range.prototype, "getClientRects", {
    configurable: true,
    value: () => [rect] as unknown as DOMRectList,
  });
  Object.defineProperty(Range.prototype, "getBoundingClientRect", {
    configurable: true,
    value: () => rect,
  });
});

describe("RichTextEditor", () => {
  test("describes the editor with a visual counter that is not a live region", async () => {
    render(
      <RichTextEditor
        value="Olá"
        onChange={vi.fn()}
        ariaLabel="Descrição"
        maxLength={20}
      />,
    );

    const editor = await screen.findByRole("textbox", { name: "Descrição" });
    expect(editor).toHaveAttribute("aria-multiline", "true");
    const counter = await screen.findByText("3/20 caracteres");
    expect(editor).toHaveAttribute("aria-describedby", counter.id);
    expect(counter).toBeVisible();
    expect(counter).not.toHaveAttribute("role");
    expect(counter).not.toHaveAttribute("aria-live");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  test("uses a keyboard-accessible link form instead of window.prompt", async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, "prompt");

    render(<RichTextEditor value="Texto" onChange={vi.fn()} />);
    await user.click(await screen.findByRole("button", { name: "Link" }));

    expect(promptSpy).not.toHaveBeenCalled();
    expect(
      await screen.findByRole("textbox", { name: "URL do link" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Aplicar link" })).toBeEnabled();
    promptSpy.mockRestore();
  });

  test("locks the editor and toolbar when disabled", async () => {
    render(
      <RichTextEditor
        value="Texto"
        onChange={vi.fn()}
        disabled
        maxLength={20}
      />,
    );

    expect(
      await screen.findByRole("textbox", { name: "Editor de texto rico" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Negrito" })).toBeDisabled();
  });

  test("prevents edits beyond maxLength while allowing the accepted text", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RichTextEditor value="" onChange={onChange} maxLength={5} />);

    const editor = await screen.findByRole("textbox", {
      name: "Editor de texto rico",
    });
    editor.focus();
    await user.type(editor, "abcdef", { skipClick: true });

    expect(editor).toHaveTextContent("abcde");
    expect(editor).not.toHaveTextContent("abcdef");
    const counter = await screen.findByText("5/5 caracteres");
    expect(counter).toBeVisible();
    expect(counter).not.toHaveAttribute("aria-live");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Limite de 5 caracteres atingido.",
    );
  });
});
