import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function load(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function declaration(source: string, token: string): string | null {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    source.match(new RegExp(`${escaped}\\s*:\\s*([^;]+);`))?.[1]?.trim() ?? null
  );
}

describe("semantic token scales", () => {
  it("routes critical paint backgrounds through color tokens", () => {
    const colors = load("../colors.css");
    const globals = load("../../foundation.css");

    expect(declaration(colors, "--fouc-background-light")).toBe("#ffffff");
    expect(declaration(colors, "--fouc-background-dark")).toBe("#0a0a0a");
    expect(globals).toContain("var(--fouc-background-light)");
    expect(globals).toContain("var(--fouc-background-dark)");
    expect(globals).not.toContain("background-color: #fdfdfd");
    expect(globals).not.toContain("background-color: #18181b");
  });

  it("routes both shared font roles through the app-provided Satoshi adapter", () => {
    const css = load("../typography.css");
    expect(declaration(css, "--font-sans")).toMatch(/^var\(--font-satoshi\)/);
    expect(declaration(css, "--font-heading")).toMatch(
      /^var\(--font-satoshi\)/,
    );
  });

  it("exposes the supported 400/500/700 font-weight contract", () => {
    const css = load("../typography.css");
    expect(declaration(css, "--typography-font-weight-regular")).toBe("400");
    expect(declaration(css, "--typography-font-weight-medium")).toBe("500");
    expect(declaration(css, "--typography-font-weight-bold")).toBe("700");
    expect(declaration(css, "--font-weight-normal")).toBe(
      "var(--typography-font-weight-regular)",
    );
    expect(declaration(css, "--font-weight-regular")).toBe(
      "var(--typography-font-weight-regular)",
    );
    expect(declaration(css, "--font-weight-medium")).toBe(
      "var(--typography-font-weight-medium)",
    );
    expect(declaration(css, "--font-weight-bold")).toBe(
      "var(--typography-font-weight-bold)",
    );
  });

  it("exposes consumable spacing roles through the Tailwind theme bridge", () => {
    const css = load("../spacing.css");
    for (const role of [
      "inline-compact",
      "control-gap",
      "content-gap",
      "section-gap",
      "page-gutter",
    ]) {
      expect(declaration(css, `--space-${role}`)).not.toBeNull();
      expect(declaration(css, `--spacing-${role}`)).toBe(
        `var(--space-${role})`,
      );
    }
  });

  it("keeps radius aliases attached to canonical roles", () => {
    const css = load("../radius.css");
    expect(declaration(css, "--radius-interactive")).toBe(
      "var(--radius-interactive)",
    );
    expect(css).toContain("--radius-interactive: var(--radius-control)");
    expect(css).toContain("--radius-surface: var(--radius-card)");
    expect(css).toContain("--radius-round: var(--radius-pill)");
  });

  it("defines every elevation in both light and dark modes", () => {
    const css = load("../shadows.css");
    for (const token of [
      "--shadow-control",
      "--shadow-card",
      "--shadow-popover",
      "--shadow-modal",
    ]) {
      expect(css.split(`${token}:`).length - 1).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps global layers strictly ordered", () => {
    const css = load("../layers.css");
    const roles = [
      "content",
      "raised",
      "sticky",
      "navigation",
      "popover",
      "overlay",
      "modal",
      "toast",
      "skip-link",
    ];
    const values = roles.map((role) =>
      Number(declaration(css, `--layer-${role}`)),
    );

    expect(values.every(Number.isFinite)).toBe(true);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(new Set(values).size).toBe(values.length);
    for (const role of roles) {
      expect(declaration(css, `--z-index-${role}`)).toBe(
        `var(--layer-${role})`,
      );
    }
  });

  it("defines an ordered motion scale and the shared interaction easing", () => {
    const css = load("../motion.css");
    const durationTokens = [
      "instant",
      "fast",
      "standard",
      "slow",
      "deliberate",
      "ambient",
    ];
    const durations = durationTokens.map((role) => {
      const value = declaration(css, `--motion-duration-${role}`);
      expect(value).toMatch(/^\d+ms$/);
      return Number(value?.replace("ms", ""));
    });

    expect(durations).toEqual([...durations].sort((a, b) => a - b));
    for (const role of durationTokens) {
      expect(declaration(css, `--duration-${role}`)).toBe(
        `var(--motion-duration-${role})`,
      );
    }
    expect(declaration(css, "--motion-ease-standard")).toBe(
      "cubic-bezier(0.2, 0, 0, 1)",
    );
    for (const role of ["standard", "emphasized", "linear"]) {
      expect(declaration(css, `--ease-${role}`)).toBe(
        `var(--motion-ease-${role})`,
      );
    }
  });
});
