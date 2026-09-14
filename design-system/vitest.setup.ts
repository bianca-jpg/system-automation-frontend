// Plan 38-3 Task 1 — DS Vitest setup.
//
// Source: storybook.js.org/docs/api/portable-stories/portable-stories-vitest
//
// Pitfall #3 mitigation: setProjectAnnotations registers theme/decorator project-level
// annotations from .storybook/preview.tsx so composeStories smoke tests see the same
// decorators (withThemeByClassName, a11y parameters) as Storybook itself. Without
// this, smoke tests that depend on theme-class context would fail.
import "@testing-library/jest-dom/vitest";
import { setProjectAnnotations } from "@storybook/react";

import * as preview from "./.storybook/preview";

setProjectAnnotations([preview]);

// jsdom polyfills (Rule 2 — missing critical functionality discovered in Task 2).
// jsdom 29.1.1 doesn't ship ResizeObserver or IntersectionObserver; several DS
// primitives need them at mount time:
//   - cmdk (Command) uses ResizeObserver to track its list dimensions
//   - input-otp uses ResizeObserver to align slot widths
//   - framer-motion uses IntersectionObserver for `whileInView` + viewport detectors
// Without polyfills, smoke renders throw `ReferenceError`. The polyfills are no-op
// stubs — sufficient for render-without-throw; visual behavior is covered by
// Storybook (real browser) + Playwright (Plan 38-4, real Chromium).
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

class IntersectionObserverStub {
  readonly root: Element | null = null;
  readonly rootMargin: string = "0px";
  readonly thresholds: ReadonlyArray<number> = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof globalThis.ResizeObserver;
}

if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver =
    IntersectionObserverStub as unknown as typeof globalThis.IntersectionObserver;
}

// jsdom doesn't implement Element.prototype.scrollIntoView. cmdk's Command component
// calls it when focusing the first item — without the stub, mount throws TypeError.
// No-op is sufficient because scroll behavior is a real-browser concern (Playwright).
if (
  typeof Element !== "undefined" &&
  typeof Element.prototype.scrollIntoView !== "function"
) {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {
    /* no-op for jsdom */
  };
}
