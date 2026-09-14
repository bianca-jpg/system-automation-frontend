import { cva } from "class-variance-authority";

export const iconCountBadgeVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full border ds-border-background",
  {
    variants: {
      variant: {
        destructive:
          "bg-destructive text-destructive-foreground-strong",
        info: "bg-info text-info-foreground-strong",
      },
      display: {
        count:
          "h-[1.1rem] min-w-[1.1rem] px-1.5 text-[10px] font-bold leading-none tabular-nums",
        dot: "size-2.5 p-0",
      },
    },
    defaultVariants: {
      variant: "info",
      display: "count",
    },
  },
);
