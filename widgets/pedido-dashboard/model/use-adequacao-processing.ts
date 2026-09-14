"use client";

import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import {
  submitAdequacaoJob,
  type AdequacaoJobAccepted,
  type AdequacaoJobResult,
  type AdequacaoJobSnapshot,
  type AdequacaoJobStatus,
  type AdequacaoMode,
} from '@/features/pedidos/api/pedidos.api';
import {
  AdequacaoPollingError,
  pollAdequacaoJob,
} from '@/features/pedidos/model/adequacao-job-poller';
import type { ApiError } from '@/lib/api/http-client';
import type { ConfirmModalState } from '@/features/pedidos/ui/modals/confirm-alert-modal';

interface AdequacaoAttempt {
  mode: AdequacaoMode;
  channel: 'Todos' | 'Franquia' | 'Multimarca';
  idempotencyKey: string;
  accepted?: AdequacaoJobAccepted;
  ordersRevisionAtStart: number;
}

type AdequacaoRetry =
  | { kind: 'submission'; attempt: AdequacaoAttempt }
  | { kind: 'status'; attempt: AdequacaoAttempt & { accepted: AdequacaoJobAccepted } }
  | {
      kind: 'new';
      mode: AdequacaoMode;
      channel: AdequacaoAttempt['channel'];
    };

function adequacaoStatusLabel(
  status: AdequacaoJobStatus,
  attempts?: number,
  maxAttempts?: number,
): string {
  if (status === 'queued') return 'Aguardando uma vaga para processar';
  if (status === 'running') return 'Aplicando checkpoints no servidor';
  if (status === 'retrying') {
    return attempts && maxAttempts
      ? `Retomando com segurança — tentativa ${attempts} de ${maxAttempts}`
      : 'Retomando o processamento com segurança';
  }
  if (status === 'succeeded') return 'Processamento concluído';
  if (status === 'failed') return 'Processamento interrompido';
  return 'Processamento encerrado sem novas aplicações';
}

function adequacaoSuccessCopy(
  mode: AdequacaoMode,
  result: AdequacaoJobResult | null,
): string {
  const label = mode === 'adequar' ? 'com adequação' : 'sem adequação';
  if (!result) {
    return `O processamento ${label} foi concluído no servidor. As filas autoritativas foram atualizadas.`;
  }
  const plannedPairLabel = result.plannedCount === 1 ? 'par' : 'pares';
  const appliedVerb = result.appliedCount === 1 ? 'foi aplicado' : 'foram aplicados';
  const extras = [
    result.deferredCount > 0
      ? `${result.deferredCount} ${result.deferredCount === 1 ? 'ficou pendente' : 'ficaram pendentes'} para uma próxima execução`
      : null,
    result.blockedCreditCount > 0
      ? `${result.blockedCreditCount} ${result.blockedCreditCount === 1 ? 'foi bloqueado' : 'foram bloqueados'} por crédito`
      : null,
  ].filter(Boolean);
  return `Processamento ${label} concluído: ${result.appliedCount} de ${result.plannedCount} ${plannedPairLabel} produto-cliente ${appliedVerb} em checkpoints${extras.length ? `; ${extras.join(' e ')}` : ''}.`;
}

function abortOperationError(): Error {
  const error = new Error('Operação cancelada.');
  error.name = 'AbortError';
  return error;
}

function isAbortOperationError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export interface UseAdequacaoProcessingOptions {
  selectedChannel: 'Todos' | 'Franquia' | 'Multimarca';
  ordersRevision: number;
  usingServerOrders: boolean;
  reloadAllOrders: () => Promise<boolean>;
  refetchSummary?: () => boolean | Promise<boolean>;
  setConfirmModal: Dispatch<SetStateAction<ConfirmModalState | null>>;
}

export interface UseAdequacaoProcessingResult {
  isProcessingOr: boolean;
  startAdequacaoAttempt: (mode: AdequacaoMode) => void;
  handleRetryAdequacao: () => void;
}

/**
 * Dono do ciclo submissão → polling → retry da OR: agenda/reutiliza o job via
 * `submitAdequacaoJob`, acompanha via `pollAdequacaoJob` e só confirma
 * conclusão a partir do GET de status — realtime apenas antecipa o poll.
 */
export function useAdequacaoProcessing({
  selectedChannel,
  ordersRevision,
  usingServerOrders,
  reloadAllOrders,
  refetchSummary,
  setConfirmModal,
}: UseAdequacaoProcessingOptions): UseAdequacaoProcessingResult {
  const [isProcessingOr, setIsProcessingOr] = useState(false);
  const processingOrRef = useRef(false);
  const adequacaoAbortRef = useRef<AbortController | null>(null);
  const adequacaoPollWakeRef = useRef<(() => void) | null>(null);
  const adequacaoRetryRef = useRef<AdequacaoRetry | null>(null);
  const ordersListMountedRef = useRef(false);

  useEffect(() => {
    ordersListMountedRef.current = true;
    return () => {
      ordersListMountedRef.current = false;
      adequacaoAbortRef.current?.abort();
      adequacaoPollWakeRef.current?.();
      adequacaoPollWakeRef.current = null;
      processingOrRef.current = false;
    };
  }, []);

  const latestOrdersRevisionRef = useRef(ordersRevision);
  const observedOrdersRevisionRef = useRef(ordersRevision);

  useEffect(() => {
    latestOrdersRevisionRef.current = ordersRevision;
  }, [ordersRevision]);

  // Um evento não substitui o GET de status: apenas encerra a espera atual para
  // que o poll sequencial consulte o job mais cedo. Assim o snapshot REST segue
  // sendo a única confirmação de conclusão e de suas contagens.
  useEffect(() => {
    if (observedOrdersRevisionRef.current === ordersRevision) return;
    observedOrdersRevisionRef.current = ordersRevision;
    adequacaoPollWakeRef.current?.();
  }, [ordersRevision]);

  const waitForAdequacaoPollOrRealtime = useCallback((
    delayMs: number,
    signal: AbortSignal,
  ): Promise<void> => {
    if (signal.aborted) return Promise.reject(abortOperationError());
    return new Promise((resolve, reject) => {
      let settled = false;
      let timer: number | null = null;

      const cleanup = () => {
        if (timer !== null) window.clearTimeout(timer);
        signal.removeEventListener('abort', handleAbort);
        if (adequacaoPollWakeRef.current === handleWake) {
          adequacaoPollWakeRef.current = null;
        }
      };
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (error) reject(error);
        else resolve();
      };
      const handleAbort = () => finish(abortOperationError());
      const handleWake = () => finish();

      adequacaoPollWakeRef.current = handleWake;
      signal.addEventListener('abort', handleAbort, { once: true });
      timer = window.setTimeout(handleWake, delayMs);
    });
  }, []);

  // O processamento é durável e checkpointado. O POST só agenda/reutiliza um
  // job; a conclusão vem exclusivamente do GET de status. Uma falha de rede no
  // POST preserva a mesma chave, uma falha de polling preserva o mesmo job, e
  // somente uma falha TERMINAL marcada retryable cria uma nova intenção/chave.
  const executeAdequacaoAttempt = useCallback(async (
    attempt: AdequacaoAttempt,
    options: { pollImmediately?: boolean } = {},
  ) => {
    if (processingOrRef.current) return;
    processingOrRef.current = true;
    setIsProcessingOr(true);
    adequacaoRetryRef.current = null;

    const controller = new AbortController();
    adequacaoAbortRef.current = controller;

    const setProgress = (
      status: AdequacaoJobStatus,
      current: number,
      total: number | null,
      attempts?: number,
      maxAttempts?: number,
      title = 'O processamento é aplicado em etapas e pode ser retomado com segurança.',
    ) => {
      if (!ordersListMountedRef.current || controller.signal.aborted) return;
      setConfirmModal({
        isOpen: true,
        type: 'processing',
        title,
        progress: {
          current,
          total,
          label: adequacaoStatusLabel(status, attempts, maxAttempts),
        },
      });
    };

    try {
      let accepted = attempt.accepted;
      if (!accepted) {
        setProgress('queued', 0, null, undefined, undefined, 'Agendando o processamento seguro no servidor…');
        try {
          accepted = await submitAdequacaoJob(
            attempt.mode,
            attempt.channel,
            attempt.idempotencyKey,
            controller.signal,
          );
          attempt.accepted = accepted;
        } catch (error) {
          if (isAbortOperationError(error) || controller.signal.aborted) return;
          const status = (error as ApiError)?.status;
          const retryWithNewKey = status === 409;
          const retryableSubmission = status !== 403 && status !== 422;
          adequacaoRetryRef.current = retryWithNewKey
            ? { kind: 'new', mode: attempt.mode, channel: attempt.channel }
            : retryableSubmission
              ? { kind: 'submission', attempt }
              : null;
          const title = status === 403
            ? 'Seu perfil não tem permissão para iniciar este processamento.'
            : status === 422
              ? 'O servidor rejeitou os dados do processamento. Recarregue a página antes de tentar novamente.'
              : status === 409
                ? 'A chave desta tentativa entrou em conflito. Uma nova tentativa segura pode ser criada.'
                : status === 429
                  ? 'Há muitas tentativas recentes. Aguarde um momento e reutilize esta mesma tentativa.'
                  : status === 503
                    ? 'O serviço de processamento está temporariamente indisponível. Aguarde um momento e reutilize esta mesma tentativa.'
                  : 'Não foi possível confirmar o agendamento. Reutilize esta tentativa: a chave preservada evita processamento duplicado.';
          setConfirmModal({
            isOpen: true,
            type: 'alert',
            title,
            retryLabel: adequacaoRetryRef.current ? 'Tentar novamente' : undefined,
          });
          return;
        }
      }

      const acceptedTitle = accepted.coalesced
        ? 'Já havia um processamento compatível em andamento; acompanharemos o mesmo job.'
        : accepted.replayed
          ? 'Esta tentativa já estava registrada; o acompanhamento foi retomado sem duplicar o processamento.'
          : 'Processamento agendado. A aplicação ocorre em checkpoints retomáveis.';
      setProgress(
        accepted.status,
        accepted.progressCurrent,
        accepted.progressTotal,
        undefined,
        undefined,
        acceptedTitle,
      );

      let terminal: AdequacaoJobSnapshot;
      try {
        terminal = await pollAdequacaoJob(accepted, {
          signal: controller.signal,
          pollImmediately: options.pollImmediately
            || latestOrdersRevisionRef.current !== attempt.ordersRevisionAtStart,
          sleep: waitForAdequacaoPollOrRealtime,
          onSnapshot: snapshot => {
            setProgress(
              snapshot.status,
              snapshot.progressCurrent,
              snapshot.progressTotal,
              snapshot.attempts,
              snapshot.maxAttempts,
            );
          },
        });
      } catch (error) {
        if (isAbortOperationError(error) || controller.signal.aborted) return;
        const pollingError = error instanceof AdequacaoPollingError
          ? error
          : new AdequacaoPollingError('unavailable', accepted.jobId);
        adequacaoRetryRef.current = {
          kind: 'status',
          attempt: { ...attempt, accepted },
        };
        setConfirmModal({
          isOpen: true,
          type: 'alert',
          title: pollingError.message
            + ' Verifique novamente o mesmo job; não inicie outro processamento.',
          retryLabel: 'Verificar novamente',
        });
        return;
      }

      if (!ordersListMountedRef.current || controller.signal.aborted) return;
      if (terminal.mode !== attempt.mode || terminal.channel !== attempt.channel) {
        adequacaoRetryRef.current = {
          kind: 'status',
          attempt: { ...attempt, accepted },
        };
        setConfirmModal({
          isOpen: true,
          type: 'alert',
          title: 'O status recebido não corresponde ao modo e canal solicitados. Nenhuma confirmação foi aplicada na tela; verifique novamente o mesmo job.',
          retryLabel: 'Verificar novamente',
        });
        return;
      }
      if (terminal.status === 'succeeded') {
        let refreshed = true;
        if (usingServerOrders) refreshed = await reloadAllOrders();
        if (!ordersListMountedRef.current || controller.signal.aborted) return;
        try {
          const summaryRefreshed = await refetchSummary?.();
          if (summaryRefreshed === false) refreshed = false;
        } catch {
          refreshed = false;
        }
        const successCopy = adequacaoSuccessCopy(attempt.mode, terminal.result);
        setConfirmModal({
          isOpen: true,
          type: refreshed ? 'success' : 'alert',
          title: refreshed
            ? successCopy
            : `${successCopy} A confirmação das filas e do resumo não pôde ser concluída; recarregue a página para reconciliar os dados.`,
        });
        return;
      }

      const partialCopy = terminal.result && terminal.result.appliedCount > 0
        ? ` O servidor registrou ${terminal.result.appliedCount} ${terminal.result.appliedCount === 1 ? 'par produto-cliente aplicado' : 'pares produto-cliente aplicados'} antes do encerramento.`
        : '';
      const canStartNewAttempt = terminal.status === 'failed' && terminal.retryable;
      adequacaoRetryRef.current = canStartNewAttempt
        ? { kind: 'new', mode: attempt.mode, channel: attempt.channel }
        : null;
      setConfirmModal({
        isOpen: true,
        type: 'alert',
        title: terminal.status === 'skipped'
          ? `O job foi encerrado sem novas aplicações.${partialCopy}`
          : `O processamento foi interrompido pelo servidor.${partialCopy}${canStartNewAttempt ? ' Uma nova tentativa segura pode continuar o trabalho restante.' : ' Não há nova tentativa segura disponível para este estado.'}`,
        retryLabel: canStartNewAttempt ? 'Iniciar nova tentativa' : undefined,
      });
    } finally {
      if (adequacaoAbortRef.current === controller) {
        adequacaoAbortRef.current = null;
        processingOrRef.current = false;
        if (ordersListMountedRef.current) setIsProcessingOr(false);
      }
    }
  }, [
    refetchSummary,
    reloadAllOrders,
    setConfirmModal,
    usingServerOrders,
    waitForAdequacaoPollOrRealtime,
  ]);

  const startAdequacaoAttempt = useCallback((mode: AdequacaoMode) => {
    const pendingRetry = adequacaoRetryRef.current;
    if (pendingRetry && pendingRetry.kind !== 'new') {
      const sameIntent = pendingRetry.attempt.mode === mode
        && pendingRetry.attempt.channel === selectedChannel;
      if (sameIntent) {
        void executeAdequacaoAttempt(pendingRetry.attempt, {
          pollImmediately: pendingRetry.kind === 'status',
        });
        return;
      }
      setConfirmModal({
        isOpen: true,
        type: 'alert',
        title: 'Existe uma tentativa anterior cujo resultado ainda não foi confirmado. Retome essa tentativa antes de iniciar outro modo ou canal.',
        retryLabel: pendingRetry.kind === 'status'
          ? 'Verificar processamento'
          : 'Retomar tentativa',
      });
      return;
    }
    void executeAdequacaoAttempt({
      mode,
      channel: selectedChannel,
      idempotencyKey: `or-${crypto.randomUUID()}`,
      ordersRevisionAtStart: latestOrdersRevisionRef.current,
    });
  }, [executeAdequacaoAttempt, selectedChannel, setConfirmModal]);

  const handleRetryAdequacao = useCallback(() => {
    const retry = adequacaoRetryRef.current;
    if (!retry) return;
    if (retry.kind === 'new') {
      void executeAdequacaoAttempt({
        mode: retry.mode,
        channel: retry.channel,
        idempotencyKey: `or-${crypto.randomUUID()}`,
        ordersRevisionAtStart: latestOrdersRevisionRef.current,
      });
      return;
    }
    void executeAdequacaoAttempt(retry.attempt, {
      pollImmediately: retry.kind === 'status',
    });
  }, [executeAdequacaoAttempt]);

  return { isProcessingOr, startAdequacaoAttempt, handleRetryAdequacao };
}
