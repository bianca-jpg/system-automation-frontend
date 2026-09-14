"use client";

import { useEffect } from "react";

type ForcedDocumentThemeMode = "light" | "dark";

interface ForcedDocumentThemeProps {
  mode: ForcedDocumentThemeMode;
  themeColor?: string;
}

const TRACKED_ROOT_CLASSES = [
  "light",
  "dark",
  "force-light-theme",
  "force-dark-scrollbar",
] as const;

const MODE_TO_ROOT_CLASSES: Record<ForcedDocumentThemeMode, readonly string[]> =
  {
    light: ["light", "force-light-theme"],
    dark: ["dark", "force-dark-scrollbar"],
  };

export function ForcedDocumentTheme({
  mode,
  themeColor,
}: ForcedDocumentThemeProps) {
  useEffect(() => {
    const root = document.documentElement;
    const previousClassState = Object.fromEntries(
      TRACKED_ROOT_CLASSES.map((className) => [
        className,
        root.classList.contains(className),
      ]),
    ) as Record<(typeof TRACKED_ROOT_CLASSES)[number], boolean>;

    for (const className of TRACKED_ROOT_CLASSES) {
      root.classList.remove(className);
    }

    for (const className of MODE_TO_ROOT_CLASSES[mode]) {
      root.classList.add(className);
    }

    const existingThemeColor = document.querySelector(
      'meta[name="theme-color"]',
    ) as HTMLMetaElement | null;
    const originalThemeColor =
      existingThemeColor?.getAttribute("content") ?? null;
    const themeColorMeta = existingThemeColor ?? document.createElement("meta");
    const createdThemeColor =
      Boolean(themeColor) && existingThemeColor === null;

    if (themeColor) {
      if (createdThemeColor) {
        themeColorMeta.setAttribute("name", "theme-color");
        document.head.appendChild(themeColorMeta);
      }
      themeColorMeta.setAttribute("content", themeColor);
    }

    return () => {
      for (const className of TRACKED_ROOT_CLASSES) {
        if (previousClassState[className]) {
          root.classList.add(className);
          continue;
        }

        root.classList.remove(className);
      }

      if (!themeColor) {
        return;
      }

      if (createdThemeColor) {
        themeColorMeta.remove();
        return;
      }

      if (originalThemeColor !== null) {
        themeColorMeta.setAttribute("content", originalThemeColor);
        return;
      }

      themeColorMeta.removeAttribute("content");
    };
  }, [mode, themeColor]);

  return null;
}
