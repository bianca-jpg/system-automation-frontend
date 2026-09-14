import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AdequacaoJobAccepted,
  AdequacaoJobSnapshot,
} from '@/features/pedidos/api/pedidos.api';
import type { UseAdequacaoProcessingOptions } from '@/widgets/pedido-dashboard/model/use-adequacao-processing';

// Fábricas duplicadas propositalmente (não importadas de
// orders-list.processing.test.tsx): mantém os dois testes independentes.
const mocks = vi.hoisted(() => ({
  submitAdequacaoJob: vi.fn(),
  pollAdequacaoJob: vi.fn(),
}));

vi.mock('@/features/pedidos/api/pedidos.api', () => ({
  submitAdequacaoJob: mocks.submitAdequacaoJob,
}));
vi.mock('@/features/pedidos/model/adequacao-job-poller', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/pedidos/model/adequacao-job-poller')>()),
  pollAdequacaoJob: mocks.pollAdequacaoJob,
}));

import { AdequacaoPollingError } from '@/features/pedidos/model/adequacao-job-poller';
import { useAdequacaoProcessing } from '@/widgets/pedido-dashboard/model/use-adequacao-processing';

const accepted = (jobId: string): AdequacaoJobAccepted => ({
  jobId,
  status: 'queued',
  replayed: false,
  coalesced: false,
  statusUrl: `/api/v1/pedidos/processamentos/${jobId}`,
  progressCurrent: 0,
  progressTotal: null,
});

const snapshot = (
  jobId: string,
  overrides: Partial<AdequacaoJobSnapshot> = {},
): AdequacaoJobSnapshot => ({
  jobId,
  mode: 'sem_adequar',
  channel: 'Franquia',
  status: 'succeeded',
  progressCurrent: 3,
  progressTotal: 3,
  attempts: 1,
  maxAttempts: 3,
  retryable: false,
  requestedAt: '2026-08-08T10:00:00Z',
  updatedAt: '2026-08-08T10:00:03Z',
  startedAt: '2026-08-08T10:00:00Z',
  finishedAt: '2026-08-08T10:00:03Z',
  deadlineAt: '2026-08-08T10:20:00Z',
  result: {
    plannedCount: 3,
    appliedCount: 3,
    deferredCount: 0,
    blockedCreditCount: 0,
  },
  errorCode: null,
  ...overrides,
});

function makeOptions(
  overrides: Partial<UseAdequacaoProcessingOptions> = {},
): UseAdequacaoProcessingOptions {
  return {
    selectedChannel: 'Franquia',
    ordersRevision: 1,
    usingServerOrders: true,
    reloadAllOrders: vi.fn().mockResolvedValue(true),
    refetchSummary: vi.fn().mockResolvedValue(true),
    setConfirmModal: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mocks.submitAdequacaoJob.mockReset();
  mocks.pollAdequacaoJob.mockReset();
});

describe('useAdequacaoProcessing', () => {
  it('submissão feliz: submitAdequacaoJob é chamado uma vez e succeeded confirma reload + resumo + modal de sucesso', async () => {
    const job = accepted('550e8400-e29b-41d4-a716-446655440010');
    mocks.submitAdequacaoJob.mockResolvedValue(job);
    mocks.pollAdequacaoJob.mockResolvedValue(snapshot(job.jobId));
    const setConfirmModal = vi.fn();
    const reloadAllOrders = vi.fn().mockResolvedValue(true);
    const refetchSummary = vi.fn().mockResolvedValue(true);

    const { result } = renderHook(() => useAdequacaoProcessing(makeOptions({
      setConfirmModal,
      reloadAllOrders,
      refetchSummary,
    })));

    act(() => {
      result.current.startAdequacaoAttempt('sem_adequar');
    });

    await waitFor(() => expect(mocks.submitAdequacaoJob).toHaveBeenCalledTimes(1));
    expect(mocks.submitAdequacaoJob).toHaveBeenCalledWith(
      'sem_adequar',
      'Franquia',
      expect.any(String),
      expect.any(AbortSignal),
    );

    await waitFor(() => expect(reloadAllOrders).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(refetchSummary).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      const last = setConfirmModal.mock.calls.at(-1)?.[0];
      expect(last).toMatchObject({ type: 'success' });
    });
  });

  it('reentrância: duas chamadas antes da conclusão produzem uma submissão só, e isProcessingOr fica true durante o voo', async () => {
    const job = accepted('550e8400-e29b-41d4-a716-446655440011');
    let resolvePoll!: (value: AdequacaoJobSnapshot) => void;
    mocks.submitAdequacaoJob.mockResolvedValue(job);
    mocks.pollAdequacaoJob.mockImplementation(() => new Promise(resolve => {
      resolvePoll = resolve;
    }));

    const { result } = renderHook(() => useAdequacaoProcessing(makeOptions()));

    act(() => {
      result.current.startAdequacaoAttempt('sem_adequar');
    });
    await waitFor(() => expect(mocks.submitAdequacaoJob).toHaveBeenCalledTimes(1));
    expect(result.current.isProcessingOr).toBe(true);

    act(() => {
      result.current.startAdequacaoAttempt('sem_adequar');
    });
    expect(mocks.submitAdequacaoJob).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePoll(snapshot(job.jobId));
    });
    await waitFor(() => expect(result.current.isProcessingOr).toBe(false));
  });

  it('falha de polling: modal fica alert com retryLabel de verificação; handleRetryAdequacao repete só o polling', async () => {
    const job = accepted('550e8400-e29b-41d4-a716-446655440012');
    mocks.submitAdequacaoJob.mockResolvedValue(job);
    mocks.pollAdequacaoJob
      .mockRejectedValueOnce(new AdequacaoPollingError('unavailable', job.jobId))
      .mockResolvedValueOnce(snapshot(job.jobId));

    const setConfirmModal = vi.fn();
    const { result } = renderHook(() => useAdequacaoProcessing(makeOptions({ setConfirmModal })));

    act(() => {
      result.current.startAdequacaoAttempt('sem_adequar');
    });
    await waitFor(() => expect(mocks.pollAdequacaoJob).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      const last = setConfirmModal.mock.calls.at(-1)?.[0];
      expect(last).toMatchObject({ type: 'alert', retryLabel: 'Verificar novamente' });
    });

    act(() => {
      result.current.handleRetryAdequacao();
    });
    await waitFor(() => expect(mocks.pollAdequacaoJob).toHaveBeenCalledTimes(2));
    expect(mocks.submitAdequacaoJob).toHaveBeenCalledTimes(1);
    expect(mocks.pollAdequacaoJob.mock.calls[1]?.[0]).toMatchObject({ jobId: job.jobId });
  });

  it('chave idempotente: falha de rede no POST preserva a chave; falha terminal retryable gera chave diferente', async () => {
    const jobA = accepted('550e8400-e29b-41d4-a716-446655440013');
    const jobB = accepted('550e8400-e29b-41d4-a716-446655440014');
    mocks.submitAdequacaoJob
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(jobA)
      .mockResolvedValueOnce(jobB);
    mocks.pollAdequacaoJob
      .mockResolvedValueOnce(snapshot(jobA.jobId, {
        status: 'failed',
        retryable: true,
        progressCurrent: 1,
        result: {
          plannedCount: 3,
          appliedCount: 1,
          deferredCount: 2,
          blockedCreditCount: 0,
        },
        errorCode: 'checkpoint_failed',
      }))
      .mockResolvedValueOnce(snapshot(jobB.jobId));

    const { result } = renderHook(() => useAdequacaoProcessing(makeOptions()));

    act(() => {
      result.current.startAdequacaoAttempt('sem_adequar');
    });
    await waitFor(() => expect(mocks.submitAdequacaoJob).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.handleRetryAdequacao();
    });
    await waitFor(() => expect(mocks.submitAdequacaoJob).toHaveBeenCalledTimes(2));
    const keyFirstSubmission = mocks.submitAdequacaoJob.mock.calls[0]?.[2];
    const keyRetriedSubmission = mocks.submitAdequacaoJob.mock.calls[1]?.[2];
    expect(keyRetriedSubmission).toBe(keyFirstSubmission);

    await waitFor(() => expect(mocks.pollAdequacaoJob).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.handleRetryAdequacao();
    });
    await waitFor(() => expect(mocks.submitAdequacaoJob).toHaveBeenCalledTimes(3));
    const keyNewAttempt = mocks.submitAdequacaoJob.mock.calls[2]?.[2];
    expect(keyNewAttempt).not.toBe(keyFirstSubmission);

    await waitFor(() => expect(mocks.pollAdequacaoJob).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.isProcessingOr).toBe(false));
  });

  it('terminal divergente: snapshot com mode/channel diferentes da intenção não produz modal de sucesso', async () => {
    const job = accepted('550e8400-e29b-41d4-a716-446655440015');
    mocks.submitAdequacaoJob.mockResolvedValue(job);
    mocks.pollAdequacaoJob.mockResolvedValue(snapshot(job.jobId, {
      mode: 'adequar',
      channel: 'Multimarca',
    }));

    const setConfirmModal = vi.fn();
    const { result } = renderHook(() => useAdequacaoProcessing(makeOptions({
      setConfirmModal,
      selectedChannel: 'Franquia',
    })));

    act(() => {
      result.current.startAdequacaoAttempt('sem_adequar');
    });

    await waitFor(() => {
      const last = setConfirmModal.mock.calls.at(-1)?.[0];
      expect(last?.type).not.toBe('success');
      expect(last).toMatchObject({ type: 'alert', retryLabel: 'Verificar novamente' });
    });
  });

  it('desmontagem: aborta o AbortSignal entregue a submitAdequacaoJob quando desmonta com tentativa em voo', async () => {
    let capturedSignal: AbortSignal | undefined;
    mocks.submitAdequacaoJob.mockImplementation((
      _mode: unknown,
      _channel: unknown,
      _key: unknown,
      signal: AbortSignal,
    ) => {
      capturedSignal = signal;
      return new Promise(() => {});
    });

    const { result, unmount } = renderHook(() => useAdequacaoProcessing(makeOptions()));

    act(() => {
      result.current.startAdequacaoAttempt('sem_adequar');
    });
    await waitFor(() => expect(capturedSignal).toBeDefined());

    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });
});
