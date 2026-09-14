// Concentra o ciclo de vida do socket realtime: emissão de ticket, handshake
// de hello/replay, heartbeat com watchdog, backoff de reconexão, poll de
// status como fallback, resync autoritativo e desmontagem. Recebe do
// provider apenas o token, os slots imperativos e os aplicadores de estado,
// para poder ser lido sem montar React.

import {
  buildRealtimeWebSocketUrl,
  requestRealtimeStatus,
  requestRealtimeTicket,
} from "../api/realtime-api";
import {
  DEFAULT_HEARTBEAT_SECONDS,
  heartbeatWatchdog,
  isAuthorizationCloseCode,
  isAuthorizationFailure,
  isRecord,
  parseEventEnvelope,
  parseStatusSnapshot,
  reconnectDelay,
  toSequence,
  type TopicStatusSnapshot,
} from "./protocol";
import type { RealtimeConnectionState, RealtimeEventEnvelope } from "./types";

const MAX_MESSAGE_LENGTH = 64 * 1024;
const STATUS_POLL_INTERVAL_MS = 15_000;
const WEBSOCKET_OPEN_TIMEOUT_MS = 10_000;
const REPLAY_HANDSHAKE_TIMEOUT_MS = 75_000;
const TICKET_OPEN_MARGIN_MS = 3_000;
const TICKET_TTL_FALLBACK_MS = 20_000;
const RECONNECT_STABLE_MS = 30_000;

type ConnectionRuntime = {
  stopped: boolean;
  authStopped: boolean;
  connecting: boolean;
  connectGeneration: number;
  attempt: number;
  socket: WebSocket | null;
  ticketAbort: AbortController | null;
  pollAbort: AbortController | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  pollTimer: ReturnType<typeof setInterval> | null;
  heartbeatTimer: ReturnType<typeof setInterval> | null;
  stabilityTimer: ReturnType<typeof setTimeout> | null;
  openTimer: ReturnType<typeof setTimeout> | null;
  replayTimer: ReturnType<typeof setTimeout> | null;
  lastReceivedAt: number;
  resyncRequired: boolean;
  resyncInFlight: boolean;
};

export type RealtimeCommandSlot = {
  current: () => void;
};

export type RealtimeConnectionDeps = {
  accessToken: string;
  sequenceRef: { readonly current: number };
  readAbortControllers: Set<AbortController>;
  requestReconnectRef: RealtimeCommandSlot;
  requestResyncRef: RealtimeCommandSlot;
  stopForAuthRef: RealtimeCommandSlot;
  setConnectionState: (state: RealtimeConnectionState) => void;
  applyStatusSnapshot: (snapshot: TopicStatusSnapshot) => void;
  applyAuthoritativeStatusSnapshot: (snapshot: TopicStatusSnapshot) => void;
  applyEvent: (event: RealtimeEventEnvelope, advanceSequence?: boolean) => void;
  replaceSequence: (sequence: number) => void;
};

export function startRealtimeConnection(
  deps: RealtimeConnectionDeps,
): () => void {
  const {
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
  } = deps;

  const runtime: ConnectionRuntime = {
    stopped: false,
    authStopped: false,
    connecting: false,
    connectGeneration: 0,
    attempt: 0,
    socket: null,
    ticketAbort: null,
    pollAbort: null,
    reconnectTimer: null,
    pollTimer: null,
    heartbeatTimer: null,
    stabilityTimer: null,
    openTimer: null,
    replayTimer: null,
    lastReceivedAt: Date.now(),
    resyncRequired: false,
    resyncInFlight: false,
  };

  const stopHeartbeat = () => {
    if (runtime.heartbeatTimer) clearInterval(runtime.heartbeatTimer);
    runtime.heartbeatTimer = null;
  };

  const stopStabilityTimer = () => {
    if (runtime.stabilityTimer) clearTimeout(runtime.stabilityTimer);
    runtime.stabilityTimer = null;
  };

  const stopOpenTimer = () => {
    if (runtime.openTimer) clearTimeout(runtime.openTimer);
    runtime.openTimer = null;
  };

  const stopReplayTimer = () => {
    if (runtime.replayTimer) clearTimeout(runtime.replayTimer);
    runtime.replayTimer = null;
  };

  const stopPolling = () => {
    if (runtime.pollTimer) clearInterval(runtime.pollTimer);
    runtime.pollTimer = null;
    runtime.pollAbort?.abort();
    runtime.pollAbort = null;
  };

  const stopForAuth = () => {
    runtime.authStopped = true;
    runtime.connecting = false;
    if (runtime.reconnectTimer) clearTimeout(runtime.reconnectTimer);
    runtime.reconnectTimer = null;
    runtime.ticketAbort?.abort();
    runtime.ticketAbort = null;
    stopHeartbeat();
    stopStabilityTimer();
    stopOpenTimer();
    stopReplayTimer();
    stopPolling();
    const socket = runtime.socket;
    runtime.socket = null;
    if (socket && socket.readyState < WebSocket.CLOSING) {
      socket.onclose = null;
      socket.close(1000, "authorization_stopped");
    }
    setConnectionState("unauthorized");
  };
  stopForAuthRef.current = stopForAuth;

  const applyRuntimeSnapshot = (
    snapshot: TopicStatusSnapshot,
    authoritative: boolean,
  ) => {
    if (authoritative) {
      applyAuthoritativeStatusSnapshot(snapshot);
      runtime.resyncRequired = false;
    } else {
      // Status é um sinal de revisão, não uma confirmação de que os
      // envelopes foram consumidos. Só um resync autoritativo pode trocar o
      // cursor sem passar por `replay_complete`.
      applyStatusSnapshot(snapshot);
    }
  };

  const runStatusPoll = async (
    forceWhileConnected = false,
    authoritative = runtime.resyncRequired,
  ): Promise<boolean> => {
    if (authoritative && runtime.pollAbort) {
      runtime.pollAbort.abort();
      runtime.pollAbort = null;
    }
    if (
      runtime.stopped ||
      runtime.authStopped ||
      runtime.pollAbort ||
      navigator.onLine === false ||
      (!authoritative && document.visibilityState === "hidden") ||
      (!forceWhileConnected && runtime.socket?.readyState === WebSocket.OPEN)
    ) {
      return false;
    }

    const controller = new AbortController();
    runtime.pollAbort = controller;
    try {
      const response = await requestRealtimeStatus(runtimeAccessToken, controller.signal);
      if (runtime.stopped || runtime.authStopped || controller.signal.aborted) {
        return false;
      }
      const snapshot = parseStatusSnapshot(response);
      if (!snapshot) return false;
      applyRuntimeSnapshot(snapshot, authoritative);
      if (
        !runtime.connecting &&
        !runtime.authStopped &&
        runtime.socket?.readyState !== WebSocket.OPEN
      ) {
        setConnectionState("polling");
      }
      return true;
    } catch (error) {
      if (runtime.stopped || controller.signal.aborted) return false;
      if (isAuthorizationFailure(error)) stopForAuth();
      // Backend ou Redis fora do ar: mantém a aplicação REST utilizável e o
      // próximo poll/backoff tenta novamente sem lançar erro na árvore React.
      return false;
    } finally {
      if (runtime.pollAbort === controller) runtime.pollAbort = null;
    }
  };

  const startPolling = () => {
    if (runtime.pollTimer || runtime.authStopped || runtime.stopped) return;
    void runStatusPoll();
    runtime.pollTimer = setInterval(() => {
      void runStatusPoll();
    }, STATUS_POLL_INTERVAL_MS);
  };

  const scheduleReconnect = () => {
    if (
      runtime.stopped ||
      runtime.authStopped ||
      runtime.reconnectTimer ||
      runtime.connecting ||
      runtime.socket?.readyState === WebSocket.OPEN ||
      runtime.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }
    startPolling();
    if (navigator.onLine === false) {
      setConnectionState("offline");
      return;
    }
    runtime.attempt += 1;
    setConnectionState("polling");
    runtime.reconnectTimer = setTimeout(() => {
      runtime.reconnectTimer = null;
      void connect();
    }, reconnectDelay(runtime.attempt));
  };

  const startHeartbeat = (
    socket: WebSocket,
    heartbeatSeconds: unknown,
  ) => {
    stopHeartbeat();
    runtime.lastReceivedAt = Date.now();
    const watchdog = heartbeatWatchdog(heartbeatSeconds);
    runtime.heartbeatTimer = setInterval(() => {
      if (socket.readyState !== WebSocket.OPEN) return;
      if (Date.now() - runtime.lastReceivedAt > watchdog.timeoutMs) {
        socket.close(4000, "heartbeat_timeout");
        return;
      }
    }, watchdog.checkEveryMs);
  };

  const scheduleAttemptReset = () => {
    stopStabilityTimer();
    runtime.stabilityTimer = setTimeout(() => {
      runtime.stabilityTimer = null;
      if (
        !runtime.stopped &&
        !runtime.authStopped &&
        runtime.socket?.readyState === WebSocket.OPEN
      ) {
        runtime.attempt = 0;
      }
    }, RECONNECT_STABLE_MS);
  };

  async function connect() {
    if (
      runtime.stopped ||
      runtime.authStopped ||
      runtime.connecting ||
      runtime.socket?.readyState === WebSocket.OPEN ||
      runtime.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }
    if (navigator.onLine === false) {
      setConnectionState("offline");
      startPolling();
      return;
    }

    runtime.connecting = true;
    const connectGeneration = ++runtime.connectGeneration;
    setConnectionState(runtime.attempt > 0 ? "reconnecting" : "connecting");
    const controller = new AbortController();
    runtime.ticketAbort = controller;

    const connectIsCurrent = () =>
      !runtime.stopped &&
      !runtime.authStopped &&
      !controller.signal.aborted &&
      runtime.connectGeneration === connectGeneration &&
      runtime.ticketAbort === controller;

    try {
      // O POST cria o cursor inicial do usuário no backend. Consultar status
      // depois dele evita esconder novidades de outro dispositivo ou correr
      // contra a inicialização do baseline.
      const issueTicketLease = async () => {
        // O backend emite o ticket antes de concluir baseline/resposta. Usar
        // o início da requisição como relógio é conservador e evita abrir um
        // socket com um ticket já no fim do TTL.
        const requestedAt = Date.now();
        const ticket = await requestRealtimeTicket(
          runtimeAccessToken,
          controller.signal,
        );
        const reportedTtlMs =
          typeof ticket.expiresIn === "number" &&
          Number.isFinite(ticket.expiresIn)
            ? Math.max(0, ticket.expiresIn * 1_000)
            : TICKET_TTL_FALLBACK_MS;
        return { ticket, expiresAt: requestedAt + reportedTtlMs };
      };

      let ticketLease = await issueTicketLease();
      if (!connectIsCurrent()) return;
      if (runtime.resyncRequired && runtime.pollAbort) {
        // A tentativa de conexão passa a ser a dona do resync; evita que um
        // poll mais antigo aplique um snapshot autoritativo depois dela.
        runtime.pollAbort.abort();
        runtime.pollAbort = null;
      }
      try {
        const status = await requestRealtimeStatus(runtimeAccessToken, controller.signal);
        if (!connectIsCurrent()) return;
        const snapshot = parseStatusSnapshot(status);
        if (snapshot) {
          if (runtime.resyncRequired) {
            applyRuntimeSnapshot(snapshot, true);
          } else {
            // O status informa revisões para a UI, mas não representa eventos
            // efetivamente consumidos pelo socket. O cursor solicitado deve
            // continuar sendo o persistido até `replay_complete`.
            applyStatusSnapshot(snapshot);
          }
        }
      } catch (error) {
        if (!connectIsCurrent()) return;
        if (isAuthorizationFailure(error)) {
          stopForAuth();
          return;
        }
        // O WS ainda pode operar; status entra no fallback após um close.
      }
      if (runtime.resyncRequired) {
        throw new Error("resync_status_unavailable");
      }
      if (runtime.stopped || runtime.authStopped) return;

      const requiredTicketBudget =
        WEBSOCKET_OPEN_TIMEOUT_MS + TICKET_OPEN_MARGIN_MS;
      if (ticketLease.expiresAt - Date.now() <= requiredTicketBudget) {
        // O primeiro ticket também cria o baseline. Se o /status consumiu a
        // maior parte do TTL, emite outro somente para o handshake imediato.
        ticketLease = await issueTicketLease();
        if (!connectIsCurrent()) return;
      }
      if (ticketLease.expiresAt - Date.now() <= requiredTicketBudget) {
        throw new Error("realtime_ticket_expiry_budget");
      }
      if (!connectIsCurrent()) return;

      const requestedSequence = sequenceRef.current;
      const socket = new WebSocket(
        buildRealtimeWebSocketUrl(ticketLease.ticket, requestedSequence),
      );
      let helloReceived = false;
      let replayCompleted = false;
      let replayCursor = requestedSequence;
      let replayWatermark = requestedSequence;
      let resyncFrameReceived = false;
      let negotiatedHeartbeatSeconds: unknown = DEFAULT_HEARTBEAT_SECONDS;
      runtime.socket = socket;
      runtime.openTimer = setTimeout(() => {
        if (socket.readyState === WebSocket.CONNECTING) {
          socket.close(4000, "connect_timeout");
        }
      }, WEBSOCKET_OPEN_TIMEOUT_MS);

      socket.onopen = () => {
        if (runtime.stopped || runtime.authStopped || runtime.socket !== socket) return;
        runtime.connecting = false;
        stopOpenTimer();
        stopPolling();
        setConnectionState("connected");
        stopReplayTimer();
        runtime.replayTimer = setTimeout(() => {
          if (
            runtime.socket === socket &&
            socket.readyState === WebSocket.OPEN &&
            !replayCompleted
          ) {
            socket.close(4000, "replay_handshake_timeout");
          }
        }, REPLAY_HANDSHAKE_TIMEOUT_MS);
      };

      socket.onmessage = (message) => {
        if (runtime.socket !== socket) return;
        runtime.lastReceivedAt = Date.now();
        if (typeof message.data !== "string") {
          if (message.data instanceof Blob && message.data.size > MAX_MESSAGE_LENGTH) {
            socket.close(1009, "message_too_large");
          }
          return;
        }
        if (message.data.length > MAX_MESSAGE_LENGTH) {
          socket.close(1009, "message_too_large");
          return;
        }

        let frame: unknown;
        try {
          frame = JSON.parse(message.data) as unknown;
        } catch {
          return;
        }
        if (!isRecord(frame)) return;

        if (frame.type === "ping") {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "pong" }));
          }
          return;
        }
        if (frame.type === "pong") return;
        if (frame.type === "hello") {
          const helloLastSequence = toSequence(
            frame.lastSequence ?? frame.last_sequence,
          );
          const helloLatestSequence = toSequence(
            frame.latestSequence ?? frame.latest_sequence,
          );
          const snapshot = parseStatusSnapshot(frame);
          if (
            helloReceived ||
            !snapshot ||
            helloLastSequence === null ||
            helloLatestSequence === null ||
            helloLastSequence !== requestedSequence
          ) {
            socket.close(4002, "invalid_hello");
            return;
          }
          helloReceived = true;
          replayCursor = helloLastSequence;
          replayWatermark = helloLatestSequence;
          // Os tópicos podem sinalizar novidade imediatamente, mas o cursor
          // global só é consolidado quando o servidor confirma o replay.
          applyStatusSnapshot(snapshot);
          negotiatedHeartbeatSeconds =
            frame.heartbeatSeconds ?? frame.heartbeat_seconds;
          return;
        }
        if (frame.type === "replay_complete") {
          const completedSequence = toSequence(
            frame.lastSequence ?? frame.last_sequence,
          );
          if (resyncFrameReceived) return;
          if (
            !helloReceived ||
            replayCompleted ||
            completedSequence === null ||
            completedSequence !== replayWatermark ||
            replayCursor > replayWatermark
          ) {
            socket.close(4002, "invalid_replay_complete");
            return;
          }
          replayCompleted = true;
          replaceSequence(completedSequence);
          stopReplayTimer();
          startHeartbeat(socket, negotiatedHeartbeatSeconds);
          scheduleAttemptReset();
          return;
        }
        if (frame.type === "resync_required") {
          resyncFrameReceived = true;
          runtime.resyncRequired = true;
          setConnectionState("reconnecting");
          return;
        }

        const event = parseEventEnvelope(frame);
        if (!event || !helloReceived || resyncFrameReceived) return;
        if (!replayCompleted) {
          if (
            event.sequence <= requestedSequence ||
            event.sequence > replayWatermark
          ) {
            socket.close(4002, "invalid_replay_event");
            return;
          }
          applyEvent(event, false);
          replayCursor = Math.max(replayCursor, event.sequence);
          return;
        }
        applyEvent(event);
      };

      socket.onerror = () => {
        // O evento `close` decide retry/auth; `error` não traz informação
        // confiável no WebSocket do navegador.
      };

      socket.onclose = (event) => {
        // Um close antigo pode chegar depois que visibility/manual reconnect
        // já instalou outro socket. Ele não pode limpar timers nem mudar o
        // estado da conexão nova.
        if (runtime.socket !== socket) return;
        runtime.socket = null;
        runtime.connecting = false;
        stopOpenTimer();
        stopReplayTimer();
        stopHeartbeat();
        stopStabilityTimer();
        if (runtime.stopped || runtime.authStopped) return;
        if (isAuthorizationCloseCode(event.code)) {
          stopForAuth();
          return;
        }
        if (event.code === 1012 || resyncFrameReceived || runtime.resyncRequired) {
          runtime.resyncRequired = true;
          reconcileAfterResync();
          return;
        }
        scheduleReconnect();
      };
    } catch (error) {
      if (runtime.connectGeneration !== connectGeneration) return;
      runtime.connecting = false;
      if (runtime.stopped || runtime.authStopped || controller.signal.aborted) return;
      if (isAuthorizationFailure(error)) {
        stopForAuth();
        return;
      }
      scheduleReconnect();
    } finally {
      if (runtime.ticketAbort === controller) runtime.ticketAbort = null;
    }
  }

  function reconnectImmediately() {
    if (runtime.stopped || runtime.authStopped) return;
    if (runtime.reconnectTimer) clearTimeout(runtime.reconnectTimer);
    runtime.reconnectTimer = null;
    runtime.ticketAbort?.abort();
    runtime.ticketAbort = null;
    runtime.connectGeneration += 1;
    runtime.connecting = false;
    stopOpenTimer();
    stopReplayTimer();
    stopHeartbeat();
    stopStabilityTimer();
    const socket = runtime.socket;
    runtime.socket = null;
    if (socket) {
      socket.onclose = null;
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      if (socket.readyState < WebSocket.CLOSING) {
        socket.close(1000, "client_reconnect");
      }
    }
    void connect();
  }

  function disconnectForResync(reason: string) {
    runtime.ticketAbort?.abort();
    runtime.ticketAbort = null;
    runtime.connectGeneration += 1;
    runtime.connecting = false;
    stopOpenTimer();
    stopReplayTimer();
    stopHeartbeat();
    stopStabilityTimer();
    const socket = runtime.socket;
    runtime.socket = null;
    if (!socket) return;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    if (socket.readyState < WebSocket.CLOSING) {
      socket.close(1000, reason);
    }
  }

  function reconcileAfterResync() {
    if (
      runtime.stopped ||
      runtime.authStopped ||
      runtime.resyncInFlight
    ) {
      return;
    }
    runtime.resyncRequired = true;
    runtime.resyncInFlight = true;
    setConnectionState("reconnecting");
    void runStatusPoll(true, true).then(() => {
      runtime.resyncInFlight = false;
      if (runtime.stopped || runtime.authStopped) return;
      // Mesmo com REST saudável, o WS pode continuar reiniciando. O mesmo
      // backoff de falhas comuns evita hot-loop de tickets em 1012 repetido.
      scheduleReconnect();
    });
  }

  requestResyncRef.current = () => {
    if (runtime.stopped || runtime.authStopped) return;
    disconnectForResync("read_cursor_expired");
    reconcileAfterResync();
  };
  requestReconnectRef.current = reconnectImmediately;

  const reconnectIfDisconnected = () => {
    if (
      runtime.socket?.readyState === WebSocket.OPEN ||
      runtime.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }
    reconnectImmediately();
  };
  const handleOnline = () => reconnectIfDisconnected();
  const handleOffline = () => {
    if (runtime.authStopped || runtime.stopped) return;
    setConnectionState("offline");
    const socket = runtime.socket;
    if (socket && socket.readyState < WebSocket.CLOSING) {
      socket.close(4000, "offline");
    }
  };
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") reconnectIfDisconnected();
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  void connect();

  return () => {
    runtime.stopped = true;
    runtime.ticketAbort?.abort();
    runtime.pollAbort?.abort();
    if (runtime.reconnectTimer) clearTimeout(runtime.reconnectTimer);
    stopOpenTimer();
    stopReplayTimer();
    stopHeartbeat();
    stopStabilityTimer();
    stopPolling();
    const socket = runtime.socket;
    runtime.socket = null;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      if (socket.readyState < WebSocket.CLOSING) socket.close(1000, "provider_unmounted");
    }
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    for (const controller of readAbortControllers) controller.abort();
    readAbortControllers.clear();
    requestReconnectRef.current = () => undefined;
    requestResyncRef.current = () => undefined;
    stopForAuthRef.current = () => undefined;
  };
}
