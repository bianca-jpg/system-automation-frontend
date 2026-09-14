import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRealtimeResourceRefresh } from './use-realtime-resource-refresh';

const realtimeMocks = vi.hoisted(() => ({
  markTopicRead: vi.fn().mockResolvedValue(undefined),
  resyncGeneration: 0,
}));

vi.mock('@/features/realtime', () => ({
  useRealtime: () => ({
    markTopicRead: realtimeMocks.markTopicRead,
    resyncGeneration: realtimeMocks.resyncGeneration,
  }),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

interface HookProps {
  revision: number;
  silentRevision?: number;
  loadedOnce: boolean;
  loading: boolean;
  error: string | null;
}

describe('useRealtimeResourceRefresh', () => {
  beforeEach(() => {
    realtimeMocks.markTopicRead.mockReset().mockResolvedValue(undefined);
    realtimeMocks.resyncGeneration = 0;
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  });

  it('coalesce um burst em uma requisição e um único follow-up no maior watermark', async () => {
    const first = deferred<boolean>();
    const refresh = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(true);
    const { rerender } = renderHook(
      (props: HookProps) => useRealtimeResourceRefresh({
        enabled: true,
        topic: 'orders',
        refresh,
        ...props,
      }),
      { initialProps: { revision: 0, loadedOnce: true, loading: false, error: null } },
    );
    await waitFor(() => expect(realtimeMocks.markTopicRead).toHaveBeenCalledWith('orders', 0));

    rerender({ revision: 1, loadedOnce: true, loading: false, error: null });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    rerender({ revision: 2, loadedOnce: true, loading: false, error: null });
    rerender({ revision: 3, loadedOnce: true, loading: false, error: null });
    expect(refresh).toHaveBeenCalledTimes(1);

    await act(async () => { first.resolve(true); });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(realtimeMocks.markTopicRead).toHaveBeenCalledWith('orders', 3));
  });

  it('coalesce invalidações silenciosas sem confirmar leitura do tópico principal', async () => {
    const first = deferred<boolean>();
    const refresh = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(true);
    const { rerender } = renderHook(
      (props: HookProps) => useRealtimeResourceRefresh({
        enabled: true,
        topic: 'alerts',
        refresh,
        ...props,
      }),
      {
        initialProps: {
          revision: 4,
          silentRevision: 0,
          loadedOnce: true,
          loading: false,
          error: null,
        },
      },
    );
    await waitFor(() => expect(realtimeMocks.markTopicRead).toHaveBeenCalledWith('alerts', 4));
    realtimeMocks.markTopicRead.mockClear();

    rerender({
      revision: 4,
      silentRevision: 1,
      loadedOnce: true,
      loading: false,
      error: null,
    });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    rerender({
      revision: 4,
      silentRevision: 2,
      loadedOnce: true,
      loading: false,
      error: null,
    });
    rerender({
      revision: 4,
      silentRevision: 3,
      loadedOnce: true,
      loading: false,
      error: null,
    });
    expect(refresh).toHaveBeenCalledTimes(1);

    await act(async () => { first.resolve(true); });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
    expect(realtimeMocks.markTopicRead).not.toHaveBeenCalled();
  });

  it('não limpa a revisão nova quando o refresh correspondente falha', async () => {
    const refresh = vi.fn().mockResolvedValue(false);
    const { rerender } = renderHook(
      (props: HookProps) => useRealtimeResourceRefresh({
        enabled: true,
        topic: 'orders',
        refresh,
        ...props,
      }),
      { initialProps: { revision: 0, loadedOnce: false, loading: true, error: null } },
    );
    rerender({ revision: 1, loadedOnce: false, loading: true, error: null });
    rerender({ revision: 1, loadedOnce: true, loading: false, error: null });

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(realtimeMocks.markTopicRead).toHaveBeenCalledWith('orders', 0);
    expect(realtimeMocks.markTopicRead).not.toHaveBeenCalledWith('orders', 1);
  });

  it('reconcilia e reconhece o watermark quando o retry manual sucede após falha realtime', async () => {
    const refresh = vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const { result, rerender } = renderHook(
      (props: HookProps) => useRealtimeResourceRefresh({
        enabled: true,
        topic: 'orders',
        refresh,
        ...props,
      }),
      { initialProps: { revision: 0, loadedOnce: true, loading: false, error: null } },
    );
    await waitFor(() => expect(realtimeMocks.markTopicRead).toHaveBeenCalledWith('orders', 0));

    rerender({ revision: 1, loadedOnce: true, loading: false, error: null });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(realtimeMocks.markTopicRead).not.toHaveBeenCalledWith('orders', 1);

    await expect(result.current()).resolves.toBe(true);
    expect(refresh).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(realtimeMocks.markTopicRead).toHaveBeenCalledWith('orders', 1));
  });

  it('serializa reload manual e revisão WS concorrente até o snapshot final', async () => {
    const manualRequest = deferred<boolean>();
    const followUp = deferred<boolean>();
    const refresh = vi.fn()
      .mockReturnValueOnce(manualRequest.promise)
      .mockReturnValueOnce(followUp.promise);
    const { result, rerender } = renderHook(
      (props: HookProps) => useRealtimeResourceRefresh({
        enabled: true,
        topic: 'orders',
        refresh,
        ...props,
      }),
      { initialProps: { revision: 0, loadedOnce: true, loading: false, error: null } },
    );
    await waitFor(() => expect(realtimeMocks.markTopicRead).toHaveBeenCalledWith('orders', 0));

    let manualResult!: Promise<boolean>;
    act(() => {
      manualResult = result.current();
    });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    rerender({ revision: 1, loadedOnce: true, loading: false, error: null });
    expect(refresh).toHaveBeenCalledTimes(1);

    await act(async () => { manualRequest.resolve(true); });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
    expect(realtimeMocks.markTopicRead).not.toHaveBeenCalledWith('orders', 1);

    await act(async () => { followUp.resolve(true); });
    await expect(manualResult).resolves.toBe(true);
    await waitFor(() => expect(realtimeMocks.markTopicRead).toHaveBeenCalledWith('orders', 1));
  });

  it('só reconhece leitura quando a aba volta a ficar visível e focada', async () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    renderHook(() => useRealtimeResourceRefresh({
      enabled: true,
      topic: 'alerts',
      revision: 4,
      loadedOnce: true,
      loading: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(true),
    }));
    await act(async () => {});
    expect(realtimeMocks.markTopicRead).not.toHaveBeenCalled();

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await waitFor(() => expect(realtimeMocks.markTopicRead).toHaveBeenCalledWith('alerts', 4));
  });

  it('reconcilia e reconhece uma revisão autoritativa menor após resync', async () => {
    const refresh = vi.fn().mockResolvedValue(true);
    const { rerender } = renderHook(
      (props: HookProps) => useRealtimeResourceRefresh({
        enabled: true,
        topic: 'communications',
        refresh,
        ...props,
      }),
      { initialProps: { revision: 999, loadedOnce: true, loading: false, error: null } },
    );
    await waitFor(() => expect(realtimeMocks.markTopicRead).toHaveBeenCalledWith('communications', 999));

    rerender({ revision: 10, loadedOnce: true, loading: false, error: null });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(realtimeMocks.markTopicRead).toHaveBeenCalledWith('communications', 10));
  });

  it('refaz REST quando o resync muda de geração no mesmo watermark', async () => {
    const refresh = vi.fn().mockResolvedValue(true);
    const { rerender } = renderHook(
      (props: HookProps) => useRealtimeResourceRefresh({
        enabled: true,
        topic: 'orders',
        refresh,
        ...props,
      }),
      { initialProps: { revision: 8, loadedOnce: true, loading: false, error: null } },
    );
    await waitFor(() => expect(realtimeMocks.markTopicRead).toHaveBeenCalledWith('orders', 8));

    realtimeMocks.resyncGeneration = 1;
    rerender({ revision: 8, loadedOnce: true, loading: false, error: null });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('não reconhece o mesmo watermark se o refresh forçado do resync falhar', async () => {
    const refresh = vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const { rerender } = renderHook(
      (props: HookProps) => useRealtimeResourceRefresh({
        enabled: true,
        topic: 'orders',
        refresh,
        ...props,
      }),
      { initialProps: { revision: 8, loadedOnce: true, loading: false, error: null } },
    );
    await waitFor(() => expect(realtimeMocks.markTopicRead).toHaveBeenCalledTimes(1));

    realtimeMocks.resyncGeneration = 1;
    rerender({ revision: 8, loadedOnce: true, loading: false, error: null });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(realtimeMocks.markTopicRead).toHaveBeenCalledTimes(1);

    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(realtimeMocks.markTopicRead).toHaveBeenCalledTimes(2));
  });

  it('não duplica o refresh em voo quando a aba recebe foco', async () => {
    const pending = deferred<boolean>();
    const refresh = vi.fn().mockReturnValue(pending.promise);
    const { rerender } = renderHook(
      (props: HookProps) => useRealtimeResourceRefresh({
        enabled: true,
        topic: 'alerts',
        refresh,
        ...props,
      }),
      { initialProps: { revision: 0, loadedOnce: true, loading: false, error: null } },
    );
    await waitFor(() => expect(realtimeMocks.markTopicRead).toHaveBeenCalledWith('alerts', 0));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');

    rerender({ revision: 1, loadedOnce: true, loading: false, error: null });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    act(() => window.dispatchEvent(new Event('focus')));
    expect(refresh).toHaveBeenCalledTimes(1);

    await act(async () => { pending.resolve(true); });
    await waitFor(() => expect(realtimeMocks.markTopicRead).toHaveBeenCalledWith('alerts', 1));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('não reconhece resposta de geração anterior quando ocorre resync durante o REST', async () => {
    const oldRequest = deferred<boolean>();
    const refresh = vi.fn()
      .mockReturnValueOnce(oldRequest.promise)
      .mockResolvedValueOnce(false);
    const { rerender } = renderHook(
      (props: HookProps) => useRealtimeResourceRefresh({
        enabled: true,
        topic: 'orders',
        refresh,
        ...props,
      }),
      { initialProps: { revision: 7, loadedOnce: true, loading: false, error: null } },
    );
    await waitFor(() => expect(realtimeMocks.markTopicRead).toHaveBeenCalledWith('orders', 7));

    rerender({ revision: 8, loadedOnce: true, loading: false, error: null });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    realtimeMocks.resyncGeneration = 1;
    rerender({ revision: 8, loadedOnce: true, loading: false, error: null });

    await act(async () => { oldRequest.resolve(true); });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
    expect(realtimeMocks.markTopicRead).not.toHaveBeenCalledWith('orders', 8);

    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(3));
    expect(realtimeMocks.markTopicRead).not.toHaveBeenCalledWith('orders', 8);
  });

  it('não reconhece a carga inicial anterior ao resync se o refresh forçado falhar', async () => {
    const forcedRefresh = vi.fn().mockResolvedValue(false);
    const { rerender } = renderHook(
      (props: HookProps) => useRealtimeResourceRefresh({
        enabled: true,
        topic: 'orders',
        refresh: forcedRefresh,
        ...props,
      }),
      { initialProps: { revision: 7, loadedOnce: false, loading: true, error: null } },
    );
    expect(realtimeMocks.markTopicRead).not.toHaveBeenCalled();

    realtimeMocks.resyncGeneration = 1;
    rerender({ revision: 7, loadedOnce: false, loading: true, error: null });
    await waitFor(() => expect(forcedRefresh).toHaveBeenCalledTimes(1));
    rerender({ revision: 7, loadedOnce: true, loading: false, error: null });

    expect(realtimeMocks.markTopicRead).not.toHaveBeenCalledWith('orders', 7);
    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(forcedRefresh).toHaveBeenCalledTimes(2));
    expect(realtimeMocks.markTopicRead).not.toHaveBeenCalled();
  });

  it('tenta o ack novamente no foco quando a chamada anterior rejeita', async () => {
    realtimeMocks.markTopicRead
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined);
    renderHook(() => useRealtimeResourceRefresh({
      enabled: true,
      topic: 'history',
      revision: 7,
      loadedOnce: true,
      loading: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(true),
    }));
    await waitFor(() => expect(realtimeMocks.markTopicRead).toHaveBeenCalledTimes(1));

    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(realtimeMocks.markTopicRead).toHaveBeenCalledTimes(2));
  });
});
