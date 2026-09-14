"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useRealtime, type RealtimeTopic } from '@/features/realtime';

interface UseRealtimeResourceRefreshOptions {
  enabled: boolean;
  topic: RealtimeTopic;
  revision: number;
  /**
   * Revisions that invalidate the same REST projection without representing a
   * new item in `topic`. A silent refresh never acknowledges `topic`.
   */
  silentRevision?: number;
  loadedOnce: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<boolean>;
}

function pageIsVisible(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.visibilityState !== 'visible') return false;
  return typeof document.hasFocus !== 'function' || document.hasFocus();
}

/**
 * Coalesce revisions into one REST refresh at a time. A burst that arrives
 * while the request is running becomes a single follow-up using its highest
 * watermark. Read acknowledgement is tied to the captured refresh watermark
 * and only happens while the operator can actually see the page.
 */
export function useRealtimeResourceRefresh({
  enabled,
  topic,
  revision,
  silentRevision,
  loadedOnce,
  loading,
  error,
  refresh,
}: UseRealtimeResourceRefreshOptions): () => Promise<boolean> {
  const { markTopicRead, resyncGeneration } = useRealtime();
  const mountedRef = useRef(true);
  const enabledRef = useRef(enabled);
  const latestRevisionRef = useRef(revision);
  const latestSilentRevisionRef = useRef<number | null>(silentRevision ?? null);
  const initialRevisionRef = useRef(revision);
  const initialResyncGenerationRef = useRef(resyncGeneration);
  const observedRevisionRef = useRef(revision);
  const observedSilentRevisionRef = useRef<number | null>(silentRevision ?? null);
  const observedResyncGenerationRef = useRef(resyncGeneration);
  const latestResyncGenerationRef = useRef(resyncGeneration);
  const reconciledResyncGenerationRef = useRef<number | null>(null);
  const reconciledRevisionRef = useRef<number | null>(null);
  const acknowledgedRevisionRef = useRef(-1);
  const pendingRevisionRef = useRef<number | null>(null);
  const pendingSilentRevisionRef = useRef<number | null>(null);
  const forceRefreshRef = useRef(false);
  const runningRef = useRef(false);
  const runningRevisionRef = useRef<number | null>(null);
  const runningSilentRevisionRef = useRef<number | null>(null);
  const runningGenerationRef = useRef<number | null>(null);
  const manualRunRequiredRef = useRef(false);
  const manualRefreshRequestRef = useRef<{
    promise: Promise<boolean>;
    resolve: (refreshed: boolean) => void;
  } | null>(null);
  const refreshRef = useRef(refresh);

  // Fecha a janela commit -> passive effects: uma Promise antiga pode resolver
  // depois do commit que trouxe um resync e antes do efeito de reconciliação.
  // Layout effects rodam sincronicamente nesse intervalo, então nunca ACKamos
  // uma resposta da geração anterior usando a geração nova do provider.
  useLayoutEffect(() => {
    refreshRef.current = refresh;
    latestRevisionRef.current = revision;
    latestSilentRevisionRef.current = silentRevision ?? null;
    latestResyncGenerationRef.current = resyncGeneration;
  }, [refresh, resyncGeneration, revision, silentRevision]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      manualRefreshRequestRef.current?.resolve(false);
      manualRefreshRequestRef.current = null;
    };
  }, []);

  const settleManualRefresh = useCallback((refreshed: boolean) => {
    const request = manualRefreshRequestRef.current;
    if (!request) return;
    manualRefreshRequestRef.current = null;
    request.resolve(refreshed);
  }, []);

  const acknowledgeIfVisible = useCallback((capturedRevision: number) => {
    if (!pageIsVisible() || capturedRevision <= acknowledgedRevisionRef.current) return;
    void markTopicRead(topic, capturedRevision)
      .then(() => {
        acknowledgedRevisionRef.current = Math.max(
          acknowledgedRevisionRef.current,
          capturedRevision,
        );
      })
      .catch(() => {
        // A bolinha permanece até uma próxima oportunidade visível de ack.
      });
  }, [markTopicRead, topic]);

  const enqueueRefresh = useCallback((
    targetRevision: number,
    kind: 'acknowledged' | 'silent' = 'acknowledged',
  ) => {
    if (kind === 'silent') {
      if (
        runningRef.current
        && runningSilentRevisionRef.current === targetRevision
        && runningGenerationRef.current === latestResyncGenerationRef.current
      ) {
        if (pendingSilentRevisionRef.current === targetRevision) {
          pendingSilentRevisionRef.current = null;
        }
        return;
      }
      pendingSilentRevisionRef.current = targetRevision;
    } else {
      if (
        runningRef.current
        && runningRevisionRef.current === targetRevision
        && runningGenerationRef.current === latestResyncGenerationRef.current
      ) {
        if (
          !manualRunRequiredRef.current
          && pendingRevisionRef.current === targetRevision
        ) {
          pendingRevisionRef.current = null;
        }
        return;
      }
      pendingRevisionRef.current = Math.max(
        pendingRevisionRef.current ?? targetRevision,
        targetRevision,
      );
    }
    if (runningRef.current) return;

    runningRef.current = true;
    void (async () => {
      try {
        while (mountedRef.current && enabledRef.current) {
          const capturedRevision = pendingRevisionRef.current;
          const hadSilentInvalidation = pendingSilentRevisionRef.current !== null;
          const capturedSilentRevision = pendingSilentRevisionRef.current
            ?? latestSilentRevisionRef.current;
          const capturedRevisionBaseline = capturedRevision
            ?? latestRevisionRef.current;
          const capturedGeneration = latestResyncGenerationRef.current;
          pendingRevisionRef.current = null;
          pendingSilentRevisionRef.current = null;
          if (capturedRevision === null && !hadSilentInvalidation) break;
          runningRevisionRef.current = capturedRevision;
          runningSilentRevisionRef.current = capturedSilentRevision;
          runningGenerationRef.current = capturedGeneration;
          const servesManualRefresh = manualRunRequiredRef.current;
          if (servesManualRefresh) manualRunRequiredRef.current = false;

          let refreshed = false;
          try {
            refreshed = await refreshRef.current();
          } catch {
            refreshed = false;
          }
          runningRevisionRef.current = null;
          runningSilentRevisionRef.current = null;
          runningGenerationRef.current = null;
          if (!mountedRef.current || !enabledRef.current) {
            if (servesManualRefresh) settleManualRefresh(false);
            break;
          }
          if (refreshed && capturedRevision !== null) {
            reconciledRevisionRef.current = capturedRevision;
            reconciledResyncGenerationRef.current = capturedGeneration;
            if (capturedGeneration === latestResyncGenerationRef.current) {
              forceRefreshRef.current = false;
              acknowledgeIfVisible(capturedRevision);
            } else {
              // O request começou antes de um resync autoritativo. Mesmo que a
              // resposta antiga tenha sucesso, ela não prova reconciliação na
              // nova geração e não pode limpar a bolinha. Mantemos um follow-up
              // forçado no watermark atual.
              forceRefreshRef.current = true;
              pendingRevisionRef.current = latestRevisionRef.current;
            }
          } else if (capturedGeneration !== latestResyncGenerationRef.current) {
            // Uma invalidação silenciosa também pode ter começado antes de um
            // resync. Nesse caso ainda precisamos da reconciliação normal da
            // geração autoritativa antes de qualquer ACK.
            forceRefreshRef.current = true;
            pendingRevisionRef.current = latestRevisionRef.current;
          }

          const latest = latestRevisionRef.current;
          if (latest !== capturedRevisionBaseline) {
            pendingRevisionRef.current = latest;
          }
          const latestSilent = latestSilentRevisionRef.current;
          if (
            latestSilent !== null
            && latestSilent !== capturedSilentRevision
          ) {
            pendingSilentRevisionRef.current = latestSilent;
          }

          const needsFollowUp = pendingRevisionRef.current !== null
            || pendingSilentRevisionRef.current !== null
            || capturedGeneration !== latestResyncGenerationRef.current;
          if (servesManualRefresh) {
            if (needsFollowUp) {
              // A ação manual só termina quando o snapshot mais recente também
              // foi reconciliado. Isso evita que um evento WS concorrente aborte
              // o reload pós-write ou produza um aviso falso de atualização.
              manualRunRequiredRef.current = true;
            } else {
              settleManualRefresh(refreshed);
            }
          }
        }
      } finally {
        runningRef.current = false;
        runningRevisionRef.current = null;
        runningSilentRevisionRef.current = null;
        runningGenerationRef.current = null;
      }
    })();
  }, [acknowledgeIfVisible, settleManualRefresh]);

  const refreshManually = useCallback((): Promise<boolean> => {
    const currentRequest = manualRefreshRequestRef.current;
    if (currentRequest) return currentRequest.promise;
    if (!enabledRef.current || !mountedRef.current) return Promise.resolve(false);

    let resolveRequest!: (refreshed: boolean) => void;
    const promise = new Promise<boolean>((resolve) => {
      resolveRequest = resolve;
    });
    manualRefreshRequestRef.current = { promise, resolve: resolveRequest };
    manualRunRequiredRef.current = true;
    pendingRevisionRef.current = latestRevisionRef.current;

    // Se já existe REST em voo, o loop fará exatamente um follow-up. A ação
    // manual nunca inicia uma segunda chamada concorrente que abortaria a atual.
    if (!runningRef.current) enqueueRefresh(latestRevisionRef.current);
    return promise;
  }, [enqueueRefresh]);

  useEffect(() => {
    const wasEnabled = enabledRef.current;
    enabledRef.current = enabled;
    if (enabled && !wasEnabled && reconciledRevisionRef.current === null) {
      initialRevisionRef.current = revision;
      initialResyncGenerationRef.current = resyncGeneration;
    }
    if (!enabled) return;

    const previousObserved = observedRevisionRef.current;
    const resynced = observedResyncGenerationRef.current !== resyncGeneration;
    observedResyncGenerationRef.current = resyncGeneration;
    const revisionChanged = previousObserved !== revision;
    if (revisionChanged || resynced) {
      observedRevisionRef.current = revision;
      if (resynced || revision < previousObserved) {
        // Um status/resync autoritativo pode corrigir um cursor local adiantado.
        // A nova geração precisa de REST e ack próprios, mesmo com número menor.
        acknowledgedRevisionRef.current = -1;
        pendingRevisionRef.current = revision;
        forceRefreshRef.current = resynced;
      } else {
        pendingRevisionRef.current = Math.max(
          pendingRevisionRef.current ?? revision,
          revision,
        );
      }
    }
    if (
      silentRevision !== undefined
      && observedSilentRevisionRef.current !== silentRevision
    ) {
      observedSilentRevisionRef.current = silentRevision;
      pendingSilentRevisionRef.current = silentRevision;
    }

    if (
      reconciledRevisionRef.current === null
      && loadedOnce
      && !loading
      && !error
      && !forceRefreshRef.current
      && pendingRevisionRef.current === null
      && initialResyncGenerationRef.current === latestResyncGenerationRef.current
    ) {
      const initialRevision = initialRevisionRef.current;
      reconciledRevisionRef.current = initialRevision;
      reconciledResyncGenerationRef.current = initialResyncGenerationRef.current;
      acknowledgeIfVisible(initialRevision);
    }

    const reconciled = reconciledRevisionRef.current;
    if (
      pendingRevisionRef.current !== null
      && (
        forceRefreshRef.current
        || reconciled === null
        || pendingRevisionRef.current !== reconciled
      )
    ) {
      enqueueRefresh(pendingRevisionRef.current);
    }
    if (pendingSilentRevisionRef.current !== null) {
      enqueueRefresh(pendingSilentRevisionRef.current, 'silent');
    }
  }, [
    acknowledgeIfVisible,
    enabled,
    enqueueRefresh,
    error,
    loadedOnce,
    loading,
    revision,
    resyncGeneration,
    silentRevision,
  ]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const handleVisibility = () => {
      if (!pageIsVisible()) return;
      const reconciled = reconciledRevisionRef.current;
      const latest = latestRevisionRef.current;
      const generationReconciled = reconciledResyncGenerationRef.current
        === latestResyncGenerationRef.current;
      if (
        reconciled !== null
        && latest === reconciled
        && generationReconciled
        && !forceRefreshRef.current
      ) {
        acknowledgeIfVisible(latest);
      } else if (reconciled !== null || forceRefreshRef.current) {
        enqueueRefresh(latest);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [acknowledgeIfVisible, enabled, enqueueRefresh]);

  return refreshManually;
}
