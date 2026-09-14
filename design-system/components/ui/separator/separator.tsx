"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import type { VariantProps } from "class-variance-authority";

import { cn } from "../../../lib/utils";
import { separatorVariants } from "./variants";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  variant,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root> &
  VariantProps<typeof separatorVariants>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(separatorVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Separator };
export { separatorVariants } from "./variants";
