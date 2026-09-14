import { cva } from "class-variance-authority";

export const cardVariants = cva(
  "flex flex-col rounded-[var(--radius-card)] border py-6 transition-[background-color,border-color,box-shadow] duration-200",
  {
    variants: {
      variant: {
        default:
          "ds-border-card bg-[color:var(--card)] text-[color:var(--card-foreground)]",
        elevated:
          "ds-border-card bg-[color:var(--background-elevated)] text-[color:var(--card-foreground)] shadow-[var(--shadow-card)]",
        panel:
          "ds-border-seam bg-[color:var(--background-elevated)] text-[color:var(--card-foreground)] shadow-none",
        soft: "ds-border-card bg-[color:var(--surface)] text-[color:var(--card-foreground)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export const cardHeaderVariants = cva(
  "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
);

export const cardTitleVariants = cva("leading-none font-bold");

export const cardDescriptionVariants = cva("text-muted-foreground text-sm");

export const cardActionVariants = cva(
  "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
);

export const cardContentVariants = cva("px-6");

export const cardFooterVariants = cva(
  "flex items-center px-6 [.border-t]:pt-6",
);
