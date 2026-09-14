import * as React from "react";
import type { VariantProps } from "class-variance-authority";

import { cn } from "../../../lib/utils";
import { Button } from "../button";
import {
  actionButtonRippleVariants,
  actionButtonVariants,
} from "./variants";

type ActionButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "variant" | "size" | "ripple" | "rippleClassName"
> &
  VariantProps<typeof actionButtonVariants> & {
    rippleClassName?: string;
  };

function ActionButton({
  className,
  variant,
  size,
  width,
  shape,
  rippleClassName,
  ...props
}: ActionButtonProps) {
  return (
    <Button
      data-slot="action-button"
      variant="ghost"
      size="default"
      ripple
      className={cn(
        actionButtonVariants({ variant, size, width, shape }),
        className,
      )}
      rippleClassName={cn(
        actionButtonRippleVariants({ variant }),
        rippleClassName,
      )}
      {...props}
    />
  );
}

export { ActionButton };
export {
  actionButtonVariants,
  actionButtonRippleVariants,
} from "./variants";
