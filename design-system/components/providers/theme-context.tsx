"use client";

import * as React from "react";

import {
  COLOR_THEMES,
  COLOR_THEME_STORAGE_KEY,
  DEFAULT_COLOR_THEME,
  type ColorThemeMeta,
} from "../../lib/theme-registry";

type ThemeName = "light" | "dark";
type ThemeValue = ThemeName | "system" | (string & {});

type ThemeContextValue = {
  theme: ThemeValue | undefined;
  setTheme: (theme: ThemeValue | ((theme: ThemeValue | undefined) => ThemeValue)) => void;
  forcedTheme?: ThemeValue | undefined;
  resolvedTheme: ThemeName;
  themes: ThemeValue[];
  systemTheme?: ThemeName | undefined;
  /** Color-theme axis (data-theme), orthogonal to the light/dark mode. */
  colorTheme: string;
  setColorTheme: (id: string) => void;
  colorThemes: ColorThemeMeta[];
};

type ThemeAttribute = "class" | `data-${string}` | (string & {}) | string[];

export type ThemeProviderProps = {
  children: React.ReactNode;
  attribute?: ThemeAttribute | undefined;
  defaultTheme?: ThemeValue | undefined;
  disableTransitionOnChange?: boolean | undefined;
  enableColorScheme?: boolean | undefined;
  enableSystem?: boolean | undefined;
  forcedTheme?: ThemeValue | undefined;
  nonce?: string | undefined;
  storageKey?: string | undefined;
  themes?: ThemeValue[] | undefined;
  value?: Record<string, string> | undefined;
  colorThemes?: ColorThemeMeta[] | undefined;
  defaultColorTheme?: string | undefined;
  colorStorageKey?: string | undefined;
};

const DEFAULT_THEMES: ThemeValue[] = ["light", "dark"];
const MEDIA_QUERY = "(prefers-color-scheme: dark)";
const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): ThemeName {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia?.(MEDIA_QUERY)?.matches ? "dark" : "light";
}

function getStoredTheme(storageKey: string, fallback: ThemeValue): ThemeValue {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    return (window.localStorage.getItem(storageKey) as ThemeValue | null) || fallback;
  } catch {
    return fallback;
  }
}

function disableTransitionsTemporarily(nonce?: string) {
  const style = document.createElement("style");
  if (nonce) {
    style.setAttribute("nonce", nonce);
  }
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{transition:none!important;-webkit-transition:none!important}",
    ),
  );
  document.head.appendChild(style);

  return () => {
    window.getComputedStyle(document.body);
    window.setTimeout(() => {
      style.remove();
    }, 1);
  };
}

function resolveTheme(theme: ThemeValue | undefined, systemTheme: ThemeName, enableSystem: boolean): ThemeName {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  if (theme === "system" && enableSystem) {
    return systemTheme;
  }
  return "light";
}

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme,
  disableTransitionOnChange = false,
  enableColorScheme = true,
  enableSystem = true,
  forcedTheme,
  nonce,
  storageKey = "theme",
  themes = DEFAULT_THEMES,
  value,
  colorThemes = COLOR_THEMES,
  defaultColorTheme = DEFAULT_COLOR_THEME,
  colorStorageKey = COLOR_THEME_STORAGE_KEY,
}: ThemeProviderProps) {
  const fallbackTheme = defaultTheme ?? (enableSystem ? "system" : "light");
  const [theme, setThemeState] = React.useState<ThemeValue | undefined>(() => getStoredTheme(storageKey, fallbackTheme));
  const [systemTheme, setSystemTheme] = React.useState<ThemeName>(() => getSystemTheme());
  const [colorTheme, setColorThemeState] = React.useState<string>(
    () => getStoredTheme(colorStorageKey, defaultColorTheme) as string,
  );

  const resolvedTheme = resolveTheme(forcedTheme ?? theme, systemTheme, enableSystem);

  const applyTheme = React.useCallback(
    (themeToApply: ThemeValue | undefined, resolved: ThemeName) => {
      const root = document.documentElement;
      const restoreTransitions = disableTransitionOnChange ? disableTransitionsTemporarily(nonce) : undefined;
      const configuredThemes = value ? Object.values(value) : themes.map((item) => value?.[item] ?? item);
      const className = value?.[themeToApply ?? ""] ?? resolved;

      const applyAttribute = (attr: string) => {
        if (attr === "class") {
          root.classList.remove(...configuredThemes);
          root.classList.add(className);
          return;
        }
        if (attr.startsWith("data-")) {
          root.setAttribute(attr, className);
        }
      };

      if (Array.isArray(attribute)) {
        attribute.forEach(applyAttribute);
      } else {
        applyAttribute(attribute);
      }

      if (enableColorScheme) {
        root.style.colorScheme = resolved;
      }
      restoreTransitions?.();
    },
    [attribute, disableTransitionOnChange, enableColorScheme, nonce, themes, value],
  );

  React.useEffect(() => {
    applyTheme(forcedTheme ?? theme, resolvedTheme);
  }, [applyTheme, forcedTheme, resolvedTheme, theme]);

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", colorTheme);
  }, [colorTheme]);

  React.useEffect(() => {
    if (!enableSystem) return;
    const media = window.matchMedia(MEDIA_QUERY);
    const handleChange = () => setSystemTheme(getSystemTheme());
    media.addEventListener?.("change", handleChange);
    return () => media.removeEventListener?.("change", handleChange);
  }, [enableSystem]);

  React.useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        setThemeState((event.newValue as ThemeValue | null) || fallbackTheme);
      } else if (event.key === colorStorageKey) {
        setColorThemeState(event.newValue || defaultColorTheme);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [colorStorageKey, defaultColorTheme, fallbackTheme, storageKey]);

  const setTheme = React.useCallback(
    (next: ThemeValue | ((theme: ThemeValue | undefined) => ThemeValue)) => {
      setThemeState((previous) => {
        const resolvedNext = typeof next === "function" ? next(previous) : next;
        try {
          window.localStorage.setItem(storageKey, resolvedNext);
        } catch {}
        return resolvedNext;
      });
    },
    [storageKey],
  );

  const setColorTheme = React.useCallback(
    (id: string) => {
      try {
        window.localStorage.setItem(colorStorageKey, id);
      } catch {}
      setColorThemeState(id);
    },
    [colorStorageKey],
  );

  const contextValue = React.useMemo<ThemeContextValue>(
    () => ({
      theme: forcedTheme ?? theme,
      setTheme,
      forcedTheme,
      resolvedTheme,
      themes: enableSystem ? [...themes, "system"] : themes,
      systemTheme: enableSystem ? systemTheme : undefined,
      colorTheme,
      setColorTheme,
      colorThemes,
    }),
    [
      colorTheme,
      colorThemes,
      enableSystem,
      forcedTheme,
      resolvedTheme,
      setColorTheme,
      setTheme,
      systemTheme,
      theme,
      themes,
    ],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return React.useContext(ThemeContext) ?? {
    theme: undefined,
    setTheme: () => {},
    resolvedTheme: "light" as const,
    themes: [],
    colorTheme: DEFAULT_COLOR_THEME,
    setColorTheme: () => {},
    colorThemes: COLOR_THEMES,
  };
}
