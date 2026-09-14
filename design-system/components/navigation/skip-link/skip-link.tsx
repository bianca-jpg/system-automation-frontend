import * as React from "react";

import { cn } from "../../../lib/utils";

export interface SkipLinkProps extends Omit<React.ComponentProps<"a">, "href"> {
  /** `id` of the landmark that receives navigation, without the leading `#`. */
  targetId?: string;
  "data-slot"?: string;
}

/**
 * Keyboard-first shortcut to the page's primary landmark.
 *
 * The destination should normally be a `<main id={targetId} tabIndex={-1}>` so
 * browsers can move both the viewport and programmatic focus consistently.
 */
function SkipLink({
  targetId = "main-content",
  className,
  children = "Pular para o conteúdo principal",
  "data-slot": dataSlot = "skip-link",
  ...props
}: SkipLinkProps) {
  return (
    <a
      {...props}
      data-slot={dataSlot}
      href={`#${targetId}`}
      className={cn(
        "fixed left-[var(--space-page-gutter)] top-[var(--space-page-gutter)] z-skip-link -translate-y-[calc(100%+var(--space-page-gutter))] whitespace-nowrap rounded-interactive border ds-border-control-strong bg-background px-4 py-2 text-sm font-medium text-foreground opacity-0 shadow-popover outline-none transition-[transform,opacity,box-shadow,border-color] duration-fast ease-standard focus-visible:translate-y-0  focus-visible:opacity-100 focus-visible:ds-focus-ring    motion-reduce:transition-none",
        className,
      )}
    >
      {children}
    </a>
  );
}

export { SkipLink };
