/**
 * Color-theme registry (Onda 3) — the `data-theme` axis, ORTHOGONAL to the
 * light/dark MODE (which stays on the `.light`/`.dark` class).
 *
 * Adding a new brand/color theme is a two-step, no-component-change operation:
 *   1. Add an entry here.
 *   2. Create `tokens/themes/<id>.css` with a `[data-theme="<id>"]` block that
 *      redefines the `--brand-*` primitives (and its `.dark` overrides), then
 *      import it in `foundation.css`.
 *
 * "default" is the default: its primitives already live in `:root` / `.dark`
 * (tokens/colors.css), so `data-theme="default"` needs no extra CSS.
 */
export type ColorThemeMeta = {
  /** Value written to `data-theme` on <html> and persisted in localStorage. */
  id: string;
  /** Human label for the theme picker. */
  label: string;
  /** Swatch shown in the picker (accent + surface preview). */
  swatch: { accent: string; surface: string };
};

export const COLOR_THEMES: ColorThemeMeta[] = [
  {
    id: "default",
    label: "Default",
    swatch: { accent: "#000000", surface: "#ffffff" },
  },
  {
    id: "blue-ocean",
    label: "Blue Ocean",
    swatch: { accent: "#0b6fd4", surface: "#f5f9ff" },
  },
  {
    id: "purple-rain",
    label: "Purple Rain",
    swatch: { accent: "#7c3aed", surface: "#f7f3fe" },
  },
  {
    id: "sweet-pie",
    label: "Sweet Pie",
    swatch: { accent: "#df5b9b", surface: "#fff6fa" },
  },
];

export const DEFAULT_COLOR_THEME = "default";

/** localStorage key for the color-theme axis (mode stays on "theme"). */
export const COLOR_THEME_STORAGE_KEY = "color-theme";
