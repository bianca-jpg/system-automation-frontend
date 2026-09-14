import { cva } from "class-variance-authority";

export const dialogContentVariants = cva(
  "relative z-50 w-full max-w-[calc(100vw-2rem)] border ds-border-surface bg-background shadow-[var(--shadow-popover)] duration-200 isolate data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:pointer-events-none",
  {
    variants: {
      size: {
        sm: "sm:max-w-md",
        md: "sm:max-w-lg",
        lg: "sm:max-w-xl",
        xl: "sm:max-w-2xl",
        "2xl": "sm:max-w-3xl",
        "3xl": "sm:max-w-4xl",
        "4xl": "sm:max-w-5xl",
        fit: "sm:max-w-max",
        full: "max-w-[calc(100vw-2rem)]",
      },
      surface: {
        default:
          "grid max-h-[90vh] gap-5 overflow-y-auto rounded-[var(--radius-card)] p-6",
        panel:
          "flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[var(--radius-card)] p-0",
      },
    },
    defaultVariants: {
      size: "md",
      surface: "default",
    },
  },
);
