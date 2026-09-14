import { Check } from "lucide-react";
import type * as React from "react";

import { cn } from "../../../lib/utils";

export type MessageReceiptStatus = "sending" | "received" | "read";

export type MessageReceiptProps = Omit<
  React.ComponentPropsWithoutRef<"span">,
  "aria-label" | "children" | "title"
> & {
  /** Delivery state represented by one or two check marks. */
  status: MessageReceiptStatus;
  /** Exposes the pt-BR description as a native hover tooltip. */
  showTooltip?: boolean;
};

const RECEIPT_META: Record<
  MessageReceiptStatus,
  { checkCount: 1 | 2; className: string; label: string }
> = {
  sending: {
    checkCount: 1,
    className: "text-message-receipt-sending",
    label: "Enviando",
  },
  received: {
    checkCount: 2,
    className: "text-message-receipt-received",
    label: "Recebida pelo sistema",
  },
  read: {
    checkCount: 2,
    className: "text-message-receipt-read",
    label: "Visualizada",
  },
};

/**
 * Compact, non-interactive delivery receipt for outgoing chat messages.
 *
 * The native title supplies a pointer tooltip without adding another keyboard
 * stop; assistive technology receives the same localized label via role/name.
 */
export function MessageReceipt({
  className,
  showTooltip = true,
  status,
  ...props
}: MessageReceiptProps) {
  const meta = RECEIPT_META[status];

  return (
    <span
      data-slot="message-receipt"
      data-status={status}
      role="img"
      aria-label={meta.label}
      title={showTooltip ? meta.label : undefined}
      className={cn(
        "inline-flex min-h-4 min-w-4 items-center justify-center align-text-bottom leading-none",
        meta.className,
        className,
      )}
      {...props}
    >
      {Array.from({ length: meta.checkCount }, (_, index) => (
        <Check
          key={index}
          aria-hidden="true"
          className={cn("size-4 shrink-0", index > 0 && "-ml-2")}
          strokeWidth={2.25}
        />
      ))}
    </span>
  );
}
