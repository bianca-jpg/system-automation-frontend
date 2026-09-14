import { cva } from "class-variance-authority";

export const inputOTPSlotVariants = cva(
  "relative flex h-10 w-10 items-center justify-center border-y border-r ds-border-control text-sm transition-all first:rounded-l-md first:border-l",
  {
    variants: {
      active: {
        true: "z-10 ds-focus-ring",
        false: "",
      },
    },
    defaultVariants: { active: false },
  },
);
