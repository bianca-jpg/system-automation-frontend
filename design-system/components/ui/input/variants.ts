import { cva } from "class-variance-authority";

export const inputVariants = cva(
  "file:text-foreground h-12 w-full min-w-0 rounded-md border ds-border-control bg-transparent px-3 py-1 text-base text-foreground shadow-xs outline-none transition-[color,box-shadow,border-color] placeholder:text-muted-foreground file:inline-flex file:h-12 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm  focus-visible:ds-focus-ring  aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:ds-border-destructive-strong",
);
