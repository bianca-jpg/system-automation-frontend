import * as React from "react";

import { cn } from "../../../lib/utils";
import { spinnerVariants } from "./variants";

export type SpinnerProps = React.ComponentProps<"svg"> & {
  /** Makes the spinner an announced status. Omit for a decorative spinner. */
  label?: string;
};

export function Spinner({
  className,
  label,
  "aria-label": ariaLabel,
  role,
  ...props
}: SpinnerProps) {
  const accessibleLabel = label ?? ariaLabel;

  return (
    <svg
      data-slot="spinner"
      viewBox="25 25 50 50"
      className={cn(spinnerVariants(), className)}
      role={accessibleLabel ? (role ?? "status") : role}
      aria-label={accessibleLabel}
      aria-hidden={accessibleLabel ? undefined : true}
      focusable="false"
      {...props}
    >
      <circle
        className="ds-spinner__circle"
        cx="50"
        cy="50"
        r="20"
        strokeWidth="2"
      />
    </svg>
  );
}
