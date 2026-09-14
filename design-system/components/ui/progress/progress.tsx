"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import type { VariantProps } from "class-variance-authority";

import { cn } from "../../../lib/utils";
import { progressIndicatorVariants, progressVariants } from "./variants";

interface ProgressProps
  extends React.ComponentProps<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  value?: number;
  indeterminate?: boolean;
}

function Progress({
  className,
  value = 0,
  max = 100,
  variant,
  indeterminate = false,
  "aria-busy": ariaBusy,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: ProgressProps) {
  const safeMax = typeof max === "number" && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value)
    ? Math.min(safeMax, Math.max(0, value))
    : 0;
  const percentage = (safeValue / safeMax) * 100;
  const normalizedLabel = ariaLabel?.trim();
  const normalizedLabelledBy = ariaLabelledBy?.trim();

  // A progressbar cannot be decorative: unlike a spinner, its value conveys
  // state. Keep a truthful neutral name as the safe baseline, while letting
  // consumers provide the contextual name (or link visible copy) whenever the
  // surrounding flow knows what is progressing.
  const accessibleLabel = normalizedLabelledBy
    ? undefined
    : normalizedLabel || "Progresso";

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(progressVariants({ variant }), className)}
      value={indeterminate ? null : safeValue}
      max={safeMax}
      aria-busy={indeterminate ? true : ariaBusy}
      aria-label={accessibleLabel}
      aria-labelledby={normalizedLabelledBy}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          progressIndicatorVariants({ variant }),
          indeterminate &&
            "animate-[progress-indeterminate_1.5s_ease-in-out_infinite]",
        )}
        style={
          indeterminate
            ? { transform: "translateX(-100%)", width: "25%" }
            : { transform: `translateX(-${100 - percentage}%)` }
        }
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
export { progressVariants, progressIndicatorVariants } from "./variants";
