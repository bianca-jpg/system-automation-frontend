import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import type { VariantProps } from "class-variance-authority";

import { cn } from "../../../lib/utils";
import { badgeVariants } from "./variants";

function Badge({
  className,
  variant,
  size,
  asChild = false,
  dot = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
    /** Ponto de status na cor do texto. Ignorado com `asChild` (Slot exige filho único). */
    dot?: boolean;
  }) {
  if (asChild) {
    // Slot exige filho único — repassa children intactos (sem dot).
    return (
      <Slot
        data-slot="badge"
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {children}
      </Slot>
    );
  }

  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full bg-current"
        />
      ) : null}
      {children}
    </span>
  );
}

export { Badge };
export {
  badgeVariants,
  type BadgeVariant,
  type BadgeSize,
} from "./variants";
