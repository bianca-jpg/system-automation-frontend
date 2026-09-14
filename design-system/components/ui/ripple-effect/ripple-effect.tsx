import * as React from "react";

import type { RippleItem } from "../../../hooks/use-ripple-effect";
import { cn } from "../../../lib/utils";

export function composeEventHandlers<
  EventType extends { defaultPrevented: boolean },
>(
  theirHandler: ((event: EventType) => void) | undefined,
  ourHandler: (event: EventType) => void,
) {
  return (event: EventType) => {
    theirHandler?.(event);

    if (!event.defaultPrevented) {
      ourHandler(event);
    }
  };
}

interface RippleLayerProps extends React.HTMLAttributes<HTMLSpanElement> {
  ripples: readonly RippleItem[];
  rippleClassName?: string;
}

export function RippleLayer({
  ripples,
  className,
  rippleClassName,
  ...props
}: RippleLayerProps) {
  return (
    <span
      aria-hidden="true"
      data-slot="ripple-layer"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]",
        className,
      )}
      {...props}
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className={cn(
            "absolute rounded-full opacity-0 will-change-transform animate-ds-ripple motion-reduce:hidden",
            rippleClassName,
          )}
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
          }}
        />
      ))}
    </span>
  );
}
