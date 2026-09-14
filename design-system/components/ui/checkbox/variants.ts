import { cva } from "class-variance-authority";

export const checkboxVariants = cva(
  "peer size-4 shrink-0 cursor-pointer rounded-[4px] border ds-border-control bg-background text-foreground shadow-xs outline-none transition-colors  focus-visible:ds-focus-ring  data-[state=checked]:ds-border-emphasis-strong data-[state=checked]:bg-background data-[state=checked]:text-foreground aria-invalid:ds-border-destructive-strong aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background dark:data-[state=checked]:bg-background dark:data-[state=checked]:text-foreground dark:aria-invalid:ring-destructive/40",
);

export const checkboxIndicatorVariants = cva(
  "grid place-content-center text-current transition-none",
);
