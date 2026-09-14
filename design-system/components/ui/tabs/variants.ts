import { cva } from "class-variance-authority";

export const tabsListVariants = cva(
  "inline-flex items-center text-muted-foreground",
  {
    variants: {
      variant: {
        default: "h-10 justify-center rounded-md bg-muted p-1",
        pill: "inline-flex h-auto max-w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-full bg-muted p-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export const tabsTriggerVariants = cva(
  "relative isolate inline-flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap font-medium ring-offset-background transform-gpu transition-[background-color,border-color,color,box-shadow,transform] duration-standard active:translate-y-px active:shadow-none focus-visible:outline-none focus-visible:ds-focus-ring   disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "rounded-sm px-3 py-1.5 text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        pill: "h-8 shrink-0 rounded-full px-3.5 text-sm text-muted-foreground hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
