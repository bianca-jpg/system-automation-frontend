import { cva } from "class-variance-authority";

export const switchRootVariants = cva(
  "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 ds-border-transparent shadow-xs transition-colors focus-visible:outline-none focus-visible:ds-focus-ring  disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted",
  {
    variants: {
      size: {
        sm: "h-4 w-7",
        md: "h-5 w-9",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export const switchThumbVariants = cva(
  "pointer-events-none block rounded-full bg-white shadow-md ring-0 transition-transform data-[state=checked]:bg-primary-foreground data-[state=unchecked]:translate-x-0",
  {
    variants: {
      size: {
        sm: "h-3 w-3 data-[state=checked]:translate-x-3",
        md: "h-4 w-4 data-[state=checked]:translate-x-4",
      },
    },
    defaultVariants: { size: "md" },
  },
);
