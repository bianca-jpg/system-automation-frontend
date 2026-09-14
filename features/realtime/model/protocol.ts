// Parte determinística do protocolo realtime: normalizar/validar o que chega
// do backend (tópicos, sequências, snapshots de status, envelopes de evento)
// e derivar tempos de backoff/watchdog. Deliberadamente livre de React e de
// I/O, para poder ser exercitado sem montar o provider.

import {
  REALTIME_TOPICS,
  createTopicMap,
  type RealtimeEventEnvelope,
  type RealtimeTopic,
  type RealtimeTopicMap,
} from "./types";
import { RealtimeRequestError } from "../api/realtime-api";

export const MAX_EVENT_ID_LENGTH = 256;
export const DEFAULT_HEARTBEAT_SECONDS = 20;
const MAX_EVENT_TYPE_LENGTH = 128;
const HEARTBEAT_WATCHDOG_FACTOR = 2.25;
const HEARTBEAT_JITTER_ALLOWANCE_MS = 5_000;
const HEARTBEAT_CHECK_MIN_MS = 1_000;
const HEARTBEAT_CHECK_MAX_MS = 15_000;
const HEARTBEAT_TIMEOUT_MIN_MS = 30_000;
const HEARTBEAT_TIMEOUT_MAX_MS = 5 * 60_000;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

export type TopicStatusSnapshot = {
  sequence: number;
  revisions: RealtimeTopicMap<number>;
  readRevisions: RealtimeTopicMap<number>;
};

const TOPIC_ALIASES: Record<string, RealtimeTopic> = {
  orders: "orders",
  pedidos: "orders",
  alerts: "alerts",
  alertas: "alerts",
  communications: "communications",
  comunicacoes: "communications",
  history: "history",
  historico: "history",
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeTopic(value: unknown): RealtimeTopic | null {
  if (typeof value !== "string") return null;
  return TOPIC_ALIASES[value.toLocaleLowerCase("en-US")] ?? null;
}

export function toSequence(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

export function parseTopicMap(value: unknown): RealtimeTopicMap<number> | null {
  if (!isRecord(value)) return null;
  const revisions = createTopicMap(0);
  let found = false;
  for (const [rawTopic, rawRevision] of Object.entries(value)) {
    const topic = normalizeTopic(rawTopic);
    const revision = toSequence(rawRevision);
    if (!topic || revision === null) continue;
    revisions[topic] = revision;
    found = true;
  }
  return found ? revisions : null;
}

export function parseStatusSnapshot(value: unknown): TopicStatusSnapshot | null {
  if (!isRecord(value)) return null;

  const revisions = createTopicMap(0);
  const readRevisions = createTopicMap(0);
  let found = false;
  const topics = value.topics;
  if (Array.isArray(topics)) {
    for (const entry of topics) {
      if (!isRecord(entry)) continue;
      const topic = normalizeTopic(entry.topic);
      const latestSequence = toSequence(
        entry.latestSequence ?? entry.latest_sequence ?? entry.sequence,
      );
      if (!topic || latestSequence === null) continue;
      revisions[topic] = latestSequence;
      readRevisions[topic] =
        toSequence(entry.lastReadSequence ?? entry.last_read_sequence) ?? 0;
      found = true;
    }
  } else if (isRecord(topics)) {
    for (const [rawTopic, rawEntry] of Object.entries(topics)) {
      if (!isRecord(rawEntry)) continue;
      const topic = normalizeTopic(rawTopic);
      const latestSequence = toSequence(
        rawEntry.latestSequence ?? rawEntry.latest_sequence ?? rawEntry.sequence,
      );
      if (!topic || latestSequence === null) continue;
      revisions[topic] = latestSequence;
      readRevisions[topic] =
        toSequence(rawEntry.lastReadSequence ?? rawEntry.last_read_sequence) ?? 0;
      found = true;
    }
  }

  const mappedRevisions = parseTopicMap(
    value.topicRevisions ?? value.topic_revisions ?? value.revisions,
  );
  if (mappedRevisions) {
    for (const topic of REALTIME_TOPICS) {
      revisions[topic] = Math.max(revisions[topic], mappedRevisions[topic]);
    }
    found = true;
  }

  if (!found) return null;
  const explicitSequence = toSequence(
    value.lastSequence ?? value.last_sequence ?? value.sequence,
  );
  const latestSequence = Math.max(...Object.values(revisions));
  return {
    sequence: Math.max(explicitSequence ?? 0, latestSequence),
    revisions,
    readRevisions,
  };
}

export function parseEventEnvelope(value: unknown): RealtimeEventEnvelope | null {
  if (!isRecord(value) || value.version !== 1) return null;
  const eventId = value.eventId ?? value.event_id;
  const sequence = toSequence(value.sequence);
  const topic = normalizeTopic(value.topic);
  const type = value.type;
  const occurredAt = value.occurredAt ?? value.occurred_at;
  if (
    typeof eventId !== "string" ||
    eventId.length === 0 ||
    eventId.length > MAX_EVENT_ID_LENGTH ||
    sequence === null ||
    sequence === 0 ||
    !topic ||
    typeof type !== "string" ||
    type.length === 0 ||
    type.length > MAX_EVENT_TYPE_LENGTH ||
    typeof occurredAt !== "string"
  ) {
    return null;
  }
  return {
    version: 1,
    eventId,
    sequence,
    topic,
    type,
    occurredAt,
    payload: value.payload,
  };
}

export function isAuthorizationFailure(error: unknown): boolean {
  return (
    error instanceof RealtimeRequestError &&
    (error.status === 401 || error.status === 403)
  );
}

export function isAuthorizationCloseCode(code: number): boolean {
  return code === 1008 || code === 4001 || code === 4003 || code === 4401 || code === 4403;
}

export function reconnectDelay(attempt: number): number {
  const exponent = Math.min(Math.max(0, attempt - 1), 10);
  const base = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** exponent);
  const jitter = 0.8 + Math.random() * 0.4;
  return Math.min(RECONNECT_MAX_MS, Math.round(base * jitter));
}

export function heartbeatWatchdog(heartbeatSeconds: unknown): {
  checkEveryMs: number;
  timeoutMs: number;
} {
  const negotiatedSeconds =
    typeof heartbeatSeconds === "number" &&
    Number.isFinite(heartbeatSeconds) &&
    heartbeatSeconds > 0
      ? heartbeatSeconds
      : DEFAULT_HEARTBEAT_SECONDS;
  const heartbeatMs = negotiatedSeconds * 1_000;
  return {
    checkEveryMs: Math.min(
      HEARTBEAT_CHECK_MAX_MS,
      Math.max(HEARTBEAT_CHECK_MIN_MS, Math.round(heartbeatMs / 2)),
    ),
    timeoutMs: Math.min(
      HEARTBEAT_TIMEOUT_MAX_MS,
      Math.max(
        HEARTBEAT_TIMEOUT_MIN_MS,
        Math.round(
          heartbeatMs * HEARTBEAT_WATCHDOG_FACTOR +
            HEARTBEAT_JITTER_ALLOWANCE_MS,
        ),
      ),
    ),
  };
}
