"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type StorageKind = "localStorage" | "sessionStorage";

type UseClientPersistedStateOptions<T> = {
  storage?: StorageKind;
  serialize?: (value: T) => string;
  deserialize?: (raw: string) => T;
};

function resolveInitialValue<T>(initialValue: T | (() => T)): T {
  return typeof initialValue === "function"
    ? (initialValue as () => T)()
    : initialValue;
}

function getStorage(storage: StorageKind): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return storage === "sessionStorage"
    ? window.sessionStorage
    : window.localStorage;
}

export function useClientPersistedState<T>(
  key: string,
  initialValue: T | (() => T),
  options: UseClientPersistedStateOptions<T> = {},
) {
  const {
    storage = "localStorage",
    serialize = JSON.stringify,
    deserialize = JSON.parse as (raw: string) => T,
  } = options;

  const initialValueRef = useRef<T>(resolveInitialValue(initialValue));
  const [value, setValue] = useState<T>(initialValueRef.current);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const targetStorage = getStorage(storage);

    if (!targetStorage) {
      return;
    }

    try {
      const raw = targetStorage.getItem(key);

      if (raw !== null) {
        setValue(deserialize(raw));
      } else {
        setValue(initialValueRef.current);
      }
    } catch {
      setValue(initialValueRef.current);
    } finally {
      setHydrated(true);
    }
  }, [deserialize, key, storage]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const targetStorage = getStorage(storage);

    if (!targetStorage) {
      return;
    }

    try {
      targetStorage.setItem(key, serialize(value));
    } catch {
      // Ignore storage quota and serialization errors.
    }
  }, [hydrated, key, serialize, storage, value]);

  const clear = useCallback(() => {
    const fallback = initialValueRef.current;
    setValue(fallback);

    const targetStorage = getStorage(storage);

    try {
      targetStorage?.removeItem(key);
    } catch {
      // Ignore storage removal errors.
    }
  }, [key, storage]);

  return {
    value,
    setValue,
    clear,
    hydrated,
  };
}
