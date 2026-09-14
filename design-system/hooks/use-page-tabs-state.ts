import {
  useCallback,
  useDeferredValue,
  useEffect,
  useState,
  useTransition,
} from "react";

export interface UsePageTabsStateOptions<Value extends string> {
  value?: Value | null;
  fallbackValue?: Value | null;
  onValueCommit?: (value: Value) => void;
}

export interface UsePageTabsStateResult<Value extends string> {
  activeValue: Value | null;
  renderedValue: Value | null;
  isPending: boolean;
  setValue: (value: Value) => void;
}

export function usePageTabsState<Value extends string>({
  value,
  fallbackValue = null,
  onValueCommit,
}: UsePageTabsStateOptions<Value>): UsePageTabsStateResult<Value> {
  const [activeValue, setActiveValue] = useState<Value | null>(
    value ?? fallbackValue,
  );
  const renderedValue = useDeferredValue(activeValue);
  const [isPending, startTabTransition] = useTransition();

  useEffect(() => {
    if (value === undefined || value === null) {
      return;
    }

    setActiveValue((currentValue) =>
      currentValue === value ? currentValue : value,
    );
  }, [value]);

  const setValue = useCallback(
    (nextValue: Value) => {
      if (nextValue === activeValue) {
        return;
      }

      setActiveValue(nextValue);
      startTabTransition(() => {
        onValueCommit?.(nextValue);
      });
    },
    [activeValue, onValueCommit],
  );

  return {
    activeValue,
    renderedValue,
    isPending,
    setValue,
  };
}
