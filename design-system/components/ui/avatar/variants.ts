import { cva } from "class-variance-authority";

export const avatarVariants = cva(
  "relative flex size-8 shrink-0 overflow-hidden rounded-full",
);

export const avatarImageVariants = cva("aspect-square size-full");

export const avatarFallbackVariants = cva(
  "bg-muted text-muted-foreground flex size-full items-center justify-center rounded-full",
);
