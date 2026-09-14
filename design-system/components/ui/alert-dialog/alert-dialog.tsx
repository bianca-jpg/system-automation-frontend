import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { type VariantProps } from "class-variance-authority";

import { cn } from "../../../lib/utils";
import { ActionButton } from "../action-button";
import { dialogContentVariants } from "../dialog/variants";

function AlertDialog({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger
      data-slot="alert-dialog-trigger"
      {...props}
    />
  );
}

function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  );
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:pointer-events-none fixed inset-0 z-50 bg-black/50",
        className,
      )}
      {...props}
    />
  );
}

type AlertDialogContentProps = React.ComponentProps<
  typeof AlertDialogPrimitive.Content
> &
  VariantProps<typeof dialogContentVariants>;

function AlertDialogContent({
  className,
  size = "sm",
  surface = "default",
  ...props
}: AlertDialogContentProps) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <AlertDialogPrimitive.Content
          data-slot="alert-dialog-content"
          className={cn(
            dialogContentVariants({ size, surface }),
            "pointer-events-auto",
            className,
          )}
          {...props}
        />
      </div>
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-1.5 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function AlertDialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        // See DialogFooter for rationale: ActionButton's default `width: full`
        // requires us to reset the slotted AlertDialog roots on desktop too.
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        "[&>:is([data-slot=button],[data-slot=action-button],[data-slot=alert-dialog-action],[data-slot=alert-dialog-cancel])]:w-full",
        "sm:[&>:is([data-slot=button],[data-slot=action-button],[data-slot=alert-dialog-action],[data-slot=alert-dialog-cancel])]:w-auto",
        "sm:[&>:is([data-slot=button],[data-slot=action-button],[data-slot=alert-dialog-action],[data-slot=alert-dialog-cancel])]:min-w-[120px]",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-lg leading-tight font-bold", className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-sm leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return (
    <ActionButton asChild className={className}>
      <AlertDialogPrimitive.Action data-slot="alert-dialog-action" {...props} />
    </ActionButton>
  );
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <ActionButton asChild variant="secondary" className={className}>
      <AlertDialogPrimitive.Cancel data-slot="alert-dialog-cancel" {...props} />
    </ActionButton>
  );
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
