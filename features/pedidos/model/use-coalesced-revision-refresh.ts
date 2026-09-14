"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/** Runs at most one refresh at a time and folds a revision burst into its max. */
export function useCoalescedRevisionRefresh(
  enabled: boolean,
  revision: number,
  refresh: () => Promise<boolean>,
  hasData: boolean,
  generation: number,
): () => Promise<boolean> {
  const mountedRef = useRef(true);
  const enabledRef = useRef(enabled);
  const lastScheduledRevisionRef = useRef(revision);
  const lastScheduledGenerationRef = useRef(generation);
  const latestRevisionRef = useRef(revision);
  const latestGenerationRef = useRef(generation);
  const pendingRevisionRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const manualRunRequiredRef = useRef(false);
  const manualRequestRef = useRef<{
    promise: Promise<boolean>;
    resolve: (refreshed: boolean) => void;
  } | null>(null);
  const refreshRef = useRef(refresh);

  useLayoutEffect(() => {
    refreshRef.current = refresh;
    latestRevisionRef.current = revision;
    latestGenerationRef.current = generation;
  }, [generation, refresh, revision]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      manualRequestRef.current?.resolve(false);
      manualRequestRef.current = null;
    };
  }, []);

  const settleManual = useCallback((refreshed: boolean) => {
    const request = manualRequestRef.current;
    if (!request) return;
    manualRequestRef.current = null;
    request.resolve(refreshed);
  }, []);

  const drain = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    void (async () => {
      try {
        while (mountedRef.current && enabledRef.current) {
          const capturedRevision = pendingRevisionRef.current;
          const capturedGeneration = latestGenerationRef.current;
          pendingRevisionRef.current = null;
          if (capturedRevision === null) break;
          const servesManual = manualRunRequiredRef.current;
          if (servesManual) manualRunRequiredRef.current = false;
          let refreshed = false;
          try {
            refreshed = await refreshRef.current();
          } catch {
            refreshed = false;
          }
          if (!mountedRef.current || !enabledRef.current) {
            if (servesManual) settleManual(false);
            break;
          }
          const latest = latestRevisionRef.current;
          if (
            latest !== capturedRevision
            || latestGenerationRef.current !== capturedGeneration
          ) {
            pendingRevisionRef.current = latest;
          }
          if (servesManual) {
            if (pendingRevisionRef.current !== null) {
              manualRunRequiredRef.current = true;
            } else {
              settleManual(refreshed);
            }
          }
        }
      } finally {
        runningRef.current = false;
      }
    })();
  }, [settleManual]);

  const refreshManually = useCallback(() => {
    const current = manualRequestRef.current;
    if (current) return current.promise;
    if (!mountedRef.current || !enabledRef.current) return Promise.resolve(false);
    let resolveRequest!: (refreshed: boolean) => void;
    const promise = new Promise<boolean>(resolve => {
      resolveRequest = resolve;
    });
    manualRequestRef.current = { promise, resolve: resolveRequest };
    manualRunRequiredRef.current = true;
    pendingRevisionRef.current = latestRevisionRef.current;
    drain();
    return promise;
  }, [drain]);

  useEffect(() => {
    const wasEnabled = enabledRef.current;
    enabledRef.current = enabled;
    if (!enabled) return;
    if (!wasEnabled) {
      const missedRevision = revision !== lastScheduledRevisionRef.current
        || generation !== lastScheduledGenerationRef.current;
      lastScheduledRevisionRef.current = revision;
      lastScheduledGenerationRef.current = generation;
      pendingRevisionRef.current = null;
      if (hasData && missedRevision) {
        pendingRevisionRef.current = revision;
        drain();
      }
      return;
    }
    if (
      revision === lastScheduledRevisionRef.current
      && generation === lastScheduledGenerationRef.current
    ) return;
    const generationChanged = generation !== lastScheduledGenerationRef.current;
    const revisionWentBack = revision < lastScheduledRevisionRef.current;
    lastScheduledRevisionRef.current = revision;
    lastScheduledGenerationRef.current = generation;
    pendingRevisionRef.current = generationChanged || revisionWentBack
      ? revision
      : Math.max(pendingRevisionRef.current ?? revision, revision);
    drain();
  }, [drain, enabled, generation, hasData, revision]);

  return refreshManually;
}
