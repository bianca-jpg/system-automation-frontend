import { cva } from "class-variance-authority";

export const dropdownMenuItemVariants = cva(
  // Base item classes — cursor + select + transitions + icon sizing + hover surface
  "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors outline-hidden hover:bg-hover-soft hover:text-foreground data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "",
        destructive: "text-destructive focus:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
