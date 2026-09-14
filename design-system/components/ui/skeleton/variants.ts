import { cva } from "class-variance-authority";

export const skeletonVariants = cva(
  "animate-pulse motion-reduce:animate-none rounded-md bg-hover-soft",
);
