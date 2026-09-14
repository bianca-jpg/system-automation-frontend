"use client";

import { useEffect } from "react";
import { Toaster } from "../ui/sonner";
import {
  ThemeProvider,
  type ThemeProviderProps,
} from "./theme-context";

type CentralThemeProviderProps = ThemeProviderProps;

function ColorSchemeRefreshWorkaround() {
  useEffect(() => {
    let raf = 0;
    let armed = false;
    let lastBurstAt = 0;
    const timers: number[] = [];

    const getTargetScheme = (): "light" | "dark" => {
      const root = document.documentElement;

      // Explicit overrides win.
      if (root.classList.contains("force-light-theme")) return "light";
      if (root.classList.contains("force-dark-scrollbar")) return "dark";
      if (root.classList.contains("dark")) return "dark";
      if (root.classList.contains("light")) return "light";

      // Respect CSS overrides.
      try {
        const computed = window.getComputedStyle(root).colorScheme;
        if (computed === "dark") return "dark";
        if (computed === "light") return "light";
      } catch {}

      // "System" fallback: match OS preference.
      try {
        return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
          ? "dark"
          : "light";
      } catch {
        return "light";
      }
    };

    const apply = (forceRepaint: boolean) => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const root = document.documentElement;
        const target = getTargetScheme();

        // Chromium can glitch native scrollbars (and sometimes hit-testing) when
        // a tab is backgrounded/foregrounded. Toggling `color-scheme` forces a
        // repaint without a user click.
        if (forceRepaint) {
          root.style.colorScheme = target === "dark" ? "light" : "dark";
          // Force a style flush.
          void root.offsetHeight;
        }
        root.style.colorScheme = target;
      });
    };

    const clearTimers = () => {
      while (timers.length) {
        const t = timers.pop();
        if (t) window.clearTimeout(t);
      }
    };

    const burst = () => {
      // Avoid spamming on rapid visibility/focus toggles.
      const now = Date.now();
      if (now - lastBurstAt < 400) return;
      lastBurstAt = now;

      clearTimers();
      // Chromium sometimes fails to repaint native scrollbars immediately after
      // tab activation; a short burst of forced repaints fixes it without a click.
      apply(true);
      timers.push(window.setTimeout(() => apply(true), 60));
      timers.push(window.setTimeout(() => apply(true), 180));
      timers.push(window.setTimeout(() => apply(true), 360));
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        burst();
        armed = true;
      }
    };

    const onFocus = () => burst();
    const onPageShow = () => burst();

    // Some Chromium builds only repaint native scrollbars after a user gesture.
    // If visibility activation didn't fully fix it, do one extra repaint on the
    // next pointerdown without blocking the interaction.
    const onPointerDownCapture = () => {
      if (!armed) return;
      armed = false;
      burst();
    };

    // Keep the inline color-scheme synced when the theme class changes.
    const observer = new MutationObserver(() => apply(false));

    apply(false);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("pointerdown", onPointerDownCapture, true);

    return () => {
      window.cancelAnimationFrame(raf);
      clearTimers();
      observer.disconnect();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("pointerdown", onPointerDownCapture, true);
    };
  }, []);

  return null;
}

export function CentralThemeProvider({
  children,
  nonce,
  ...props
}: CentralThemeProviderProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      enableColorScheme={false}
      disableTransitionOnChange
      nonce={nonce}
      {...props}
    >
      <ColorSchemeRefreshWorkaround />
      {children}
      <Toaster {...(nonce !== undefined ? { nonce } : {})} />
    </ThemeProvider>
  );
}
