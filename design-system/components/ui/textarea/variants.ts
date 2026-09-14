import { cva } from "class-variance-authority";

export const textareaVariants = cva(
  "flex min-h-20 w-full rounded-md border ds-border-control bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none  focus-visible:ds-focus-ring  disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
);
