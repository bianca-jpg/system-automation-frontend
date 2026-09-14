import { cva } from "class-variance-authority";

/**
 * Convention 0.B — ActionButton is at the 4-axes cap (variant × size × width × shape).
 * ESLint rule `ds/cva-max-axes: ["warn", { max: 4 }]` passes (= 4, not > 4).
 * Do NOT add a 5th axis — promote axes via composition or accept compound variants instead.
 */
export const actionButtonVariants = cva(
  [
    "min-h-11 rounded-[calc(var(--radius-control)+0.125rem)] border px-5 font-bold leading-none tracking-[-0.015em]",
    "transition-[box-shadow,border-color,background-color,color] duration-200",
    "disabled:shadow-none",
    "[&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        primary: [
          "border-transparent bg-clip-padding bg-primary text-primary-foreground",
          "shadow-none hover:bg-primary/94",
        ],
        secondary: [
          "ds-border-control bg-background text-foreground shadow-none",
          "hover:ds-border-control-strong hover:bg-muted/35",
        ],
        danger: [
          "border-transparent bg-clip-padding bg-destructive text-destructive-foreground-strong",
          "shadow-none hover:bg-destructive/92",
        ],
        subtle: [
          "ds-border-neutral bg-muted/55 text-foreground shadow-none",
          "hover:bg-muted",
        ],
        contrast: [
          // "contrast" variant is white-bg + dark-text by design (used on dark
          // overlays/hero surfaces). --contrast-foreground locks a dark ink
          // regardless of theme (Onda 4: replaced palette-locked text-zinc-950).
          "border-transparent bg-clip-padding bg-white text-[color:var(--contrast-foreground)] shadow-none",
          "hover:bg-white/92 hover:text-[color:var(--contrast-foreground)]",
          "disabled:opacity-80 aria-disabled:opacity-80",
        ],
        overlay: [
          "ds-border-inverse bg-white/6 text-white shadow-none",
          "hover:ds-border-inverse-strong hover:bg-white/10",
        ],
      },
      size: {
        default: "h-11 text-sm",
        sm: "min-h-10 h-10 rounded-[var(--radius-control)] px-4 text-sm",
        lg: "min-h-12 h-12 rounded-[calc(var(--radius-control)+0.25rem)] px-6 text-[0.95rem]",
      },
      width: {
        auto: "w-fit",
        full: "w-full",
      },
      shape: {
        default: "",
        pill: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
      width: "full",
      shape: "default",
    },
  },
);

export const actionButtonRippleVariants = cva("", {
  variants: {
    variant: {
      primary: "bg-white/20",
      secondary: "bg-foreground/10",
      danger: "bg-white/18",
      subtle: "bg-foreground/12",
      contrast: "bg-foreground/10",
      overlay: "bg-white/14",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});
