"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import { useCallback, useState } from "react";

/**
 * Hook to detect Caps Lock on password inputs. Use one instance per field.
 *
 * Usage: spread `capsLockHandlers` on the input and render
 * `<CapsLockWarning visible={isCapsLockOn} />` below the field (optionally with `id` for aria-describedby).
 */

type ModifierAwareEvent = {
  getModifierState?: (keyArg: string) => boolean;
};

function readCapsLockState(
  event: ModifierAwareEvent | null | undefined,
): boolean | null {
  if (!event || typeof event.getModifierState !== "function") {
    return null;
  }
  try {
    return event.getModifierState("CapsLock");
  } catch {
    return null;
  }
}

export function useCapsLockState() {
  const [hasFocus, setHasFocus] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  const syncCapsLock = useCallback(
    (event: ModifierAwareEvent | null | undefined) => {
      const nextState = readCapsLockState(event);
      if (nextState === null) {
        return;
      }
      setIsCapsLockOn(nextState);
    },
    [],
  );

  return {
    isCapsLockOn: hasFocus && isCapsLockOn,
    capsLockHandlers: {
      onFocusCapture: () => {
        setHasFocus(true);
      },
      onBlurCapture: () => {
        // Defer cleanup so the browser can move focus to the clicked element first.
        // Without this, clicking another password input would not focus it (required double click).
        setTimeout(() => {
          setHasFocus(false);
          setIsCapsLockOn(false);
        }, 0);
      },
      onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
        syncCapsLock(event.nativeEvent);
      },
      onKeyUp: (event: KeyboardEvent<HTMLInputElement>) => {
        syncCapsLock(event.nativeEvent);
      },
      onClick: (event: MouseEvent<HTMLInputElement>) => {
        syncCapsLock(event.nativeEvent);
      },
    },
  };
}
