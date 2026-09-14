import * as React from "react";
import type { VariantProps } from "class-variance-authority";

import { cn } from "../../../lib/utils";
import { iconCountBadgeVariants } from "./variants";

export interface IconCountBadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof iconCountBadgeVariants> {
  count: number;
  maxCount?: number;
  showZero?: boolean;
}

function normalizeCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function formatCount(value: number, maxCount: number): string {
  return value > maxCount ? `${maxCount}+` : String(value);
}

function IconCountBadge({
  count,
  maxCount = 99,
  showZero = false,
  variant,
  display,
  className,
  ...props
}: IconCountBadgeProps) {
  const normalized = normalizeCount(count);
  if (!showZero && normalized <= 0) return null;

  return (
    <span
      data-slot="icon-count-badge"
      data-display={display ?? "count"}
      className={cn(iconCountBadgeVariants({ variant, display }), className)}
      {...props}
    >
      {display === "dot"
        ? null
        : formatCount(normalized, Math.max(1, Math.floor(maxCount)))}
    </span>
  );
}

export { IconCountBadge };
export { iconCountBadgeVariants } from "./variants";
