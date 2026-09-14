import { cva } from "class-variance-authority";

export const radioGroupVariants = cva("grid gap-3");

export const radioGroupItemVariants = cva(
  "text-primary aspect-square size-4 shrink-0 rounded-full border ds-border-control shadow-xs outline-none transition-[color,box-shadow,border-color]  focus-visible:ds-focus-ring  aria-invalid:ring-destructive/20 aria-invalid:ds-border-destructive-strong disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:aria-invalid:ring-destructive/40",
);

export const radioGroupIndicatorVariants = cva(
  "relative flex items-center justify-center",
);
