"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "../../../lib/utils";
import { Button } from "../../ui/button";

type ButtonProps = React.ComponentProps<typeof Button>;

export type BackButtonMode = "history" | "link";

export interface BackButtonProps
  extends Omit<
    ButtonProps,
    "asChild" | "children" | "onClick" | "aria-label" | "type" | "ripple"
  > {
  /** Internal app destination used by link mode or as a history fallback. */
  href?: string;
  /** Internal destination used only when browser history has no prior entry. */
  fallbackHref?: string;
  label?: React.ReactNode;
  /** Preferred accessible-name prop used by the existing app adapters. */
  ariaLabel?: string;
  /** Compatibility alias for consumers that use the explicit accessible name. */
  accessibleLabel?: string;
  /** Runs before any router behavior and takes full control of the action. */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /** Compatibility alias for `onClick`. */
  onBack?: React.MouseEventHandler<HTMLButtonElement>;
  mode?: BackButtonMode;
  fullWidth?: boolean;
  iconOnly?: boolean;
  /** Replace instead of push when navigating to a fallback or link destination. */
  replace?: boolean;
}

const BACK_BUTTON_PRESS_STATE_CLASS =
  "transform-gpu transition-[background-color,border-color,color,box-shadow,transform] duration-fast ease-standard active:translate-y-px active:shadow-none";

const INTERNAL_URL_BASE = "https://internal.app.invalid";

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  });
}

/**
 * Accept only same-app absolute paths. Besides schemes and protocol-relative
 * URLs, this rejects control characters and backslash forms that browsers can
 * normalize into an external host (for example `/\\evil.example`).
 */
export function toInternalHref(value?: string | null): string | undefined {
  if (!value) return undefined;

  const normalized = value.trim();
  if (
    !normalized.startsWith("/") ||
    normalized.startsWith("//") ||
    normalized.startsWith("/\\") ||
    hasControlCharacter(normalized)
  ) {
    return undefined;
  }

  try {
    const parsed = new URL(normalized, INTERNAL_URL_BASE);
    if (parsed.origin !== INTERNAL_URL_BASE) return undefined;
  } catch {
    return undefined;
  }

  return normalized;
}

function BackButton({
  href,
  fallbackHref,
  label = "Voltar",
  ariaLabel,
  accessibleLabel,
  onClick,
  onBack,
  mode,
  fullWidth = false,
  iconOnly = false,
  replace = false,
  variant,
  size,
  className,
  ...props
}: BackButtonProps) {
  const router = useRouter();
  const safeHref = toInternalHref(href);
  const safeFallbackHref = toInternalHref(fallbackHref);
  const controlledAction = onClick ?? onBack;
  const resolvedMode =
    mode ??
    (safeHref && !safeFallbackHref && !controlledAction ? "link" : "history");
  const resolvedVariant = variant ?? (iconOnly ? "ghost" : "outline");
  const resolvedSize = size ?? (iconOnly ? "icon" : "sm");
  const resolvedAccessibleLabel =
    ariaLabel ??
    accessibleLabel ??
    (typeof label === "string" ? label : "Voltar");

  const handleHistoryClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (controlledAction) {
        controlledAction(event);
        return;
      }

      if (window.history.length > 1) {
        router.back();
        return;
      }

      const target = safeFallbackHref ?? safeHref;
      if (!target) return;

      if (replace) {
        router.replace(target);
        return;
      }

      router.push(target);
    },
    [controlledAction, replace, router, safeFallbackHref, safeHref],
  );

  const content = (
    <>
      <ArrowLeft className="size-4" strokeWidth={2.25} aria-hidden="true" />
      {!iconOnly ? label : null}
    </>
  );
  const resolvedClassName = cn(
    BACK_BUTTON_PRESS_STATE_CLASS,
    !iconOnly && "w-auto gap-2 bg-transparent",
    fullWidth && !iconOnly && "w-full",
    iconOnly &&
      "rounded-full border ds-border-surface bg-background/80 text-foreground shadow-xs hover:bg-hover-soft",
    className,
  );

  if (resolvedMode === "link" && safeHref) {
    return (
      <Button
        {...props}
        asChild
        variant={resolvedVariant}
        size={resolvedSize}
        ripple={iconOnly}
        className={resolvedClassName}
        aria-label={resolvedAccessibleLabel}
      >
        <Link
          href={safeHref}
          replace={replace}
          className={fullWidth && !iconOnly ? "w-full" : undefined}
        >
          {content}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      {...props}
      type="button"
      variant={resolvedVariant}
      size={resolvedSize}
      ripple={iconOnly}
      className={resolvedClassName}
      aria-label={resolvedAccessibleLabel}
      onClick={handleHistoryClick}
    >
      {content}
    </Button>
  );
}

export { BackButton };
