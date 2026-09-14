"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { type VariantProps } from "class-variance-authority";

import { useRippleEffect } from "../../../hooks/use-ripple-effect";
import { cn } from "../../../lib/utils";
import { composeEventHandlers, RippleLayer } from "../ripple-effect";
import { Spinner } from "../spinner";
import { buttonVariants } from "./variants";

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

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) {
    ref.current = value;
  }
}

function clearSlottedActivationHandlers(children: React.ReactNode) {
  if (!React.isValidElement<React.DOMAttributes<HTMLElement>>(children)) {
    return children;
  }

  // Radix Slot composes handlers child-first. Clearing the disabled child's
  // activation handlers is therefore required before Slot adds our guards.
  return React.cloneElement(children, clearedSlottedActivationHandlers);
}

function Button({
  ref: forwardedRef,
  className,
  variant,
  size,
  loading: loadingProp,
  loadingLabel = "Carregando",
  disabled,
  asChild = false,
  ripple = false,
  rippleClassName,
  rippleContainerClassName,
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
  style,
  tabIndex,
  "data-slot": dataSlot = "button",
  "aria-busy": ariaBusy,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    /** Accessible status announced while the button is loading. */
    loadingLabel?: string;
    asChild?: boolean;
    ripple?: boolean;
    rippleClassName?: string;
    rippleContainerClassName?: string;
    "data-slot"?: string;
  }) {
  const Comp = asChild ? Slot : "button";
  const loading = loadingProp ?? false;
  /**
   * O botão só precisa travar a própria largura/altura quando pode trocar o
   * rótulo por um spinner. Quem NUNCA passa `loading` nunca entra nesse estado,
   * então não precisa medir nada — e medir custa caro: um
   * `getBoundingClientRect()` (layout síncrono na fase de commit) mais um
   * `ResizeObserver` por instância. Numa tabela virtualizada isso acontecia uma
   * vez por linha a cada linha que entra no viewport durante o scroll, além de
   * valer para todo botão da aplicação.
   */
  const tracksLoadingSize = loadingProp !== undefined;
  const isDisabled = loading || disabled;
  const isRippleEnabled = ripple && !loading && !asChild;
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const setButtonRef = React.useCallback(
    (node: HTMLButtonElement | null) => {
      buttonRef.current = node;
      assignRef(forwardedRef, node);
    },
    [forwardedRef],
  );
  const lastMeasuredSizeRef = React.useRef<{
    width: number;
    height: number;
  } | null>(null);
  const [lockedSize, setLockedSize] = React.useState<{
    width: number;
    height: number;
  } | null>(null);
  const { ripples, createRipple } = useRippleEffect({
    disabled: !isRippleEnabled || isDisabled,
  });

  const measureButtonSize = React.useCallback(() => {
    if (asChild) {
      return;
    }

    const node = buttonRef.current;
    if (!node) {
      return;
    }

    const { width, height } = node.getBoundingClientRect();
    if (width <= 0 || height <= 0) {
      return;
    }

    lastMeasuredSizeRef.current = { width, height };
  }, [asChild]);

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      measureButtonSize();
      onPointerDown?.(event);
    },
    [isDisabled, measureButtonSize, onPointerDown],
  );

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      measureButtonSize();
      onClick?.(event);
    },
    [isDisabled, measureButtonSize, onClick],
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

  const resolvedClassName = cn(
    buttonVariants({ variant, size, className }),
    isRippleEnabled && "isolate overflow-hidden",
    loading && "disabled:opacity-100 aria-disabled:opacity-100",
  );
  const resolvedOnPointerDown = isRippleEnabled
    ? composeEventHandlers(handlePointerDown, createRipple)
    : handlePointerDown;
  const resolvedStyle =
    loading && lockedSize
      ? {
          ...style,
          width: `${lockedSize.width}px`,
          height: `${lockedSize.height}px`,
        }
      : style;

  React.useLayoutEffect(() => {
    if (asChild || loading || !tracksLoadingSize) {
      return;
    }

    measureButtonSize();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      measureButtonSize();
    });

    const node = buttonRef.current;
    if (!node) {
      return;
    }

    observer.observe(node);

    return () => observer.disconnect();
  }, [asChild, loading, tracksLoadingSize, measureButtonSize]);

  React.useLayoutEffect(() => {
    if (asChild || !tracksLoadingSize) {
      return;
    }

    if (loading) {
      if (!lastMeasuredSizeRef.current) {
        measureButtonSize();
      }
      setLockedSize(lastMeasuredSizeRef.current);
      return;
    }

    setLockedSize(null);
  }, [asChild, loading, tracksLoadingSize, measureButtonSize]);

  const content = (
    <>
      {isRippleEnabled ? (
        <RippleLayer
          ripples={ripples}
          className={rippleContainerClassName}
          rippleClassName={cn("bg-foreground/14", rippleClassName)}
        />
      ) : null}
      <span
        className={cn(
          "relative z-10 inline-flex items-center gap-2",
          loading && "opacity-0",
        )}
      >
        {children}
      </span>
    </>
  );

  // `asChild` means the consumer passes the root element (e.g. Next `<Link />`).
  // We must not wrap it, otherwise the slotted element becomes our wrapper and
  // the clickable area no longer matches the visual button.
  if (asChild) {
    const slottedChildren = isDisabled
      ? clearSlottedActivationHandlers(children)
      : children;

    return (
      <Comp
        {...props}
        ref={forwardedRef}
        data-slot={dataSlot}
        className={resolvedClassName}
        aria-disabled={isDisabled ? true : undefined}
        aria-busy={loading ? true : ariaBusy}
        data-loading={loading ? "" : undefined}
        tabIndex={isDisabled ? -1 : tabIndex}
        onClickCapture={handleClickCapture}
        onKeyDown={handleKeyDown}
        onKeyDownCapture={handleKeyDownCapture}
        onKeyUp={handleKeyUp}
        onKeyUpCapture={handleKeyUpCapture}
        onPointerDownCapture={handlePointerDownCapture}
        onPointerDown={resolvedOnPointerDown}
        onPointerUp={handlePointerUp}
        onPointerUpCapture={handlePointerUpCapture}
        onClick={handleClick}
        style={resolvedStyle}
      >
        {slottedChildren}
      </Comp>
    );
  }

  return (
    <button
      {...props}
      ref={setButtonRef}
      data-slot={dataSlot}
      className={resolvedClassName}
      disabled={isDisabled}
      aria-disabled={isDisabled ? true : undefined}
      aria-busy={loading ? true : ariaBusy}
      tabIndex={tabIndex}
      data-loading={loading ? "" : undefined}
      onClickCapture={handleClickCapture}
      onKeyDown={handleKeyDown}
      onKeyDownCapture={handleKeyDownCapture}
      onKeyUp={handleKeyUp}
      onKeyUpCapture={handleKeyUpCapture}
      onPointerDownCapture={handlePointerDownCapture}
      onPointerDown={resolvedOnPointerDown}
      onPointerUp={handlePointerUp}
      onPointerUpCapture={handlePointerUpCapture}
      onClick={handleClick}
      style={resolvedStyle}
    >
      {content}
      {loading && (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-0 z-20 flex items-center justify-center"
          >
            <Spinner className="size-5" />
          </span>
          <span role="status" className="sr-only">
            {loadingLabel}
          </span>
        </>
      )}
    </button>
  );
}

export { Button };
export { buttonVariants } from "./variants";
