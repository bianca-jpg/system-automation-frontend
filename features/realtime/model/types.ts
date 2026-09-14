export const REALTIME_TOPICS = [
  "orders",
  "alerts",
  "communications",
  "history",
] as const;

export type RealtimeTopic = (typeof REALTIME_TOPICS)[number];

export type RealtimeTopicMap<T> = Record<RealtimeTopic, T>;

export type RealtimeConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "polling"
  | "offline"
  | "unauthorized";

export interface RealtimeEventEnvelope {
  version: 1;
  eventId: string;
  sequence: number;
  topic: RealtimeTopic;
  type: string;
  occurredAt: string;
  payload?: unknown;
}

export interface RealtimeContextValue {
  connectionState: RealtimeConnectionState;
  topicRevisions: RealtimeTopicMap<number>;
  /**
   * Incrementa sempre que um `resync_required` substitui o watermark local.
   * Consumidores REST devem observar esta geração além da revisão numérica,
   * pois um resync pode manter ou reduzir a sequência.
   */
  resyncGeneration: number;
  unseenTopics: RealtimeTopicMap<boolean>;
  /**
   * Marca como lidas as atualizações até uma revisão conhecida.
   *
   * Consumidores que fazem refresh REST devem capturar `topicRevisions[topic]`
   * antes da requisição e passar esse valor somente depois de ela concluir com
   * sucesso. Assim, um evento que chegar durante o refresh continua não lido.
   */
  markTopicRead: (topic: RealtimeTopic, throughRevision?: number) => Promise<void>;
  requestReconnect: () => void;
  /** Remove cursor e estado não lido do usuário atual (usado antes do logout). */
  clearPersistedState: () => void;
}

export function createTopicMap<T>(value: T): RealtimeTopicMap<T> {
  return {
    orders: value,
    alerts: value,
    communications: value,
    history: value,
  };
}
