import { cva } from "class-variance-authority";

export const tooltipContentVariants = cva(
  // Base styles + animation + positioning slide-ins
  "z-50 overflow-hidden rounded-lg shadow-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:pointer-events-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  {
    variants: {
      variant: {
        // Drift-cleanup: replaced palette-default classes with semantic tokens
        // (bg-foreground / text-background). The --foreground token already inverts
        // per theme so the inverted-surface effect is preserved. Pitfall #3 mitigation.
        default:
          "px-3 py-1.5 text-xs bg-foreground text-background max-w-[300px]",
        info: "px-4 py-3 text-sm bg-[color:var(--background-elevated)] text-foreground border ds-border-surface max-w-[360px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
