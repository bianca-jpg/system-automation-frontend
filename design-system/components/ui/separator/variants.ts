import { cva } from "class-variance-authority";

export const separatorVariants = cva(
  "shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
  {
    variants: {
      variant: {
        default: "bg-border",
        divider: "bg-[color:var(--ds-border-divider)]",
        seam: "bg-[color:var(--ds-border-seam)]",
        surface: "bg-[color:var(--ds-border-surface)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
