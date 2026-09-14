import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function load(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("Tailwind source boundaries", () => {
  it("keeps catalog sources out of the production design-system entry", () => {
    const foundationCss = load("../../foundation.css");
    const productionCss = load("../../globals.css");

    expect(foundationCss).toContain('@import "tailwindcss" source(none)');
    expect(foundationCss).not.toContain("@source ");
    expect(productionCss).toContain('@import "./foundation.css"');
    expect(productionCss).toContain('@source "./components"');
    expect(productionCss).toContain(
      '@source not "./components/**/*.stories.*"',
    );
    expect(productionCss).toContain('@source "./lib"');
    expect(productionCss).not.toContain('@source "./stories"');
  });

  it("keeps the complete catalog source set in the Storybook entry", () => {
    const storybookCss = load("../../storybook.css");
    const preview = load("../../.storybook/preview.tsx");

    expect(storybookCss).toContain('@import "./foundation.css"');
    expect(storybookCss).toContain('@source "./components"');
    expect(storybookCss).toContain('@source "./stories"');
    expect(storybookCss).toContain('@source "./lib"');
    expect(preview).toContain('import "../storybook.css"');
  });
});
