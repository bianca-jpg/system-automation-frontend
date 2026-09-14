"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, CircleX, Info } from "lucide-react";
import type {
  ToasterProps as SonnerToasterProps,
  ToastClassnames,
} from "sonner";

import { cn } from "../../../lib/utils";
import { useTheme } from "../../providers/theme-context";
import { Spinner } from "../spinner";

type ToasterProps = SonnerToasterProps & { nonce?: string };

function ToastIcon({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-slot="sonner-toast-icon"
      className={cn(
        "flex size-9 items-center justify-center rounded-full",
        className,
      )}
    >
      {children}
    </div>
  );
}

const baseClassNames: ToastClassnames = {
  toast:
    "pointer-events-auto flex w-[var(--width)] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-lg border ds-border-surface border-l-4 bg-background p-4 shadow-lg",
  title: "text-sm font-bold leading-5 text-foreground",
  description: "text-xs leading-4 text-muted-foreground",
  content: "flex flex-col gap-0.5",
  icon: "mt-0.5 shrink-0",
  actionButton:
    "ml-auto inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-background shadow-xs hover:bg-primary/90 focus-visible:outline-none focus-visible:ds-focus-ring ",
  cancelButton:
    "ml-2 inline-flex h-8 items-center justify-center rounded-md bg-hover-soft px-3 text-xs font-medium text-foreground hover:bg-hover-soft/70 focus-visible:outline-none focus-visible:ds-focus-ring ",
  closeButton: "hidden",
  success: "ds-border-l-success",
  error: "ds-border-l-destructive",
  info: "ds-border-l-info",
  warning: "ds-border-l-warning",
  loading: "ds-border-l-neutral",
  default: "ds-border-l-neutral",
};

function mergeClassNames(
  base: ToastClassnames,
  override?: ToastClassnames,
): ToastClassnames {
  if (!override) return base;

  return {
    toast: cn(base.toast, override.toast),
    title: cn(base.title, override.title),
    description: cn(base.description, override.description),
    loader: cn(base.loader, override.loader),
    closeButton: cn(base.closeButton, override.closeButton),
    cancelButton: cn(base.cancelButton, override.cancelButton),
    actionButton: cn(base.actionButton, override.actionButton),
    success: cn(base.success, override.success),
    error: cn(base.error, override.error),
    info: cn(base.info, override.info),
    warning: cn(base.warning, override.warning),
    loading: cn(base.loading, override.loading),
    default: cn(base.default, override.default),
    content: cn(base.content, override.content),
    icon: cn(base.icon, override.icon),
  };
}

function Toaster({
  closeButton: _closeButton,
  icons: _icons,
  toastOptions,
  position: _position,
  style,
  nonce,
  theme: _themePropIgnored,
  ...props
}: ToasterProps) {
  const { theme = "system" } = useTheme();
  const forcedPosition = "top-right" as const;
  const [sonner, setSonner] = useState<typeof import("sonner")>();

  useEffect(() => {
    let cancelled = false;
    let restoreCreateElement: (() => void) | undefined;

    if (nonce && typeof document !== "undefined") {
      const originalCreateElement = document.createElement.bind(document);
      // The createElement signature is heavily overloaded (per-tag type maps).
      // We need to wrap arbitrary calls (string tag names with optional options)
      // and re-assign onto `document.createElement`, so the inputs are typed as
      // `string` (the runtime contract) and options as `ElementCreationOptions`.
      // The cast back to `typeof document.createElement` re-aligns with the
      // overloaded signature for the rest of the runtime.
      document.createElement = ((
        tagName: string,
        options?: ElementCreationOptions,
      ) => {
        const element = originalCreateElement(tagName, options);
        if (
          typeof tagName === "string" &&
          tagName.toLowerCase() === "style" &&
          !element.getAttribute("nonce")
        ) {
          element.setAttribute("nonce", nonce);
        }
        return element;
      }) as typeof document.createElement;

      restoreCreateElement = () => {
        document.createElement = originalCreateElement;
      };
    }

    import("sonner")
      .then((module) => {
        if (!cancelled) {
          setSonner(module);
        }
      })
      .catch(() => {
        // Silently ignore load errors; toast calls will no-op without the client bundle.
      });

    return () => {
      cancelled = true;
      restoreCreateElement?.();
    };
  }, [nonce]);

  if (!sonner) return null;

  const Sonner = sonner.Toaster;

  return (
    <Sonner
      data-slot="sonner-toaster"
      theme={(theme ?? "system") as Exclude<ToasterProps["theme"], undefined>}
      className="toaster group pointer-events-none fixed top-4 right-4 z-toast flex flex-col gap-3"
      position={forcedPosition}
      closeButton={false}
      style={
        {
          ...(style ?? {}),
          // CSS custom property — TS doesn't model `--*` keys in CSSProperties,
          // so cast through `Record<string, string>` (rather than `any`) keeps
          // type-safety: only string→string entries are permitted.
          ["--width" as keyof React.CSSProperties]:
            "min(420px, calc(100vw - 2rem))",
        } as Exclude<ToasterProps["style"], undefined>
      }
      icons={{
        success: (
          <ToastIcon className="bg-success/15 text-success">
            <CircleCheck className="size-5" strokeWidth={2.25} />
          </ToastIcon>
        ),
        info: (
          <ToastIcon className="bg-info/15 text-info">
            <Info className="size-5" strokeWidth={2.25} />
          </ToastIcon>
        ),
        warning: (
          <ToastIcon className="bg-warning/15 text-warning">
            <CircleAlert className="size-5" strokeWidth={2.25} />
          </ToastIcon>
        ),
        error: (
          <ToastIcon className="bg-destructive/15 text-destructive">
            <CircleX className="size-5" strokeWidth={2.25} />
          </ToastIcon>
        ),
        loading: (
          <ToastIcon className="bg-foreground/10 text-foreground">
            <Spinner className="size-5" />
          </ToastIcon>
        ),
      }}
      toastOptions={{
        ...(toastOptions ?? {}),
        unstyled: true,
        closeButton: false,
        classNames: mergeClassNames(baseClassNames, toastOptions?.classNames),
      }}
      {...props}
    />
  );
}

export { Toaster };
