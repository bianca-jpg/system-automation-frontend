"use client";

import type { ReactNode } from "react";

import { cn } from "../../../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";

export interface SecurityVerificationDialogProps {
  open: boolean;
  onOpenChange?: ((open: boolean) => void) | undefined;
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /**
   * When false, the dialog can only close after the verification flow changes
   * `open`. Escape, outside interactions, and the close button are disabled.
   */
  dismissible?: boolean;
  className?: string | undefined;
}

/**
 * Design-system shell for human/security verification flows.
 *
 * Provider-specific SDKs, tokens, and business state remain owned by the app;
 * this component standardizes the modal surface, responsive behavior, copy
 * hierarchy, and optional fail-closed dismissal policy.
 */
export function SecurityVerificationDialog({
  open,
  onOpenChange,
  children,
  title = "Verificação de segurança",
  description = "Confirme que você é humano para continuar.",
  dismissible = true,
  className,
}: SecurityVerificationDialogProps) {
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !dismissible) return;
    onOpenChange?.(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        data-slot="security-verification-dialog"
        size="md"
        showCloseButton={dismissible}
        onEscapeKeyDown={(event) => {
          if (!dismissible) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (!dismissible) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (!dismissible) event.preventDefault();
        }}
        className={cn(
          "scrollbar-hide outline-none max-[359px]:w-[calc(100vw-1rem)] max-[359px]:max-w-[calc(100vw-1rem)] max-[359px]:shrink-0 max-[359px]:gap-3 max-[359px]:p-2",
          className,
        )}
      >
        <DialogHeader
          className={cn(
            "text-left",
            dismissible ? "pr-14 sm:pr-12" : "pr-0 sm:pr-0",
          )}
        >
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        {children}
      </DialogContent>
    </Dialog>
  );
}
