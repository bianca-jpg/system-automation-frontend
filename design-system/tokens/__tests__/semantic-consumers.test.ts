import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { buttonVariants } from "../../components/ui/button/variants";
import { badgeToneClassNames } from "../../components/ui/badge/variants";
import { accentToneTokens } from "../../lib/semantic-tokens";

describe("semantic color consumers", () => {
  it("Button uses normal-text foreground tokens for every solid variant", () => {
    expect(buttonVariants({ variant: "default" })).toContain(
      "text-primary-foreground",
    );
    expect(buttonVariants({ variant: "secondary" })).toContain(
      "text-secondary-foreground-strong",
    );
    expect(buttonVariants({ variant: "destructive" })).toContain(
      "text-destructive-foreground-strong",
    );
  });

  it("keeps primitive focus indicators opaque and token-driven", () => {
    const focusSources = [
      "../../components/ui/button/variants.ts",
      "../../components/ui/badge/variants.ts",
      "../../components/ui/checkbox/variants.ts",
      "../../components/ui/input/variants.ts",
      "../../components/ui/input-otp/variants.ts",
      "../../components/ui/pressable/pressable.tsx",
      "../../components/ui/radio-group/variants.ts",
      "../../components/ui/select/variants.ts",
      "../../components/ui/switch/variants.ts",
      "../../components/ui/textarea/variants.ts",
      "../../components/data-display/table/table.tsx",
    ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

    for (const source of focusSources) {
      expect(source).not.toMatch(/ring-ring\/\d+/);
      expect(source).not.toMatch(
        /(?:focus-visible|focus-within):ring-[^\s"']+\/\d+/,
      );
      expect(source).not.toMatch(
        /(?:focus-visible|focus-within):ring-(?:1|2|4|8|\[[^\]]+\])/,
      );
    }
  });

  it("centralizes the thin focus geometry in the interaction token module", () => {
    const interactionTokensPath = "../interactions.css";
    const globalsPath = "../../foundation.css";
    const interactionTokens = readFileSync(
      new URL(interactionTokensPath, import.meta.url),
      "utf8",
    );
    const globals = readFileSync(new URL(globalsPath, import.meta.url), "utf8");

    expect(interactionTokens).toContain("--ds-focus-ring-width: 1px");
    expect(globals).toContain("@utility ds-focus-ring");
    expect(globals).toContain("@utility ds-focus-ring-inset");
    expect(globals).toContain("@utility ds-focus-ring-docked-bottom");
    expect(globals).toContain("--tw-ring-color: var(--outline-ring)");
    expect(globals).not.toContain("var(--ring)");
  });

  it("Badge uses subtle-surface semantic text tokens", () => {
    expect(badgeToneClassNames.success).toContain("text-success-text");
    expect(badgeToneClassNames.warning).toContain("text-warning-text");
    expect(badgeToneClassNames.destructive).toContain("text-destructive-text");
    expect(badgeToneClassNames.info).toContain("text-info-text");
  });

  it("accent tone helpers do not reopen the locked Tailwind palette", () => {
    const classes = Object.values(accentToneTokens)
      .flatMap((tone) => Object.values(tone))
      .filter((value): value is string => typeof value === "string")
      .join(" ");
    const rawPaletteUtility =
      /(?:^|\s)(?:dark:)?(?:!?)(?:bg|text|from|via|to)-(?:amber|blue|purple|indigo|emerald|rose|red|sky|cyan|slate)-\d+/;

    expect(classes).not.toMatch(rawPaletteUtility);
  });
});
