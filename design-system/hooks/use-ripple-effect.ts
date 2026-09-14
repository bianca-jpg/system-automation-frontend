import * as React from "react";

export interface RippleItem {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface UseRippleEffectOptions {
  disabled?: boolean | undefined;
  durationMs?: number | undefined;
  maxRipples?: number | undefined;
}

export function useRippleEffect({
  disabled = false,
  durationMs = 650,
  maxRipples = 4,
}: UseRippleEffectOptions = {}) {
  const [ripples, setRipples] = React.useState<RippleItem[]>([]);
  const nextRippleIdRef = React.useRef(0);
  const timeoutIdsRef = React.useRef<number[]>([]);

  const registerRipple = React.useCallback(
    ({ x, y, size }: { x: number; y: number; size: number }) => {
      const rippleId = nextRippleIdRef.current++;

      setRipples((currentRipples) => [
        ...currentRipples.slice(-(maxRipples - 1)),
        { id: rippleId, x, y, size },
      ]);

      const timeoutId = window.setTimeout(() => {
        setRipples((currentRipples) =>
          currentRipples.filter((ripple) => ripple.id !== rippleId),
        );
        timeoutIdsRef.current = timeoutIdsRef.current.filter(
          (registeredTimeoutId) => registeredTimeoutId !== timeoutId,
        );
      }, durationMs);

      timeoutIdsRef.current.push(timeoutId);
    },
    [durationMs, maxRipples],
  );

  React.useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) =>
        window.clearTimeout(timeoutId),
      );
      timeoutIdsRef.current = [];
    };
  }, []);

  const createRipple = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (disabled || event.button !== 0 || event.defaultPrevented) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.35;
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;
      registerRipple({ x, y, size });
    },
    [disabled, registerRipple],
  );

  const createCenteredRipple = React.useCallback(
    (
      element: HTMLElement,
      {
        sizeMultiplier = 1.1,
      }: {
        sizeMultiplier?: number;
      } = {},
    ) => {
      if (disabled) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * sizeMultiplier;
      const x = rect.width / 2 - size / 2;
      const y = rect.height / 2 - size / 2;

      registerRipple({ x, y, size });
    },
    [disabled, registerRipple],
  );

  return {
    ripples,
    createRipple,
    createCenteredRipple,
  };
}
