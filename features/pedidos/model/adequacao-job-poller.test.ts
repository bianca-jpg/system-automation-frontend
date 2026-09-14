import { describe, expect, it, vi } from 'vitest';
import type {
  AdequacaoJobAccepted,
  AdequacaoJobSnapshot,
  AdequacaoJobStatus,
} from '@/features/pedidos/api/pedidos.api';
import {
  AdequacaoPollingError,
  adequacaoPollDelay,
  pollAdequacaoJob,
} from '@/features/pedidos/model/adequacao-job-poller';

const JOB_ID = '019fdf3f-0cc7-7672-b26a-0afdbfc97b6d';

function accepted(status: AdequacaoJobStatus = 'queued'): AdequacaoJobAccepted {
  return {
    jobId: JOB_ID,
    status,
    replayed: false,
    coalesced: false,
    statusUrl: `/api/v1/pedidos/processamentos/${JOB_ID}`,
    progressCurrent: 0,
    progressTotal: 4,
  };
}

function snapshot(
  status: AdequacaoJobStatus,
  overrides: Partial<AdequacaoJobSnapshot> = {},
): AdequacaoJobSnapshot {
  const terminal = status === 'succeeded' || status === 'failed' || status === 'skipped';
  return {
    jobId: JOB_ID,
    mode: 'adequar',
    channel: 'Todos',
    status,
    progressCurrent: terminal ? 4 : 1,
    progressTotal: 4,
    attempts: 1,
    maxAttempts: 4,
    retryable: status === 'failed',
    requestedAt: '2026-08-08T12:00:00.000Z',
    updatedAt: '2026-08-08T12:00:01.000Z',
    startedAt: status === 'queued' ? null : '2026-08-08T12:00:00.500Z',
    finishedAt: terminal ? '2026-08-08T12:00:01.000Z' : null,
    deadlineAt: '2026-08-08T12:20:00.000Z',
    result: status === 'succeeded'
      ? {
          plannedCount: 4,
          appliedCount: 3,
          deferredCount: 1,
          blockedCreditCount: 0,
        }
      : null,
    errorCode: status === 'failed' ? 'PROCESSING_FAILED' : null,
    ...overrides,
  };
}

describe('adequacaoPollDelay', () => {
  it('cresce de 2 s até no máximo 5 s com jitter positivo limitado', () => {
    expect(adequacaoPollDelay(0, () => 0)).toBe(2_000);
    expect(adequacaoPollDelay(0, () => 1)).toBe(2_200);
    expect(adequacaoPollDelay(1, () => 0)).toBe(2_700);
    expect(adequacaoPollDelay(2, () => 1)).toBe(3_600);
    expect(adequacaoPollDelay(4, () => 0)).toBe(4_800);
    expect(adequacaoPollDelay(4, () => 1)).toBe(5_000);
    expect(adequacaoPollDelay(99, () => 1.5)).toBe(5_000);
    expect(adequacaoPollDelay(-10, () => -1)).toBe(2_000);
  });
});

describe('pollAdequacaoJob', () => {
  it('consulta sequencialmente queued, running e retrying até o estado terminal', async () => {
    const controller = new AbortController();
    const timeline: string[] = [];
    const responses = [
      snapshot('queued', { progressCurrent: 0 }),
      snapshot('running', { progressCurrent: 1 }),
      snapshot('retrying', { progressCurrent: 2, attempts: 2 }),
      snapshot('succeeded'),
    ];
    let responseIndex = 0;
    const sleep = vi.fn(async (delayMs: number, signal: AbortSignal) => {
      expect(signal).toBe(controller.signal);
      timeline.push(`sleep:${delayMs}`);
    });
    const load = vi.fn(async (jobId: string, signal: AbortSignal) => {
      expect(jobId).toBe(JOB_ID);
      expect(signal).not.toBe(controller.signal);
      expect(signal.aborted).toBe(false);
      timeline.push(`load:${responses[responseIndex]?.status}`);
      return responses[responseIndex++]!;
    });
    const onSnapshot = vi.fn();

    const result = await pollAdequacaoJob(accepted(), {
      signal: controller.signal,
      sleep,
      load,
      random: () => 0,
      onSnapshot,
    });

    expect(result.status).toBe('succeeded');
    expect(timeline).toEqual([
      'sleep:2000',
      'load:queued',
      'sleep:2700',
      'load:running',
      'sleep:3400',
      'load:retrying',
      'sleep:4100',
      'load:succeeded',
    ]);
    expect(onSnapshot.mock.calls.map(([value]) => value.status)).toEqual([
      'queued',
      'running',
      'retrying',
      'succeeded',
    ]);
  });

  it('consulta imediatamente quando a aceitação já informa um estado terminal', async () => {
    const controller = new AbortController();
    const terminal = snapshot('skipped');
    const sleep = vi.fn(async () => undefined);
    const load = vi.fn(async () => terminal);
    const onSnapshot = vi.fn();

    const result = await pollAdequacaoJob(accepted('skipped'), {
      signal: controller.signal,
      sleep,
      load,
      onSnapshot,
    });

    expect(result).toBe(terminal);
    expect(sleep).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledWith(JOB_ID, expect.any(AbortSignal));
    expect(onSnapshot).toHaveBeenCalledOnce();
    expect(onSnapshot).toHaveBeenCalledWith(terminal);
  });

  it('tolera erros transitórios e zera a sequência de falhas após uma resposta válida', async () => {
    const controller = new AbortController();
    const load = vi.fn(async (): Promise<AdequacaoJobSnapshot> => snapshot('succeeded'))
      .mockRejectedValueOnce(new Error('indisponível 1'))
      .mockRejectedValueOnce(new Error('indisponível 2'))
      .mockResolvedValueOnce(snapshot('running'))
      .mockRejectedValueOnce(new Error('indisponível após recuperação'));
    const sleep = vi.fn(async () => undefined);

    const result = await pollAdequacaoJob(accepted(), {
      signal: controller.signal,
      sleep,
      load,
      maxConsecutiveErrors: 3,
      random: () => 0,
    });

    expect(result.status).toBe('succeeded');
    expect(load).toHaveBeenCalledTimes(5);
    expect(sleep).toHaveBeenCalledTimes(5);
  });

  it('interrompe após o máximo configurado de erros consecutivos', async () => {
    const controller = new AbortController();
    const load = vi.fn(async (): Promise<AdequacaoJobSnapshot> => {
      throw new Error('backend indisponível');
    });
    const sleep = vi.fn(async () => undefined);

    const polling = pollAdequacaoJob(accepted(), {
      signal: controller.signal,
      sleep,
      load,
      maxConsecutiveErrors: 3,
      random: () => 0,
    });

    await expect(polling).rejects.toMatchObject({
      name: 'AdequacaoPollingError',
      kind: 'unavailable',
      jobId: JOB_ID,
    });
    expect(load).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(3);
  });

  it('encerra por timeout sem iniciar uma nova consulta fora da janela', async () => {
    const controller = new AbortController();
    const clock = [0, 0, 2_500];
    const now = vi.fn(() => clock.shift() ?? 2_500);
    const sleep = vi.fn(async () => undefined);
    const load = vi.fn(async () => snapshot('running'));

    const polling = pollAdequacaoJob(accepted(), {
      signal: controller.signal,
      sleep,
      load,
      now,
      random: () => 0,
      maxDurationMs: 2_500,
    });

    await expect(polling).rejects.toBeInstanceOf(AdequacaoPollingError);
    await expect(polling).rejects.toMatchObject({
      kind: 'timeout',
      jobId: JOB_ID,
    });
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(2_000, controller.signal);
    expect(load).not.toHaveBeenCalled();
  });

  it('inclui o GET em voo no deadline e o aborta ao esgotar a janela', async () => {
    vi.useFakeTimers();
    try {
      const controller = new AbortController();
      let loadSignal: AbortSignal | undefined;
      const load = vi.fn((_jobId: string, signal: AbortSignal) => {
        loadSignal = signal;
        return new Promise<AdequacaoJobSnapshot>(() => {});
      });
      const polling = pollAdequacaoJob(accepted('succeeded'), {
        signal: controller.signal,
        load,
        maxDurationMs: 1_000,
      });
      const rejection = expect(polling).rejects.toMatchObject({
        kind: 'timeout',
        jobId: JOB_ID,
      });

      await vi.advanceTimersByTimeAsync(1_000);

      await rejection;
      expect(load).toHaveBeenCalledOnce();
      expect(loadSignal?.aborted).toBe(true);
      expect(controller.signal.aborted).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejeita snapshot de outro job sem reconciliar seu estado', async () => {
    const controller = new AbortController();
    const onSnapshot = vi.fn();
    const load = vi.fn(async () => snapshot('succeeded', {
      jobId: '019fdf3f-0cc7-7672-b26a-0afdbfc97b6e',
    }));

    await expect(pollAdequacaoJob(accepted('succeeded'), {
      signal: controller.signal,
      load,
      onSnapshot,
    })).rejects.toMatchObject({
      kind: 'unavailable',
      jobId: JOB_ID,
    });
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it('propaga AbortError quando cancelado durante a espera', async () => {
    const controller = new AbortController();
    const load = vi.fn(async () => snapshot('succeeded'));
    const polling = pollAdequacaoJob(accepted(), {
      signal: controller.signal,
      load,
      random: () => 0,
    });
    const rejection = expect(polling).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();

    await rejection;
    expect(load).not.toHaveBeenCalled();
  });

  it('propaga AbortError quando cancelado durante a carga', async () => {
    const controller = new AbortController();
    let markLoadStarted!: () => void;
    const loadStarted = new Promise<void>((resolve) => {
      markLoadStarted = resolve;
    });
    const load = vi.fn((_jobId: string, signal: AbortSignal) => {
      markLoadStarted();
      return new Promise<AdequacaoJobSnapshot>((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          const error = new Error('carga cancelada');
          error.name = 'AbortError';
          reject(error);
        }, { once: true });
      });
    });
    const polling = pollAdequacaoJob(accepted('succeeded'), {
      signal: controller.signal,
      load,
    });

    await loadStarted;
    const rejection = expect(polling).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();

    await rejection;
    expect(load).toHaveBeenCalledOnce();
  });
});
