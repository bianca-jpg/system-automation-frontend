# Accessibility verification contract

Updated: 2026-07-19.

This file documents the current verification method. It does not preserve
contrast results from superseded palettes and it does not claim a runtime axe
result until that command has completed.

## Static token gates

Run from the frontend root:

```bash
pnpm --filter @system-automation/design-system test
```

The token suite provides these fail-closed checks:

- `token-contrast.test.ts` evaluates Default, Blue Ocean, Purple Rain and Sweet
  Pie in both light and dark modes.
- Normal-size text on solid semantic surfaces must reach WCAG AA 4.5:1.
- Text used by subtle status surfaces must reach WCAG AA 4.5:1 against the
  underlying surface.
- Focus indicators must be opaque and reach the WCAG non-text 3:1 threshold.
- A pair that cannot resolve to an opaque hex fails the test instead of being
  skipped.
- `token-contract.test.ts` validates CSS references, theme parity and literal
  token references in foundation stories.
- `token-scales.test.ts` validates typography, FOUC, spacing, radius,
  elevation, layer and motion contracts.

These unit gates verify token math and structure. They do not replace rendered
DOM analysis.

## Runtime Storybook audit

Run:

```bash
pnpm --filter @system-automation/design-system a11y:audit
```

The command builds Storybook, reads every story from
`storybook-static/index.json`, serves the static build on a loopback port and
runs `@axe-core/cli` with WCAG 2 A/AA, 2.1 A/AA and 2.2 AA tags. `--exit` makes
violations fail the command. Per-story JSON output is generated under
`storybook-static/a11y-results/`; `storybook-static/` is ignored by git.

## Current execution state

- Static token/component tests: run as part of the implementation gate; report
  the exact count in the delivery summary.
- Runtime axe sweep: not yet run for this revision. No pass/fail result is
  asserted here.

When the runtime sweep runs, keep its generated JSON in the ignored static
output directory or publish it as a CI artifact. Do not commit snapshots as a
permanent source of truth; the stories, tokens and current gate are authoritative.
