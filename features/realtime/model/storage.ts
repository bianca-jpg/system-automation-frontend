// Concentra a persistência do cursor realtime no navegador — montagem da
// chave por usuário, formato versionado do payload, e as leituras/escritas
// que toleram storage indisponível — para que o provider não repita o mesmo
// tratamento de falha em cinco pontos distantes do arquivo.

import type { RealtimeTopicMap } from "./types";
import {
  MAX_EVENT_ID_LENGTH,
  isRecord,
  parseTopicMap,
  toSequence,
} from "./protocol";

const STORAGE_PREFIX = "system-automation:realtime:v1";
const STORAGE_VERSION = 1;
export const MAX_SEEN_EVENT_IDS = 512;

export type PersistedRealtimeState = {
  version: 1;
  sequence: number;
  topicRevisions: RealtimeTopicMap<number>;
  readRevisions: RealtimeTopicMap<number>;
  seenEventIds: string[];
};

function storageKey(userKey: string): string {
  return `${STORAGE_PREFIX}:${encodeURIComponent(userKey)}`;
}

export function parsePersistedState(raw: string | null): PersistedRealtimeState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!isRecord(value) || value.version !== STORAGE_VERSION) return null;
    const sequence = toSequence(value.sequence);
    const topicRevisions = parseTopicMap(value.topicRevisions);
    const readRevisions = parseTopicMap(value.readRevisions);
    if (sequence === null || !topicRevisions || !readRevisions) return null;
    const seenEventIds = Array.isArray(value.seenEventIds)
      ? value.seenEventIds
          .filter(
            (eventId): eventId is string =>
              typeof eventId === "string" &&
              eventId.length > 0 &&
              eventId.length <= MAX_EVENT_ID_LENGTH,
          )
          .slice(-MAX_SEEN_EVENT_IDS)
      : [];
    return {
      version: 1,
      sequence,
      topicRevisions,
      readRevisions,
      seenEventIds,
    };
  } catch {
    return null;
  }
}

// Os três wrappers abaixo engolem falha de storage por contrato: quem chama
// não tem o que fazer com o erro, o realtime segue funcional sem
// persistência (modo privado do navegador, quota excedida, etc.).

export function loadPersistedState(userKey: string): PersistedRealtimeState | null {
  try {
    return parsePersistedState(window.localStorage.getItem(storageKey(userKey)));
  } catch {
    return null;
  }
}

export function savePersistedState(
  userKey: string,
  state: PersistedRealtimeState,
): void {
  try {
    window.localStorage.setItem(storageKey(userKey), JSON.stringify(state));
  } catch {
    // Realtime continua funcional sem persistência (modo privado/quota).
  }
}

export function clearPersistedStateStorage(userKey: string): void {
  try {
    window.localStorage.removeItem(storageKey(userKey));
  } catch {
    // Storage pode estar bloqueado por política do navegador; a sessão
    // ainda precisa ser encerrada normalmente.
  }
}
