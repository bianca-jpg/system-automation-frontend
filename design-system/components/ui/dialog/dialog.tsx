"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";

import { useRippleEffect } from "../../../hooks/use-ripple-effect";
import { cn } from "../../../lib/utils";
import { composeEventHandlers, RippleLayer } from "../ripple-effect";
import { dialogContentVariants } from "./variants";

const DIALOG_CLOSE_RIPPLE_DELAY_MS = 140;

type DialogContextValue = {
  closeWithDelay: (delayMs?: number) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function Dialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const closeTimeoutRef = React.useRef<number | null>(null);

  const clearScheduledClose = React.useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  React.useEffect(() => clearScheduledClose, [clearScheduledClose]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      clearScheduledClose();

      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [clearScheduledClose, isControlled, onOpenChange],
  );

  const closeWithDelay = React.useCallback(
    (delayMs = DIALOG_CLOSE_RIPPLE_DELAY_MS) => {
      clearScheduledClose();

      if (typeof window === "undefined") {
        handleOpenChange(false);
        return;
      }

      closeTimeoutRef.current = window.setTimeout(() => {
        closeTimeoutRef.current = null;
        handleOpenChange(false);
      }, delayMs);
    },
    [clearScheduledClose, handleOpenChange],
  );

  return (
    <DialogContext.Provider value={{ closeWithDelay }}>
      <DialogPrimitive.Root
        data-slot="dialog"
        open={open}
        onOpenChange={handleOpenChange}
        {...props}
      />
    </DialogContext.Provider>
  );
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

type DialogCloseButtonProps = React.ComponentProps<
  typeof DialogPrimitive.Close
> & {
  rippleClassName?: string;
};

function DialogCloseButton({
  className,
  children,
  disabled,
  asChild = false,
  onClick: onClickProp,
  onPointerDown,
  onPointerEnter: onPointerEnterProp,
  rippleClassName,
  "aria-label": ariaLabel = "Fechar",
  ...props
}: DialogCloseButtonProps) {
  const dialogContext = React.useContext(DialogContext);
  const isRippleEnabled = !asChild && !disabled;
  const { ripples, createCenteredRipple, createRipple } = useRippleEffect({
    disabled: !isRippleEnabled,
    durationMs: 780,
    maxRipples: 5,
  });
  const resolvedOnPointerDown = isRippleEnabled
    ? composeEventHandlers(onPointerDown, createRipple)
    : onPointerDown;
  const handlePointerEnter = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      onPointerEnterProp?.(event);

      if (event.defaultPrevented) {
        return;
      }

      if (!isRippleEnabled || event.pointerType === "touch") {
        return;
      }

      createCenteredRipple(event.currentTarget, { sizeMultiplier: 1.05 });
    },
    [createCenteredRipple, isRippleEnabled, onPointerEnterProp],
  );
  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClickProp?.(event);

      if (event.defaultPrevented || disabled) {
        return;
      }

      event.preventDefault();
      dialogContext?.closeWithDelay();
    },
    [dialogContext, disabled, onClickProp],
  );
  const resolvedClassName = cn(
    "absolute top-4 right-4 z-10 inline-flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full text-muted-foreground/80 transition-[background-color,color,opacity,transform,box-shadow] duration-standard hover:bg-hover-soft hover:text-foreground hover:opacity-100  focus-visible:ds-focus-ring  active:scale-[0.98] disabled:pointer-events-none disabled:cursor-default disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className,
  );

  if (asChild) {
    return (
      <DialogPrimitive.Close
        data-slot="dialog-close"
        className={resolvedClassName}
        onPointerDown={resolvedOnPointerDown}
        onPointerEnter={onPointerEnterProp}
        onClick={onClickProp}
        aria-label={ariaLabel}
        disabled={disabled}
        asChild={asChild}
        {...props}
      >
        {children}
      </DialogPrimitive.Close>
    );
  }

  return (
    <button
      data-slot="dialog-close"
      type="button"
      className={resolvedClassName}
      onPointerDown={resolvedOnPointerDown}
      onPointerEnter={handlePointerEnter}
      onClick={handleClick}
      aria-label={ariaLabel}
      disabled={disabled}
      {...props}
    >
      {isRippleEnabled ? (
        <RippleLayer
          ripples={ripples}
          rippleClassName={cn(
            "bg-foreground/20 mix-blend-multiply dark:mix-blend-screen",
            rippleClassName,
          )}
        />
      ) : null}
      <span className="relative z-10 inline-flex items-center justify-center">
        {children ?? <XIcon aria-hidden="true" />}
      </span>
    </button>
  );
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:pointer-events-none fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  accessibleTitle,
  size,
  surface,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
  accessibleTitle?: string;
} & VariantProps<typeof dialogContentVariants>) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <DialogPrimitive.Content
          data-slot="dialog-content"
          className={cn(
            dialogContentVariants({ size, surface }),
            "pointer-events-auto",
            className,
          )}
          {...props}
        >
          {accessibleTitle && (
            <VisuallyHidden>
              <DialogPrimitive.Title>{accessibleTitle}</DialogPrimitive.Title>
            </VisuallyHidden>
          )}
          {children}
          {showCloseButton ? <DialogCloseButton /> : null}
        </DialogPrimitive.Content>
      </div>
    </DialogPortal>
  );
}

function DialogPanelHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-panel-header"
      className={cn(
        "shrink-0 border-b ds-border-divider bg-background px-4 sm:px-6 py-4 pr-12",
        className,
      )}
      {...props}
    />
  );
}

function DialogPanelBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-panel-body"
      className={cn(
        "flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4",
        className,
      )}
      {...props}
    />
  );
}

function DialogPanelFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <DialogFooter
      data-slot="dialog-panel-footer"
      className={cn(
        "shrink-0 border-t ds-border-divider bg-background px-4 sm:px-6 py-4",
        className,
      )}
      {...props}
    />
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex flex-col gap-1.5 text-center sm:pr-12 sm:text-left",
        className,
      )}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        // The arbitrary selectors target both `data-slot=button` (Button) and
        // `data-slot=action-button` (ActionButton). ActionButton defaults to
        // `width: full`, and without the action-button reset its `w-full`
        // wins on desktop, producing a giant primary button with the cancel
        // button squeezed out of view.
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        "[&>:is([data-slot=button],[data-slot=action-button])]:w-full",
        "sm:[&>:is([data-slot=button],[data-slot=action-button])]:w-auto",
        "sm:[&>:is([data-slot=button],[data-slot=action-button])]:min-w-[120px]",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-tight font-bold", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm leading-relaxed", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPanelBody,
  DialogPanelFooter,
  DialogPanelHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
export { dialogContentVariants } from "./variants";
