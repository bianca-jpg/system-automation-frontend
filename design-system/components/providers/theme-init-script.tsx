import {
  COLOR_THEME_STORAGE_KEY,
  DEFAULT_COLOR_THEME,
} from "../../lib/theme-registry";

type ThemeInitScriptProps = {
  nonce?: string | undefined;
  storageKey?: string | undefined;
  defaultTheme?: "system" | "light" | "dark" | undefined;
  enableSystem?: boolean | undefined;
  colorStorageKey?: string | undefined;
  defaultColorTheme?: string | undefined;
};

function buildThemeInitScript({
  storageKey = "theme",
  defaultTheme = "system",
  enableSystem = true,
  colorStorageKey = COLOR_THEME_STORAGE_KEY,
  defaultColorTheme = DEFAULT_COLOR_THEME,
}: Omit<ThemeInitScriptProps, "nonce">) {
  return `(function(){try{var d=document.documentElement;var storageKey=${JSON.stringify(storageKey)};var defaultTheme=${JSON.stringify(defaultTheme)};var enableSystem=${JSON.stringify(enableSystem)};var stored=localStorage.getItem(storageKey);var theme=stored||defaultTheme;var systemDark=enableSystem&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;var resolved=theme==="dark"?"dark":theme==="light"?"light":systemDark?"dark":"light";d.classList.remove("light","dark");d.classList.add(resolved);d.style.colorScheme=resolved;var colorTheme=localStorage.getItem(${JSON.stringify(colorStorageKey)})||${JSON.stringify(defaultColorTheme)};d.setAttribute("data-theme",colorTheme);}catch(e){}})();`;
}

export function ThemeInitScript({
  nonce,
  storageKey = "theme",
  defaultTheme = "system",
  enableSystem = true,
  colorStorageKey = COLOR_THEME_STORAGE_KEY,
  defaultColorTheme = DEFAULT_COLOR_THEME,
}: ThemeInitScriptProps) {
  return (
    <script
      data-slot="theme-init-script"
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: buildThemeInitScript({
          storageKey,
          defaultTheme,
          enableSystem,
          colorStorageKey,
          defaultColorTheme,
        }),
      }}
      suppressHydrationWarning
    />
  );
}
