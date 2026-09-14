import {
  fetchAdequacaoJob,
  type AdequacaoJobAccepted,
  type AdequacaoJobSnapshot,
  type AdequacaoJobStatus,
} from '@/features/pedidos/api/pedidos.api';

const ACTIVE_STATUSES = new Set<AdequacaoJobStatus>(['queued', 'running', 'retrying']);
const DEFAULT_MAX_DURATION_MS = 20 * 60 * 1000;
const DEFAULT_MAX_CONSECUTIVE_ERRORS = 4;

type PollingFailureKind = 'timeout' | 'unavailable';

export class AdequacaoPollingError extends Error {
  readonly kind: PollingFailureKind;
  readonly jobId: string;

  constructor(kind: PollingFailureKind, jobId: string) {
    super(kind === 'timeout'
      ? 'O processamento continua no servidor, mas o acompanhamento excedeu o tempo limite.'
      : 'O processamento continua no servidor, mas não foi possível consultar o progresso.');
    this.name = 'AdequacaoPollingError';
    this.kind = kind;
    this.jobId = jobId;
  }
}

function abortError(): Error {
  const error = new Error('Operação cancelada.');
  error.name = 'AbortError';
  return error;
}

export function adequacaoPollDelay(
  attempt: number,
  random: () => number = Math.random,
): number {
  const normalizedAttempt = Math.max(0, Math.floor(attempt));
  const base = Math.min(4_800, 2_000 + normalizedAttempt * 700);
  const jitterSource = Math.max(0, Math.min(1, random()));
  return Math.min(5_000, base + Math.floor(jitterSource * 200));
}

function waitForAdequacaoPoll(delayMs: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, delayMs);
    const handleAbort = () => {
      window.clearTimeout(timer);
      signal.removeEventListener('abort', handleAbort);
      reject(abortError());
    };
    signal.addEventListener('abort', handleAbort, { once: true });
  });
}

interface PollAdequacaoJobOptions {
  signal: AbortSignal;
  onSnapshot?: (snapshot: AdequacaoJobSnapshot) => void;
  /** Reconsultas manuais e eventos realtime podem pular apenas a próxima espera. */
  pollImmediately?: boolean;
  maxDurationMs?: number;
  maxConsecutiveErrors?: number;
  random?: () => number;
  now?: () => number;
  load?: (jobId: string, signal: AbortSignal) => Promise<AdequacaoJobSnapshot>;
  sleep?: (delayMs: number, signal: AbortSignal) => Promise<void>;
}

export async function pollAdequacaoJob(
  accepted: AdequacaoJobAccepted,
  options: PollAdequacaoJobOptions,
): Promise<AdequacaoJobSnapshot> {
  const {
    signal,
    onSnapshot,
    pollImmediately = false,
    maxDurationMs = DEFAULT_MAX_DURATION_MS,
    maxConsecutiveErrors = DEFAULT_MAX_CONSECUTIVE_ERRORS,
    random = Math.random,
    now = Date.now,
    load = fetchAdequacaoJob,
    sleep = waitForAdequacaoPoll,
  } = options;
  const startedAt = now();
  let pollAttempt = 0;
  let consecutiveErrors = 0;
  let fetchImmediately = pollImmediately || !ACTIVE_STATUSES.has(accepted.status);

  while (true) {
    if (signal.aborted) throw abortError();
    const elapsed = now() - startedAt;
    if (elapsed >= maxDurationMs) {
      throw new AdequacaoPollingError('timeout', accepted.jobId);
    }

    if (!fetchImmediately) {
      const delay = adequacaoPollDelay(pollAttempt, random);
      if (elapsed + delay > maxDurationMs) {
        throw new AdequacaoPollingError('timeout', accepted.jobId);
      }
      await sleep(delay, signal);
      if (now() - startedAt >= maxDurationMs) {
        throw new AdequacaoPollingError('timeout', accepted.jobId);
      }
    }
    fetchImmediately = false;
    pollAttempt += 1;

    const remainingMs = maxDurationMs - (now() - startedAt);
    if (remainingMs <= 0) {
      throw new AdequacaoPollingError('timeout', accepted.jobId);
    }
    const loadController = new AbortController();
    let deadlineTimer: number | null = null;
    let rejectBoundary: ((error: Error) => void) | null = null;
    const handleOuterAbort = () => {
      rejectBoundary?.(abortError());
      loadController.abort();
    };
    const loadBoundary = new Promise<never>((_resolve, reject) => {
      rejectBoundary = reject;
      signal.addEventListener('abort', handleOuterAbort, { once: true });
      deadlineTimer = window.setTimeout(() => {
        reject(new AdequacaoPollingError('timeout', accepted.jobId));
        loadController.abort();
      }, remainingMs);
      if (signal.aborted) handleOuterAbort();
    });

    let snapshot: AdequacaoJobSnapshot;
    try {
      snapshot = await Promise.race([
        load(accepted.jobId, loadController.signal),
        loadBoundary,
      ]);
      if (signal.aborted) throw abortError();
      if (now() - startedAt >= maxDurationMs) {
        throw new AdequacaoPollingError('timeout', accepted.jobId);
      }
      consecutiveErrors = 0;
    } catch (error) {
      if (signal.aborted) throw abortError();
      if (error instanceof AdequacaoPollingError) throw error;
      consecutiveErrors += 1;
      if (consecutiveErrors >= maxConsecutiveErrors) {
        throw new AdequacaoPollingError('unavailable', accepted.jobId);
      }
      continue;
    } finally {
      if (deadlineTimer !== null) window.clearTimeout(deadlineTimer);
      signal.removeEventListener('abort', handleOuterAbort);
    }

    if (snapshot.jobId !== accepted.jobId) {
      throw new AdequacaoPollingError('unavailable', accepted.jobId);
    }
    onSnapshot?.(snapshot);
    if (!ACTIVE_STATUSES.has(snapshot.status)) return snapshot;
  }
}
