"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { VariantProps } from "class-variance-authority";

import { cn } from "../../../lib/utils";
import { buttonVariants } from "../button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip";

type CopyButtonProps = {
  text: string;
  className?: string;
  ariaLabel?: string;
  showLabel?: boolean; // when false, render icon-only
  tooltip?: boolean;
  copyLabel?: string;
  copiedLabel?: string;
  resetDelayMs?: number;
  stopPropagation?: boolean;
  preventDefault?: boolean;
  onCopied?: () => void;
  onCopyError?: (error: unknown) => void;
  appearance?: "inline" | "button";
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
};

function CopyButton({
  text,
  className,
  ariaLabel,
  showLabel = true,
  tooltip = false,
  copyLabel = "Copiar",
  copiedLabel = "Copiado",
  resetDelayMs = 2000,
  stopPropagation = false,
  preventDefault = false,
  onCopied,
  onCopyError,
  appearance = "inline",
  variant,
  size,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const resolvedAriaLabel = ariaLabel ?? copyLabel;
  const resolvedVariant =
    appearance === "button" ? (variant ?? "outline") : variant;
  const resolvedSize =
    appearance === "button" ? (size ?? (showLabel ? "sm" : "icon")) : size;
  const isIconSize = resolvedSize?.startsWith("icon");

  async function handleCopy(event: React.MouseEvent<HTMLButtonElement>) {
    if (stopPropagation) {
      event.stopPropagation();
    }
    if (preventDefault) {
      event.preventDefault();
    }

    try {
      await navigator.clipboard.writeText(text ?? "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), resetDelayMs);
      onCopied?.();
    } catch (error) {
      onCopyError?.(error);
    }
  }

  const baseClass =
    appearance === "button"
      ? cn(
          buttonVariants({ variant: resolvedVariant, size: resolvedSize }),
          !isIconSize && "w-auto",
        )
      : showLabel
        ? "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-hover-soft hover:text-foreground transition-colors cursor-pointer"
        : "inline-flex items-center justify-center rounded-md h-7 w-7 text-muted-foreground hover:bg-hover-soft hover:text-foreground transition-colors cursor-pointer";

  const iconClassName = appearance === "button" ? "h-4 w-4" : "h-3.5 w-3.5";
  const icon = copied ? (
    <Check className={cn(iconClassName, "text-success")} />
  ) : (
    <Copy className={iconClassName} />
  );
  const label = copied ? copiedLabel : copyLabel;

  const buttonNode = (
    <button
      type="button"
      data-slot="copy-button"
      onClick={handleCopy}
      aria-label={resolvedAriaLabel}
      title={resolvedAriaLabel}
      className={cn(baseClass, className)}
    >
      {icon}
      {showLabel ? <span className="select-none">{label}</span> : null}
    </button>
  );

  if (!tooltip) {
    return buttonNode;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{buttonNode}</TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export { CopyButton };
