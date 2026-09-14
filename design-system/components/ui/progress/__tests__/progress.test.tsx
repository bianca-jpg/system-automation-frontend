// Plan 38-3 Task 2 — composeStories smoke test (FE-QUAL-10).
// One test per exported story; enumerates them automatically so new stories get
// coverage for free. Pure render smoke — interaction tests are Playwright (Plan 38-4).
//
// Assertion shape: render() returning (i.e. not throwing) is the smoke contract.
// Some stories deliberately render null (caps-lock-warning Hidden, icon-count-badge
// ZeroHidden) — those are legitimate states; `container` is always a Node, so the
// test passes when render completes. Using `expect(container).toBeInstanceOf(Node)`
// asserts the smoke happened without imposing visual content.
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { composeStories } from "@storybook/react";

import { Progress } from "../progress";
import * as stories from "../progress.stories";

const composed = composeStories(stories);

describe("Progress (composeStories smoke)", () => {
  Object.entries(composed).forEach(([name, Story]) => {
    test(`renders ${name} without errors`, () => {
      const { container } = render(<Story />);
      expect(container).toBeInstanceOf(Node);
      screen.getAllByRole("progressbar").forEach((progress) => {
        expect(progress).toHaveAccessibleName();
      });
    });
  });
});

describe("Progress accessibility contract", () => {
  test("provides a neutral truthful accessible name by default", () => {
    render(<Progress value={25} />);

    expect(
      screen.getByRole("progressbar", { name: "Progresso" }),
    ).toBeInTheDocument();
  });

  test("uses visible contextual copy through aria-labelledby", () => {
    render(
      <>
        <span id="resume-upload-progress">Envio do currículo</span>
        <Progress value={60} aria-labelledby="resume-upload-progress" />
      </>,
    );

    expect(
      screen.getByRole("progressbar", { name: "Envio do currículo" }),
    ).not.toHaveAttribute("aria-label");
  });

  test("does not allow an empty aria-label to erase the default name", () => {
    render(<Progress value={10} aria-label="   " />);

    expect(
      screen.getByRole("progressbar", { name: "Progresso" }),
    ).toBeInTheDocument();
  });

  test("keeps the visual value and the Radix progress semantics in sync", () => {
    render(<Progress value={42} max={80} aria-label="Envio do vídeo" />);

    const progress = screen.getByRole("progressbar", {
      name: "Envio do vídeo",
    });
    expect(progress).toHaveAttribute("aria-valuemin", "0");
    expect(progress).toHaveAttribute("aria-valuemax", "80");
    expect(progress).toHaveAttribute("aria-valuenow", "42");
  });

  test("represents an indeterminate operation without a numeric value", () => {
    render(<Progress indeterminate aria-label="Processando" />);

    const progress = screen.getByRole("progressbar", { name: "Processando" });
    expect(progress).not.toHaveAttribute("aria-valuenow");
    expect(progress).toHaveAttribute("aria-busy", "true");
  });
});
