import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AdequacaoJobAccepted,
  AdequacaoJobSnapshot,
} from '@/features/pedidos/api/pedidos.api';
import type { Order } from '@/shared/types/models';

const mocks = vi.hoisted(() => ({
  submitAdequacaoJob: vi.fn(),
  pollAdequacaoJob: vi.fn(),
  refetchOrders: vi.fn(),
  ordersRevision: 1,
}));

vi.mock('@/shared/config/auth/permissions', () => ({
  usePermissions: () => ({ hasMinLevel: (level: number) => level <= 40 }),
}));
vi.mock('@/features/realtime', () => ({
  useRealtime: () => ({
    topicRevisions: {
      orders: mocks.ordersRevision,
      alerts: 0,
      communications: 0,
      history: 0,
    },
    markTopicRead: vi.fn().mockResolvedValue(undefined),
  }),
}));
vi.mock('@/features/pedidos/api/pedidos.api', () => ({
  approveProduct: vi.fn(),
  fetchProductPage: vi.fn(),
  fetchOrderLookupPage: vi.fn(),
  submitAdequacaoJob: mocks.submitAdequacaoJob,
}));
vi.mock('@/features/pedidos/model/adequacao-job-poller', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/pedidos/model/adequacao-job-poller')>()),
  pollAdequacaoJob: mocks.pollAdequacaoJob,
}));
vi.mock('@/features/pedidos/ui/modals/product-grade-detail-modal', () => ({
  ProductGradeDetailModal: () => null,
}));
vi.mock('@/features/pedidos/model/use-tolerancia-adequacao', () => ({
  useToleranciaAdequacaoFator: () => 1.05,
}));

import { AdequacaoPollingError } from '@/features/pedidos/model/adequacao-job-poller';
import { OrdersList } from '@/widgets/pedido-dashboard/ui/orders-list';

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

const order: Order = {
  id: '#1001',
  client: 'Cliente Teste',
  value: 100,
  originalValueBeforeAdequacao: 100,
  status: 'Liberados para faturamento',
  motivo: '',
  canal: 'Franquia',
  items: [{
    code: 'COD-1',
    name: 'Produto 1',
    qty: 1,
    unitValue: 100,
    cdStatus: 'Regular',
  }],
  adequacaoAplicada: false,
  adequacaoValorAjustado: 0,
};

function ordersListElement() {
  return (
    <OrdersList
      orders={[order]}
      communications={[]}
      setCommunications={() => {}}
      alerts={[]}
      setAlerts={() => {}}
      selectedChannel="Franquia"
      refetchOrders={mocks.refetchOrders}
      isAdequacaoActive={false}
      activeTab="abertos"
    />
  );
}

function renderOrdersList() {
  return render(ordersListElement());
}

async function confirmWithoutAdequation(doubleSubmit = false) {
  await userEvent.click(screen.getByRole('button', { name: /Efetuar OR sem adequação/i }));
  const dialog = await screen.findByRole('alertdialog');
  const confirm = within(dialog).getByRole('button', { name: 'Ok' });
  fireEvent.click(confirm);
  if (doubleSubmit) fireEvent.click(confirm);
  return dialog;
}

beforeEach(() => {
  mocks.submitAdequacaoJob.mockReset();
  mocks.pollAdequacaoJob.mockReset();
  mocks.refetchOrders.mockReset();
  mocks.ordersRevision = 1;
});

describe('OrdersList — processamento durável de OR', () => {
  it('bloqueia duplo submit, mostra progresso e só atualiza após succeeded', async () => {
    const job = accepted('550e8400-e29b-41d4-a716-446655440000');
    let finishPoll!: (value: AdequacaoJobSnapshot) => void;
    let emitProgress!: () => void;
    mocks.submitAdequacaoJob.mockResolvedValue(job);
    mocks.pollAdequacaoJob.mockImplementation((_accepted, options) => {
      emitProgress = () => options.onSnapshot?.(snapshot(job.jobId, {
          status: 'running',
          progressCurrent: 1,
          progressTotal: 3,
          result: null,
          finishedAt: null,
        }));
      return new Promise(resolve => {
        finishPoll = resolve;
      });
    });

    renderOrdersList();
    const dialog = await confirmWithoutAdequation(true);

    await waitFor(() => expect(mocks.submitAdequacaoJob).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.pollAdequacaoJob).toHaveBeenCalledTimes(1));
    await act(async () => emitProgress());
    const pendingAction = within(dialog).getByRole('button', { name: 'Processando...' });
    expect(pendingAction).toBeDisabled();
    expect(await within(dialog).findByText(/Aplicando checkpoints no servidor/i)).toBeVisible();
    expect(within(dialog).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    expect(mocks.refetchOrders).not.toHaveBeenCalled();

    await act(async () => finishPoll(snapshot(job.jobId)));
    await waitFor(() => expect(mocks.refetchOrders).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/3 de 3 pares produto-cliente/i)).toBeVisible();
  });

  it('retoma o mesmo job após falha de polling sem repetir o POST', async () => {
    const job = accepted('550e8400-e29b-41d4-a716-446655440001');
    mocks.submitAdequacaoJob.mockResolvedValue(job);
    mocks.pollAdequacaoJob
      .mockRejectedValueOnce(new AdequacaoPollingError('unavailable', job.jobId))
      .mockResolvedValueOnce(snapshot(job.jobId));

    renderOrdersList();
    await confirmWithoutAdequation();
    const retry = await screen.findByRole('button', { name: 'Verificar novamente' });
    await userEvent.click(retry);

    await waitFor(() => expect(mocks.pollAdequacaoJob).toHaveBeenCalledTimes(2));
    expect(mocks.submitAdequacaoJob).toHaveBeenCalledTimes(1);
    expect(mocks.pollAdequacaoJob.mock.calls[1]?.[0]).toMatchObject({ jobId: job.jobId });
    expect(mocks.refetchOrders).toHaveBeenCalledTimes(1);
  });

  it('gera chave nova somente após falha terminal marcada retryable', async () => {
    const firstJob = accepted('550e8400-e29b-41d4-a716-446655440002');
    const secondJob = accepted('550e8400-e29b-41d4-a716-446655440003');
    mocks.submitAdequacaoJob
      .mockResolvedValueOnce(firstJob)
      .mockResolvedValueOnce(secondJob);
    mocks.pollAdequacaoJob
      .mockResolvedValueOnce(snapshot(firstJob.jobId, {
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
      .mockResolvedValueOnce(snapshot(secondJob.jobId));

    renderOrdersList();
    await confirmWithoutAdequation();
    expect(await screen.findByText(/1 par produto-cliente aplicado/i)).toBeVisible();
    expect(mocks.refetchOrders).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Iniciar nova tentativa' }));
    await waitFor(() => expect(mocks.submitAdequacaoJob).toHaveBeenCalledTimes(2));
    expect(mocks.submitAdequacaoJob.mock.calls[0]?.[2])
      .not.toBe(mocks.submitAdequacaoJob.mock.calls[1]?.[2]);
    await waitFor(() => expect(mocks.refetchOrders).toHaveBeenCalledTimes(1));
  });

  it('não oferece nova submissão para skipped, mesmo se vier marcado retryable', async () => {
    const job = accepted('550e8400-e29b-41d4-a716-446655440006');
    mocks.submitAdequacaoJob.mockResolvedValue(job);
    mocks.pollAdequacaoJob.mockResolvedValue(snapshot(job.jobId, {
      status: 'skipped',
      retryable: true,
      progressCurrent: 0,
      result: {
        plannedCount: 0,
        appliedCount: 0,
        deferredCount: 0,
        blockedCreditCount: 0,
      },
    }));

    renderOrdersList();
    await confirmWithoutAdequation();

    expect(await screen.findByText(/encerrado sem novas aplicações/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Iniciar nova tentativa' }))
      .not.toBeInTheDocument();
    expect(mocks.submitAdequacaoJob).toHaveBeenCalledTimes(1);
    expect(mocks.refetchOrders).not.toHaveBeenCalled();
  });

  it('não mostra sucesso quando a releitura autoritativa do resumo falha', async () => {
    const job = accepted('550e8400-e29b-41d4-a716-446655440007');
    mocks.submitAdequacaoJob.mockResolvedValue(job);
    mocks.pollAdequacaoJob.mockResolvedValue(snapshot(job.jobId));
    mocks.refetchOrders.mockResolvedValue(false);

    renderOrdersList();
    await confirmWithoutAdequation();

    expect(await screen.findByText(/resumo não pôde ser concluída/i)).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Aviso' })).toBeVisible();
  });

  it('reutiliza a mesma chave após fechar e reabrir um POST de resultado incerto', async () => {
    const job = accepted('550e8400-e29b-41d4-a716-446655440004');
    mocks.submitAdequacaoJob
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(job);
    mocks.pollAdequacaoJob.mockResolvedValue(snapshot(job.jobId));

    renderOrdersList();
    await confirmWithoutAdequation();
    const errorDialog = await screen.findByRole('alertdialog');
    const closeButtons = within(errorDialog).getAllByRole('button', { name: 'Fechar' });
    await userEvent.click(closeButtons[closeButtons.length - 1]!);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await confirmWithoutAdequation();

    await waitFor(() => expect(mocks.submitAdequacaoJob).toHaveBeenCalledTimes(2));
    expect(mocks.submitAdequacaoJob.mock.calls[0]?.[2])
      .toBe(mocks.submitAdequacaoJob.mock.calls[1]?.[2]);
    await waitFor(() => expect(mocks.refetchOrders).toHaveBeenCalledTimes(1));
  });

  it('usa realtime apenas para antecipar a próxima consulta REST do job', async () => {
    const job = accepted('550e8400-e29b-41d4-a716-446655440005');
    mocks.submitAdequacaoJob.mockResolvedValue(job);
    mocks.pollAdequacaoJob.mockImplementation(async (_accepted, options) => {
      await options.sleep?.(5_000, options.signal);
      return snapshot(job.jobId);
    });

    const view = renderOrdersList();
    await confirmWithoutAdequation();
    await waitFor(() => expect(mocks.pollAdequacaoJob).toHaveBeenCalledTimes(1));
    expect(mocks.refetchOrders).not.toHaveBeenCalled();

    mocks.ordersRevision = 2;
    view.rerender(ordersListElement());

    await waitFor(() => expect(mocks.refetchOrders).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/3 de 3 pares produto-cliente/i)).toBeVisible();
  });

  it('aborta a tentativa em voo ao desmontar', async () => {
    let capturedSignal: AbortSignal | undefined;
    mocks.submitAdequacaoJob.mockImplementation((_mode, _channel, _key, signal) => {
      capturedSignal = signal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(abortOperation()), { once: true });
      });
    });

    const view = renderOrdersList();
    await confirmWithoutAdequation();
    await waitFor(() => expect(capturedSignal).toBeDefined());
    view.unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });
});

function abortOperation(): Error {
  const error = new Error('aborted');
  error.name = 'AbortError';
  return error;
}
