import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * Token contrast — WCAG AA legibility guard for the core text/surface pairs, in
 * BOTH light and dark modes.
 *
 * The design system's critical foreground/background pairs are declared as hex
 * (directly or via one `--brand-*` alias hop), so contrast can be checked with a
 * self-contained sRGB luminance calc — no color dependency, no rendering. Pairs
 * Every declared pair must resolve to an opaque hex. An unresolved/alpha token
 * fails closed instead of being skipped, so the gate cannot report false green.
 *
 * This locks in the accessibility floor the theme layer must keep clearing as
 * tokens change or new palettes are added.
 */

const AA_NORMAL_TEXT = 4.5; // WCAG 1.4.3 — normal-size body text
const AA_LARGE_OR_UI = 3.0; // WCAG 1.4.3 large text / 1.4.11 UI components

// NB: the path goes through a variable on purpose — Vite statically rewrites
// `new URL("<literal>", import.meta.url)` into an asset URL (not a file: URL),
// which breaks readFileSync. Passing a variable sidesteps that transform.
function loadCss(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function loadColorsCss(): string {
  return loadCss("../colors.css").replace(/\/\*[\s\S]*?\*\//g, "");
}

function withoutComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Body of the first `{ ... }` block whose selector matches `startRe`. */
function extractBlock(css: string, startRe: RegExp): string {
  const match = css.match(startRe);
  if (!match || match.index === undefined) return "";
  const open = css.indexOf("{", match.index);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  return "";
}

function parseDeclarations(block: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(block)) !== null) {
    const name = match[1];
    const value = match[2];
    if (name && value !== undefined) map.set(name, value.trim());
  }
  return map;
}

/** Resolve a token to `#rrggbb`, following one/many `var(--alias)` hops. */
function resolveHex(token: string, tokens: Map<string, string>): string | null {
  let value = tokens.get(token);
  for (let hop = 0; hop < 8 && value; hop++) {
    const varMatch = value.match(/^var\(\s*(--[a-z0-9-]+)/i);
    if (varMatch && varMatch[1]) {
      value = tokens.get(varMatch[1]);
      continue;
    }
    const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex && hex[1]) return normalizeHex(hex[1]);
    return null; // oklch / rgb / gradient / alpha — not a plain opaque hex
  }
  return null;
}

function normalizeHex(hex: string): string {
  if (hex.length === 3) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toLowerCase();
  }
  return `#${hex.toLowerCase()}`;
}

function channelLuminance(srgb: number): number {
  const c = srgb / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

function mixHex(hexA: string, weightA: number, hexB: string): string {
  const channels = [1, 3, 5].map((offset) => {
    const a = parseInt(hexA.slice(offset, offset + 2), 16);
    const b = parseInt(hexB.slice(offset, offset + 2), 16);
    return Math.round(a * weightA + b * (1 - weightA));
  });
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

/** Resolve opaque tokens plus the receipt's explicit sRGB color-mix contract. */
function resolveRenderedHex(
  token: string,
  tokens: Map<string, string>,
): string | null {
  const value = tokens.get(token);
  const mixMatch = value?.match(
    /^color-mix\(\s*in srgb\s*,\s*var\((--[a-z0-9-]+)\)\s*(\d+)%\s*,\s*var\((--[a-z0-9-]+)\)\s*(\d+)%\s*\)$/i,
  );
  if (!mixMatch) return resolveHex(token, tokens);

  const [, tokenA, rawWeightA, tokenB, rawWeightB] = mixMatch;
  if (!tokenA || !rawWeightA || !tokenB || !rawWeightB) return null;
  const weightA = Number(rawWeightA) / 100;
  const weightB = Number(rawWeightB) / 100;
  if (Math.abs(weightA + weightB - 1) > Number.EPSILON) return null;

  const hexA = resolveHex(tokenA, tokens);
  const hexB = resolveHex(tokenB, tokens);
  return hexA && hexB ? mixHex(hexA, weightA, hexB) : null;
}

const css = loadColorsCss();
const lightTokens = parseDeclarations(extractBlock(css, /:root\s*,/));
const darkOverrides = parseDeclarations(
  extractBlock(css, /\.dark:not\(\.ds-theme-light\)/),
);
// Dark mode inherits :root then overrides — merge so aliases resolve in-mode.
const darkTokens = new Map(lightTokens);
for (const [key, value] of darkOverrides) darkTokens.set(key, value);

const THEME_FILES = [
  { id: "blue-ocean", path: "../themes/blue-ocean.css" },
  { id: "purple-rain", path: "../themes/purple-rain.css" },
  { id: "sweet-pie", path: "../themes/sweet-pie.css" },
] as const;

const MODES: Array<{ name: string; tokens: Map<string, string> }> = [
  { name: "default/light", tokens: lightTokens },
  { name: "default/dark", tokens: darkTokens },
];

for (const theme of THEME_FILES) {
  const themeCss = withoutComments(loadCss(theme.path));
  const lightOverrides = parseDeclarations(
    extractBlock(themeCss, new RegExp(`\\[data-theme="${theme.id}"\\]\\s*\\{`)),
  );
  const darkThemeOverrides = parseDeclarations(
    extractBlock(
      themeCss,
      new RegExp(`\\.dark\\[data-theme="${theme.id}"\\][^{]*\\{`),
    ),
  );
  const themedLight = new Map(lightTokens);
  const themedDark = new Map(darkTokens);
  for (const [key, value] of lightOverrides) themedLight.set(key, value);
  for (const [key, value] of darkThemeOverrides) themedDark.set(key, value);
  MODES.push(
    { name: `${theme.id}/light`, tokens: themedLight },
    { name: `${theme.id}/dark`, tokens: themedDark },
  );
}

// Body copy [fg, bg] — must clear the 4.5:1 normal-text floor.
const BODY_TEXT_PAIRS: Array<[string, string]> = [
  ["--foreground", "--background"],
  ["--card-foreground", "--card"],
  ["--muted-foreground", "--background"],
];

// Normal-size labels on solid actions/status surfaces must clear 4.5:1.
const SOLID_SURFACE_TEXT_PAIRS: Array<[string, string]> = [
  ["--primary-foreground", "--primary"],
  ["--secondary-foreground-strong", "--secondary"],
  ["--success-foreground-strong", "--success"],
  ["--warning-foreground-strong", "--warning"],
  ["--destructive-foreground-strong", "--destructive"],
  ["--info-foreground-strong", "--info"],
];

// State text used by subtle badges must remain legible on the underlying
// neutral surface. Their translucent state tint only adds a small color wash.
const SUBTLE_SURFACE_TEXT_PAIRS: Array<[string, string]> = [
  ["--success-text", "--background"],
  ["--warning-text", "--background"],
  ["--destructive-text", "--background"],
  ["--info-text", "--background"],
];

// Compatibility foreground intended only for large/decorative content.
const LARGE_OR_UI_PAIRS: Array<[string, string]> = [
  ["--secondary-foreground", "--secondary"],
];

const FOCUS_INDICATOR_PAIRS: Array<[string, string]> = [
  ["--outline-ring", "--background"],
];

const MESSAGE_RECEIPT_TOKENS = [
  "--message-receipt-sending",
  "--message-receipt-received",
  "--message-receipt-read",
] as const;

const CHAT_BUBBLE_PALETTES = [
  "default",
  "blue",
  "pink",
  "green",
  "purple",
  "red",
] as const;

const COLORED_CHAT_BUBBLE_PALETTES = [
  "blue",
  "pink",
  "green",
  "purple",
  "red",
] as const;

describe("contrast: luminance math self-check", () => {
  it("black on white is the WCAG maximum (~21:1)", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("identical colors are 1:1", () => {
    expect(contrastRatio("#3b3b3b", "#3b3b3b")).toBeCloseTo(1, 5);
  });
});

describe("contrast: message receipts clear the UI floor on every user bubble palette", () => {
  for (const mode of MODES) {
    for (const palette of CHAT_BUBBLE_PALETTES) {
      for (const receiptToken of MESSAGE_RECEIPT_TOKENS) {
        it(`${mode.name}/${palette}: ${receiptToken} on the user bubble ≥ ${AA_LARGE_OR_UI}:1`, () => {
          const runtimeTokens = new Map(mode.tokens);
          runtimeTokens.set(
            "--chat-user-bubble-messaging",
            `var(--chat-bubble-${palette})`,
          );
          runtimeTokens.set(
            "--chat-user-bubble-foreground-messaging",
            `var(--chat-bubble-${palette}-fg)`,
          );

          const fg = resolveRenderedHex(receiptToken, runtimeTokens);
          const bg = resolveHex("--chat-user-bubble-messaging", runtimeTokens);

          if (!fg || !bg) {
            throw new Error(
              `${mode.name}/${palette}: could not resolve ${receiptToken} (${String(fg)}) or bubble (${String(bg)}) to opaque hex`,
            );
          }

          const ratio = contrastRatio(fg, bg);
          expect(
            ratio,
            `${receiptToken} (${fg}) on ${palette} (${bg}) = ${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(AA_LARGE_OR_UI);
        });
      }
    }
  }
});

describe("contrast: message text meets WCAG AA on every user bubble palette", () => {
  for (const mode of MODES) {
    for (const palette of CHAT_BUBBLE_PALETTES) {
      it(`${mode.name}/${palette}: message text on the user bubble ≥ ${AA_NORMAL_TEXT}:1`, () => {
        const tokens = new Map(mode.tokens);
        tokens.set(
          "--chat-user-bubble-messaging",
          `var(--chat-bubble-${palette})`,
        );
        tokens.set(
          "--chat-user-bubble-foreground-messaging",
          `var(--chat-bubble-${palette}-fg)`,
        );

        const fg = resolveHex(
          "--chat-user-bubble-foreground-messaging",
          tokens,
        );
        const bg = resolveHex("--chat-user-bubble-messaging", tokens);
        if (!fg || !bg) {
          throw new Error(
            `${mode.name}/${palette}: could not resolve message foreground (${String(fg)}) or bubble (${String(bg)}) to opaque hex`,
          );
        }

        const ratio = contrastRatio(fg, bg);
        expect(
          ratio,
          `message foreground (${fg}) on ${palette} (${bg}) = ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      });
    }
  }
});

describe("dark mode colored user bubbles keep white message text", () => {
  for (const palette of COLORED_CHAT_BUBBLE_PALETTES) {
    it(`${palette}: uses white foreground without dropping the AA contrast floor`, () => {
      const foreground = resolveHex(
        `--chat-bubble-${palette}-fg`,
        darkTokens,
      );
      const background = resolveHex(`--chat-bubble-${palette}`, darkTokens);

      if (!foreground || !background) {
        throw new Error(`${palette}: dark bubble tokens must resolve to hex`);
      }

      expect(foreground).toBe("#ffffff");
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(
        AA_NORMAL_TEXT,
      );
    });
  }
});

function assertPairs(
  label: string,
  pairs: Array<[string, string]>,
  threshold: number,
) {
  describe(label, () => {
    for (const mode of MODES) {
      for (const [fgToken, bgToken] of pairs) {
        const fg = resolveHex(fgToken, mode.tokens);
        const bg = resolveHex(bgToken, mode.tokens);
        it(`${mode.name}: ${fgToken} on ${bgToken} ≥ ${threshold}:1`, () => {
          if (!fg || !bg) {
            throw new Error(
              `${mode.name}: could not resolve ${fgToken} (${String(fg)}) or ${bgToken} (${String(bg)}) to opaque hex`,
            );
          }
          const ratio = contrastRatio(fg, bg);
          expect(
            ratio,
            `${fgToken} (${fg}) on ${bgToken} (${bg}) = ${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(threshold);
        });
      }
    }
  });
}

assertPairs(
  "contrast: body text pairs meet WCAG AA (4.5:1) in every mode",
  BODY_TEXT_PAIRS,
  AA_NORMAL_TEXT,
);

assertPairs(
  "contrast: solid surface labels meet WCAG AA normal-text contrast in every theme/mode",
  SOLID_SURFACE_TEXT_PAIRS,
  AA_NORMAL_TEXT,
);

assertPairs(
  "contrast: subtle state text meets WCAG AA normal-text contrast in every theme/mode",
  SUBTLE_SURFACE_TEXT_PAIRS,
  AA_NORMAL_TEXT,
);

assertPairs(
  "contrast: compatibility foreground clears the UI/large-text floor in every theme/mode",
  LARGE_OR_UI_PAIRS,
  AA_LARGE_OR_UI,
);

assertPairs(
  "contrast: opaque focus indicator clears WCAG non-text contrast in every theme/mode",
  FOCUS_INDICATOR_PAIRS,
  AA_LARGE_OR_UI,
);
