import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { COLOR_THEMES, DEFAULT_COLOR_THEME } from "../../lib/theme-registry";

/**
 * Token contract — structural guarantees for the themeable token layer.
 *
 * These are the invariants that make the design system safely themeable
 * (light/dark today, additional `data-theme` palettes tomorrow). They are pure
 * string/structure checks over the token CSS — no rendering, no color math — so
 * they never flake.
 *
 * What each test guards:
 *  1. No Tailwind utility maps to a non-existent base token (`@theme inline`
 *     `--color-x: var(--y)` where `--y` is never declared → `bg-x` renders
 *     transparent, the "invisible element" class of bug).
 *  2. No CSS declaration references a token that does not exist WITHOUT a
 *     fallback (`var(--typo)` → the property is dropped). References that DO
 *     provide a fallback (`var(--optional, #fff)`) are legitimate and ignored.
 *  3. Every registered color theme (other than the default, which lives in
 *     `:root`) has a matching `[data-theme="id"]` block, so adding a theme to
 *     the registry without shipping its tokens is caught here rather than in
 *     production.
 *  4. A DERIVED token (one whose value contains `var(--base)`) is redeclared in
 *     the dark block whenever the dark block redefines any of its bases.
 *     A derived token declared only in `:root` is NOT mode-invariant, contrary
 *     to what this file used to claim: `var()` inside a custom property is
 *     substituted at DECLARATION time, so `.dark` subtrees inherit the value
 *     already resolved against the LIGHT base. Verified in a browser —
 *     `--x: color-mix(in srgb, var(--border) 70%, transparent)` and even the
 *     plain alias `--x: var(--border)` both keep the light color inside `.dark`.
 *     This is what shipped the whole `--ds-border-*` family with light borders
 *     on dark surfaces.
 */

const CSS_FILES = [
  "../colors.css",
  "../spacing.css",
  "../radius.css",
  "../shadows.css",
  "../layers.css",
  "../typography.css",
  "../motion.css",
  "../interactions.css",
  "../themes/blue-ocean.css",
  "../themes/purple-rain.css",
  "../themes/sweet-pie.css",
  "../../foundation.css",
] as const;

const TOKEN_STORY_FILES = [
  "../../stories/Tokens-Colors.stories.tsx",
  "../../stories/Tokens-Typography.stories.tsx",
  "../../stories/Tokens-Spacing.stories.tsx",
  "../../stories/Tokens-Radius.stories.tsx",
  "../../stories/Tokens-Shadows.stories.tsx",
  "../../stories/Tokens-Motion.stories.tsx",
  "../../stories/Tokens-Layers.stories.tsx",
] as const;

function loadCss(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

const rawCss = CSS_FILES.map(loadCss).join("\n");
const css = stripComments(rawCss);

/** All custom properties DECLARED anywhere (`--name:` at a declaration site). */
function collectDefinedTokens(source: string): Set<string> {
  const defined = new Set<string>();
  const re = /(--[a-z0-9-]+)\s*:/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const token = match[1];
    if (token) defined.add(token);
  }
  return defined;
}

/** Extract the body of every `@theme inline { ... }` block (brace-balanced). */
function collectThemeBlocks(source: string): string[] {
  const blocks: string[] = [];
  const marker = /@theme\s+inline\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = marker.exec(source)) !== null) {
    let depth = 1;
    let i = match.index + match[0].length;
    const start = i;
    for (; i < source.length && depth > 0; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") depth--;
    }
    blocks.push(source.slice(start, i - 1));
  }
  return blocks;
}

const definedTokens = collectDefinedTokens(css);

// Tokens legitimately provided OUTSIDE this CSS at runtime:
//  - `--tw-*`   Tailwind 4 internals (ring, shadow, translate, …)
//  - `--font-*` injected per-app by next/font/local (Satoshi, Inter fallback)
function isExternallyProvided(token: string): boolean {
  return token.startsWith("--tw-") || token.startsWith("--font-");
}

describe("token contract: @theme inline maps to real base tokens", () => {
  const themeBlocks = collectThemeBlocks(css);

  it("finds at least one @theme inline block", () => {
    expect(themeBlocks.length).toBeGreaterThan(0);
  });

  it("every `--color/radius/shadow/... : var(--y)` mapping resolves to a declared token", () => {
    const unresolved: string[] = [];
    const refRe = /var\(\s*(--[a-z0-9-]+)\s*\)/gi;

    for (const block of themeBlocks) {
      let match: RegExpExecArray | null;
      while ((match = refRe.exec(block)) !== null) {
        const token = match[1];
        if (!token) continue;
        if (!definedTokens.has(token) && !isExternallyProvided(token)) {
          unresolved.push(token);
        }
      }
    }

    expect(
      unresolved,
      `@theme inline maps to undeclared token(s): ${unresolved.join(", ")}`,
    ).toEqual([]);
  });
});

describe("token contract: no dangling var() references", () => {
  it("every `var(--x)` without a fallback references a declared token", () => {
    // Match `var(--x` and capture whether a comma (fallback) follows before `)`.
    const re = /var\(\s*(--[a-z0-9-]+)\s*([,)])/gi;
    const dangling = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = re.exec(css)) !== null) {
      const token = match[1];
      if (!token) continue;
      const hasFallback = match[2] === ",";
      if (hasFallback) continue; // `var(--x, default)` is an intentional optional
      if (definedTokens.has(token) || isExternallyProvided(token)) continue;
      dangling.add(token);
    }

    expect(
      [...dangling],
      `Undeclared token(s) referenced without a fallback: ${[...dangling].join(", ")}`,
    ).toEqual([]);
  });
});

describe("token contract: foundation stories document real tokens", () => {
  it("every literal varName entry is declared by the token layer", () => {
    const missing = new Set<string>();
    const varNameRe = /varName:\s*["'](--[a-z0-9-]+)["']/gi;

    for (const storyPath of TOKEN_STORY_FILES) {
      const story = loadCss(storyPath);
      let match: RegExpExecArray | null;
      while ((match = varNameRe.exec(story)) !== null) {
        const token = match[1];
        if (
          token &&
          !definedTokens.has(token) &&
          !isExternallyProvided(token)
        ) {
          missing.add(token);
        }
      }
    }

    expect(
      [...missing],
      `Foundation story varName entries reference undeclared tokens: ${[
        ...missing,
      ].join(", ")}`,
    ).toEqual([]);
  });
});

describe("token contract: color-theme registry matches CSS", () => {
  it("declares the default color theme in the registry", () => {
    expect(COLOR_THEMES.some((theme) => theme.id === DEFAULT_COLOR_THEME)).toBe(
      true,
    );
  });

  it("every non-default color theme ships a [data-theme] block", () => {
    const missing = COLOR_THEMES.filter(
      (theme) => theme.id !== DEFAULT_COLOR_THEME,
    )
      .filter((theme) => !css.includes(`[data-theme="${theme.id}"]`))
      .map((theme) => theme.id);

    expect(
      missing,
      `Color theme(s) registered without a [data-theme] block: ${missing.join(", ")}`,
    ).toEqual([]);
  });
});

/** Body of the first CSS rule whose selector matches `selectorRe` (brace-balanced). */
function blockBody(source: string, selectorRe: RegExp): string {
  const match = selectorRe.exec(source);
  if (!match) return "";
  let depth = 1;
  let i = source.indexOf("{", match.index) + 1;
  const start = i;
  for (; i < source.length && depth > 0; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") depth--;
  }
  return source.slice(start, i - 1);
}

/** `--name -> value` for every declaration directly in this block (skips @theme). */
function declarations(block: string): Map<string, string> {
  const decls = new Map<string, string>();
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(block)) !== null) {
    const name = match[1];
    const value = match[2];
    if (name && value) decls.set(name, value.replace(/\s+/g, " ").trim());
  }
  return decls;
}

describe("token contract: light/dark color-theme parity", () => {
  const themes = [
    { id: "blue-ocean", file: "../themes/blue-ocean.css" },
    { id: "purple-rain", file: "../themes/purple-rain.css" },
    { id: "sweet-pie", file: "../themes/sweet-pie.css" },
  ] as const;

  for (const theme of themes) {
    it(`${theme.id} overrides the same tokens in light and dark`, () => {
      const themeCss = stripComments(loadCss(theme.file));
      const light = declarations(
        blockBody(
          themeCss,
          new RegExp(`\\[data-theme="${theme.id}"\\]\\s*\\{`),
        ),
      );
      const dark = declarations(
        blockBody(
          themeCss,
          new RegExp(`\\.dark\\[data-theme="${theme.id}"\\][^{]*\\{`),
        ),
      );

      expect(light.size).toBeGreaterThan(0);
      expect([...dark.keys()].sort()).toEqual([...light.keys()].sort());
    });
  }
});

/** Base tokens a derived value depends on (the `var(--base)` refs inside it). */
function baseRefs(value: string): string[] {
  const refs: string[] = [];
  const re = /var\(\s*(--[a-z0-9-]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(value)) !== null) {
    if (match[1]) refs.push(match[1]);
  }
  return refs;
}

describe("token contract: derived tokens follow the dark theme", () => {
  // Only colors.css carries the light `:root` + dark override structure.
  const colorsCss = stripComments(loadCss("../colors.css"));
  // Light block: the `:root, .ds-theme-light { … }` selector list (no `.dark`).
  const lightBlock = blockBody(colorsCss, /(?:^|\})\s*:root\s*,[^{]*\{/);
  // Dark block: the `:root.dark…, .dark…, .ds-theme-dark { … }` selector list.
  const darkBlock = blockBody(colorsCss, /:root\.dark[^{]*\{/);

  const lightDecls = declarations(lightBlock);
  const darkDecls = declarations(darkBlock);
  const darkRedefines = new Set(darkDecls.keys());

  it("locates both the light :root and the dark override block", () => {
    expect(lightDecls.size).toBeGreaterThan(20);
    expect(darkDecls.size).toBeGreaterThan(20);
  });

  it("redeclares in dark every derived token whose base the dark theme overrides", () => {
    const stale: string[] = [];

    for (const [name, value] of lightDecls) {
      const bases = baseRefs(value);
      if (bases.length === 0) continue; // literal value, not derived
      const dependsOnDarkOverriddenBase = bases.some((b) =>
        darkRedefines.has(b),
      );
      if (!dependsOnDarkOverriddenBase) continue; // base is mode-invariant → fine
      if (!darkDecls.has(name)) stale.push(name);
    }

    expect(
      stale.sort(),
      `Token(s) derived from a dark-overridden base but declared only in :root: ` +
        `${stale.join(", ")}. Inside a .dark subtree these keep their LIGHT value ` +
        `(var() is substituted at declaration time). Redeclare each — identically — ` +
        `in the dark block so color-mix re-resolves against the dark bases.`,
    ).toEqual([]);
  });
});
