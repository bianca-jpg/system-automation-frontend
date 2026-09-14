"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import {
  markRealtimeTopicRead,
  RealtimeRequestError,
} from "../api/realtime-api";
import {
  REALTIME_TOPICS,
  createTopicMap,
  type RealtimeConnectionState,
  type RealtimeContextValue,
  type RealtimeEventEnvelope,
  type RealtimeTopic,
  type RealtimeTopicMap,
} from "./types";
import {
  isAuthorizationFailure,
  type TopicStatusSnapshot,
} from "./protocol";
import {
  MAX_SEEN_EVENT_IDS,
  clearPersistedStateStorage,
  loadPersistedState,
  savePersistedState,
  type PersistedRealtimeState,
} from "./storage";
import { startRealtimeConnection } from "./connection";

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { data: session, status: authStatus } = useSession();
  const accessToken = session?.user?.accessToken ?? null;
  const userKey = session?.user?.id || session?.user?.email || null;

  const [connectionState, setConnectionState] =
    useState<RealtimeConnectionState>("idle");
  const [lastSequence, setLastSequence] = useState(0);
  const [topicRevisions, setTopicRevisions] = useState<RealtimeTopicMap<number>>(
    () => createTopicMap(0),
  );
  const [readRevisions, setReadRevisions] = useState<RealtimeTopicMap<number>>(
    () => createTopicMap(0),
  );
  const [resyncGeneration, setResyncGeneration] = useState(0);
  const [storageReady, setStorageReady] = useState(false);

  const sequenceRef = useRef(0);
  const topicRevisionsRef = useRef(topicRevisions);
  const readRevisionsRef = useRef(readRevisions);
  const seenEventIdsRef = useRef(new Set<string>());
  const seenEventOrderRef = useRef<string[]>([]);
  const activeUserKeyRef = useRef<string | null>(null);
  const activeAccessTokenRef = useRef<string | null>(null);
  const loadedUserKeyRef = useRef<string | null>(null);
  const requestReconnectRef = useRef<() => void>(() => undefined);
  const requestResyncRef = useRef<() => void>(() => undefined);
  const stopForAuthRef = useRef<() => void>(() => undefined);
  const readAbortControllersRef = useRef(new Set<AbortController>());
  const resyncGenerationRef = useRef(0);

  const replaceSequence = useCallback((sequence: number) => {
    const normalized = Math.max(0, Math.floor(sequence));
    sequenceRef.current = normalized;
    setLastSequence(normalized);
  }, []);

  const replaceTopicRevisions = useCallback((revisions: RealtimeTopicMap<number>) => {
    topicRevisionsRef.current = revisions;
    setTopicRevisions(revisions);
  }, []);

  const replaceReadRevisions = useCallback((revisions: RealtimeTopicMap<number>) => {
    readRevisionsRef.current = revisions;
    setReadRevisions(revisions);
  }, []);

  const resetClientState = useCallback(() => {
    replaceSequence(0);
    replaceTopicRevisions(createTopicMap(0));
    replaceReadRevisions(createTopicMap(0));
    seenEventIdsRef.current = new Set();
    seenEventOrderRef.current = [];
  }, [replaceReadRevisions, replaceSequence, replaceTopicRevisions]);

  const applyStatusSnapshot = useCallback(
    (snapshot: TopicStatusSnapshot) => {
      const nextRevisions = { ...topicRevisionsRef.current };
      const nextReadRevisions = { ...readRevisionsRef.current };
      for (const topic of REALTIME_TOPICS) {
        nextRevisions[topic] = Math.max(
          nextRevisions[topic],
          snapshot.revisions[topic],
        );
        nextReadRevisions[topic] = Math.min(
          nextRevisions[topic],
          Math.max(nextReadRevisions[topic], snapshot.readRevisions[topic]),
        );
      }
      replaceTopicRevisions(nextRevisions);
      replaceReadRevisions(nextReadRevisions);
    },
    [replaceReadRevisions, replaceTopicRevisions],
  );

  const applyAuthoritativeStatusSnapshot = useCallback(
    (snapshot: TopicStatusSnapshot) => {
      const authoritativeRevisions = { ...snapshot.revisions };
      const authoritativeReadRevisions = createTopicMap(0);
      for (const topic of REALTIME_TOPICS) {
        authoritativeReadRevisions[topic] = Math.min(
          authoritativeRevisions[topic],
          snapshot.readRevisions[topic],
        );
      }

      // `resync_required` significa que o watermark do cliente não é mais
      // confiável. Aqui o status do backend substitui — não mescla — cursores e
      // dedupe locais, sem alterar o cursor de leitura persistido no servidor.
      seenEventIdsRef.current = new Set();
      seenEventOrderRef.current = [];
      for (const controller of readAbortControllersRef.current) controller.abort();
      readAbortControllersRef.current.clear();
      replaceSequence(snapshot.sequence);
      replaceTopicRevisions(authoritativeRevisions);
      replaceReadRevisions(authoritativeReadRevisions);
      resyncGenerationRef.current += 1;
      setResyncGeneration(resyncGenerationRef.current);
    },
    [replaceReadRevisions, replaceSequence, replaceTopicRevisions],
  );

  const applyEvent = useCallback(
    (event: RealtimeEventEnvelope, advanceSequence = true) => {
      if (advanceSequence && event.sequence <= sequenceRef.current) return;

      if (seenEventIdsRef.current.has(event.eventId)) {
        // O evento já foi aplicado, mas avançar o cursor evita replay infinito
        // caso o relay o republice com outra sequência.
        if (advanceSequence) replaceSequence(event.sequence);
        return;
      }

      seenEventIdsRef.current.add(event.eventId);
      seenEventOrderRef.current.push(event.eventId);
      if (seenEventOrderRef.current.length > MAX_SEEN_EVENT_IDS) {
        const removed = seenEventOrderRef.current.shift();
        if (removed) seenEventIdsRef.current.delete(removed);
      }

      if (advanceSequence) replaceSequence(event.sequence);
      replaceTopicRevisions({
        ...topicRevisionsRef.current,
        [event.topic]: Math.max(
          topicRevisionsRef.current[event.topic],
          event.sequence,
        ),
      });
    },
    [replaceSequence, replaceTopicRevisions],
  );

  const markTopicRead = useCallback(
    async (topic: RealtimeTopic, throughRevision?: number) => {
      const currentRevision = topicRevisionsRef.current[topic];
      const requested =
        throughRevision === undefined || !Number.isFinite(throughRevision)
          ? currentRevision
          : Math.max(0, Math.floor(throughRevision));
      const throughSequence = Math.min(currentRevision, requested);
      if (throughSequence <= readRevisionsRef.current[topic]) return;

      const token = accessToken;
      const requestUserKey = activeUserKeyRef.current;
      const requestResyncGeneration = resyncGenerationRef.current;
      if (!token || !requestUserKey) {
        throw new DOMException(
          "Confirmação de leitura sem sessão ativa.",
          "AbortError",
        );
      }
      const controller = new AbortController();
      readAbortControllersRef.current.add(controller);
      try {
        await markRealtimeTopicRead(token, topic, throughSequence, controller.signal);
        if (
          activeUserKeyRef.current !== requestUserKey ||
          activeAccessTokenRef.current !== token ||
          resyncGenerationRef.current !== requestResyncGeneration
        ) {
          // Resolver silenciosamente faria o consumidor registrar um ACK que
          // pertence a outro usuário/geração. A rejeição mantém a revisão
          // pendente para uma nova tentativa visível.
          throw new DOMException(
            "Confirmação de leitura descartada após mudança de contexto.",
            "AbortError",
          );
        }
        // Só apaga o ponto depois que o marcador durável foi aceito. Se um
        // evento chegou durante o POST, `throughSequence` preserva esse evento.
        replaceReadRevisions({
          ...readRevisionsRef.current,
          [topic]: Math.max(readRevisionsRef.current[topic], throughSequence),
        });
      } catch (error) {
        if (
          error instanceof RealtimeRequestError &&
          (error.status === 409 || error.status === 422) &&
          activeUserKeyRef.current === requestUserKey &&
          activeAccessTokenRef.current === token &&
          resyncGenerationRef.current === requestResyncGeneration
        ) {
          // 409 indica cursor fora da retenção; 422, neste request interno e
          // já validado, indica cursor adiante do watermark. Ambos exigem
          // status autoritativo, mantendo o ponto visível até a reconciliação.
          requestResyncRef.current();
        }
        if (
          isAuthorizationFailure(error) &&
          activeUserKeyRef.current === requestUserKey &&
          activeAccessTokenRef.current === token
        ) {
          stopForAuthRef.current();
        }
        // Em indisponibilidade, mantém o ponto: o refresh REST terminou, mas o
        // backend ainda não confirmou o cursor de leitura.
        throw error;
      } finally {
        readAbortControllersRef.current.delete(controller);
      }
    },
    [accessToken, replaceReadRevisions],
  );

  const clearPersistedState = useCallback(() => {
    const currentUserKey = activeUserKeyRef.current;
    if (currentUserKey && typeof window !== "undefined") {
      // Storage pode estar bloqueado por política do navegador; a sessão
      // ainda precisa ser encerrada normalmente.
      clearPersistedStateStorage(currentUserKey);
    }
    for (const controller of readAbortControllersRef.current) controller.abort();
    readAbortControllersRef.current.clear();
    setStorageReady(false);
    resetClientState();
  }, [resetClientState]);

  const requestReconnect = useCallback(() => {
    requestReconnectRef.current();
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- This effect restores the
     authenticated user's external realtime cursor before opening the socket;
     those state writes are the synchronization itself, not derived UI state. */
  useEffect(() => {
    if (!storageReady || !userKey || activeUserKeyRef.current !== userKey) return;
    const persisted: PersistedRealtimeState = {
      version: 1,
      sequence: lastSequence,
      topicRevisions,
      readRevisions,
      seenEventIds: seenEventOrderRef.current.slice(-MAX_SEEN_EVENT_IDS),
    };
    // Realtime continua funcional sem persistência (modo privado/quota).
    savePersistedState(userKey, persisted);
  }, [lastSequence, readRevisions, storageReady, topicRevisions, userKey]);

  useEffect(() => {
    if (authStatus === "loading") return;

    if (authStatus !== "authenticated" || !accessToken || !userKey) {
      if (authStatus === "unauthenticated" && activeUserKeyRef.current) {
        // Sem storage, basta limpar o estado em memória.
        clearPersistedStateStorage(activeUserKeyRef.current);
        activeUserKeyRef.current = null;
        activeAccessTokenRef.current = null;
        loadedUserKeyRef.current = null;
        resetClientState();
      }
      return;
    }
    const runtimeAccessToken = accessToken;
    const readAbortControllers = readAbortControllersRef.current;

    if (activeUserKeyRef.current && activeUserKeyRef.current !== userKey) {
      // A troca de conta ainda reinicia todo o estado em memória.
      clearPersistedStateStorage(activeUserKeyRef.current);
      loadedUserKeyRef.current = null;
    }
    activeUserKeyRef.current = userKey;
    activeAccessTokenRef.current = accessToken;

    if (loadedUserKeyRef.current !== userKey) {
      const persisted: PersistedRealtimeState | null = loadPersistedState(userKey);
      if (persisted) {
        replaceSequence(persisted.sequence);
        replaceTopicRevisions(persisted.topicRevisions);
        replaceReadRevisions(persisted.readRevisions);
        seenEventOrderRef.current = persisted.seenEventIds;
        seenEventIdsRef.current = new Set(persisted.seenEventIds);
      } else {
        resetClientState();
      }
      loadedUserKeyRef.current = userKey;
      setStorageReady(true);
    }

    return startRealtimeConnection({
      accessToken: runtimeAccessToken,
      sequenceRef,
      readAbortControllers,
      requestReconnectRef,
      requestResyncRef,
      stopForAuthRef,
      setConnectionState,
      applyStatusSnapshot,
      applyAuthoritativeStatusSnapshot,
      applyEvent,
      replaceSequence,
    });
  }, [
    accessToken,
    applyAuthoritativeStatusSnapshot,
    applyEvent,
    applyStatusSnapshot,
    authStatus,
    replaceReadRevisions,
    replaceSequence,
    replaceTopicRevisions,
    resetClientState,
    userKey,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const unseenTopics = useMemo(() => {
    const unseen = createTopicMap(false);
    for (const topic of REALTIME_TOPICS) {
      unseen[topic] = topicRevisions[topic] > readRevisions[topic];
    }
    return unseen;
  }, [readRevisions, topicRevisions]);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      connectionState,
      topicRevisions,
      resyncGeneration,
      unseenTopics,
      markTopicRead,
      requestReconnect,
      clearPersistedState,
    }),
    [
      clearPersistedState,
      connectionState,
      markTopicRead,
      requestReconnect,
      resyncGeneration,
      topicRevisions,
      unseenTopics,
    ],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtime deve ser usado dentro de RealtimeProvider.");
  }
  return context;
}
