import { AlertTriangle } from "lucide-react";

import { cn } from "../../../lib/utils";

interface CapsLockWarningProps {
  visible: boolean;
  className?: string;
  message?: string;
  /** Optional id for aria-describedby on the associated input (a11y). */
  id?: string;
}

function CapsLockWarning({
  visible,
  className,
  message = "Caps Lock está ativado.",
  id,
}: CapsLockWarningProps) {
  if (!visible) {
    return null;
  }

  return (
    <p
      id={id}
      data-slot="caps-lock-warning"
      role="status"
      aria-live="polite"
      className={cn(
        "mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-warning-text",
        className,
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

export { CapsLockWarning };
