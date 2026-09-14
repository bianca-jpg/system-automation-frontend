"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../../lib/utils";

type SlottedActivationHandlers = Pick<
  React.DOMAttributes<HTMLElement>,
  | "onClick"
  | "onClickCapture"
  | "onKeyDown"
  | "onKeyDownCapture"
  | "onKeyUp"
  | "onKeyUpCapture"
  | "onPointerDown"
  | "onPointerDownCapture"
  | "onPointerUp"
  | "onPointerUpCapture"
>;

const clearedSlottedActivationHandlers: SlottedActivationHandlers = {
  onClick: undefined,
  onClickCapture: undefined,
  onKeyDown: undefined,
  onKeyDownCapture: undefined,
  onKeyUp: undefined,
  onKeyUpCapture: undefined,
  onPointerDown: undefined,
  onPointerDownCapture: undefined,
  onPointerUp: undefined,
  onPointerUpCapture: undefined,
};

function clearSlottedActivationHandlers(children: React.ReactNode) {
  if (!React.isValidElement<React.DOMAttributes<HTMLElement>>(children)) {
    return children;
  }

  // Radix Slot composes handlers child-first. Clearing the disabled child's
  // activation handlers is therefore required before Slot adds our guards.
  return React.cloneElement(children, clearedSlottedActivationHandlers);
}

const pressableVariants = cva(
  "relative inline-flex select-none items-center justify-center rounded-[var(--radius-control)] outline-none transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-fast ease-standard  focus-visible:ds-focus-ring  active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
  {
    variants: {
      variant: {
        plain: "bg-transparent",
        ghost: "bg-transparent hover:bg-hover-soft",
        surface:
          "border ds-border-control bg-background shadow-xs hover:ds-border-control-strong hover:bg-hover-soft",
      },
      size: {
        content: "",
        sm: "min-h-9 gap-2 px-3 py-2 text-sm",
        md: "min-h-11 gap-2 px-4 py-2.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "plain",
      size: "content",
    },
  },
);

export type PressableProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  "disabled"
> &
  VariantProps<typeof pressableVariants> & {
    asChild?: boolean;
    disabled?: boolean;
    loading?: boolean;
    pressed?: boolean;
  };

const Pressable = React.forwardRef<HTMLButtonElement, PressableProps>(
  function Pressable(
    {
      asChild = false,
      className,
      disabled = false,
      loading = false,
      pressed,
      type = "button",
      variant,
      size,
      children,
      onClick,
      onClickCapture,
      onKeyDown,
      onKeyDownCapture,
      onKeyUp,
      onKeyUpCapture,
      onPointerDown,
      onPointerDownCapture,
      onPointerUp,
      onPointerUpCapture,
      tabIndex,
      ...props
    },
    ref,
  ) {
    const Component = asChild ? Slot : "button";
    const isDisabled = disabled || loading;

    const handleClick = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        if (isDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick?.(event);
      },
      [isDisabled, onClick],
    );

    const handleClickCapture = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        if (isDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClickCapture?.(event);
      },
      [isDisabled, onClickCapture],
    );

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (isDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onKeyDown?.(event);
      },
      [isDisabled, onKeyDown],
    );

    const handleKeyDownCapture = React.useCallback(
      (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (isDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onKeyDownCapture?.(event);
      },
      [isDisabled, onKeyDownCapture],
    );

    const handleKeyUp = React.useCallback(
      (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (isDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onKeyUp?.(event);
      },
      [isDisabled, onKeyUp],
    );

    const handleKeyUpCapture = React.useCallback(
      (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (isDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onKeyUpCapture?.(event);
      },
      [isDisabled, onKeyUpCapture],
    );

    const handlePointerDown = React.useCallback(
      (event: React.PointerEvent<HTMLButtonElement>) => {
        if (isDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onPointerDown?.(event);
      },
      [isDisabled, onPointerDown],
    );

    const handlePointerDownCapture = React.useCallback(
      (event: React.PointerEvent<HTMLButtonElement>) => {
        if (isDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onPointerDownCapture?.(event);
      },
      [isDisabled, onPointerDownCapture],
    );

    const handlePointerUp = React.useCallback(
      (event: React.PointerEvent<HTMLButtonElement>) => {
        if (isDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onPointerUp?.(event);
      },
      [isDisabled, onPointerUp],
    );

    const handlePointerUpCapture = React.useCallback(
      (event: React.PointerEvent<HTMLButtonElement>) => {
        if (isDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onPointerUpCapture?.(event);
      },
      [isDisabled, onPointerUpCapture],
    );

    const slottedChildren =
      asChild && isDisabled
        ? clearSlottedActivationHandlers(children)
        : children;

    return (
      <Component
        {...props}
        ref={ref}
        data-slot="pressable"
        data-state={pressed === undefined ? undefined : pressed ? "on" : "off"}
        className={cn(pressableVariants({ variant, size }), className)}
        type={asChild ? undefined : type}
        disabled={asChild ? undefined : isDisabled}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        aria-pressed={pressed}
        tabIndex={asChild && isDisabled ? -1 : tabIndex}
        onClickCapture={handleClickCapture}
        onKeyDown={handleKeyDown}
        onKeyDownCapture={handleKeyDownCapture}
        onKeyUp={handleKeyUp}
        onKeyUpCapture={handleKeyUpCapture}
        onPointerDown={handlePointerDown}
        onPointerDownCapture={handlePointerDownCapture}
        onPointerUp={handlePointerUp}
        onPointerUpCapture={handlePointerUpCapture}
        onClick={handleClick}
      >
        {slottedChildren}
      </Component>
    );
  },
);

export { Pressable, pressableVariants };
