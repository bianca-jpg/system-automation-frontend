"use client";

import * as React from "react";

import { cn } from "../../../lib/utils";
import { switchRootVariants, switchThumbVariants } from "./variants";

interface SwitchProps extends Omit<React.ComponentProps<"button">, "onClick"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: "sm" | "md";
}

function Switch({
  className,
  checked = false,
  onCheckedChange,
  size = "md",
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-slot="switch"
      data-state={checked ? "checked" : "unchecked"}
      className={cn(switchRootVariants({ size }), className)}
      onClick={(e) => {
        e.stopPropagation();
        onCheckedChange?.(!checked);
      }}
      {...props}
    >
      <span
        data-slot="switch-thumb"
        data-state={checked ? "checked" : "unchecked"}
        className={switchThumbVariants({ size })}
      />
    </button>
  );
}

export { Switch };
export type { SwitchProps };
