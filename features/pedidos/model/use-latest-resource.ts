"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

interface LatestResourceState<T> {
  data: T;
  loading: boolean;
  loadedOnce: boolean;
  attempted: boolean;
  error: string | null;
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Não foi possível carregar os dados.';
}

/** Recurso não paginado pequeno (agregado/parâmetros), com last-good e latest-wins. */
export function useLatestResource<T>(
  initialData: T,
  fetchResource: (signal: AbortSignal) => Promise<T>,
) {
  const initialRef = useRef(initialData);
  const [state, setState] = useState<LatestResourceState<T>>({
    data: initialData,
    loading: false,
    loadedOnce: false,
    attempted: false,
    error: null,
  });
  const requestRef = useRef<{ id: number; controller: AbortController } | null>(null);
  const nextIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current?.controller.abort();
    };
  }, []);

  const reload = useCallback(async (): Promise<boolean> => {
    requestRef.current?.controller.abort();
    const controller = new AbortController();
    const id = ++nextIdRef.current;
    requestRef.current = { id, controller };
    setState((previous) => ({
      ...previous,
      loading: true,
      attempted: true,
      error: null,
    }));

    try {
      const data = await fetchResource(controller.signal);
      if (!mountedRef.current || requestRef.current?.id !== id) return false;
      setState({
        data,
        loading: false,
        loadedOnce: true,
        attempted: true,
        error: null,
      });
      return true;
    } catch (error) {
      if (!mountedRef.current || requestRef.current?.id !== id || isAbort(error)) {
        return false;
      }
      setState((previous) => ({
        ...previous,
        loading: false,
        error: errorMessage(error),
      }));
      return false;
    }
  }, [fetchResource]);

  const reset = useCallback(() => {
    requestRef.current?.controller.abort();
    requestRef.current = null;
    setState({
      data: initialRef.current,
      loading: false,
      loadedOnce: false,
      attempted: false,
      error: null,
    });
  }, []);

  return { ...state, reload, reset };
}
