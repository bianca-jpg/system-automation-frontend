import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCoalescedRevisionRefresh } from './use-coalesced-revision-refresh';

describe('useCoalescedRevisionRefresh', () => {
  function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(next => { resolve = next; });
    return { promise, resolve };
  }

  it('reconcilia a maior revisão perdida ao voltar para uma rota com last-good', async () => {
    const refresh = vi.fn().mockResolvedValue(true);
    const { rerender } = renderHook(
      ({ enabled, revision }) => useCoalescedRevisionRefresh(
        enabled,
        revision,
        refresh,
        true,
        0,
      ),
      { initialProps: { enabled: false, revision: 1 } },
    );
    rerender({ enabled: false, revision: 4 });
    expect(refresh).not.toHaveBeenCalled();

    rerender({ enabled: true, revision: 4 });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('continua drenando revisões depois do replay de efeitos do StrictMode', async () => {
    const refresh = vi.fn().mockResolvedValue(true);
    const { rerender } = renderHook(
      ({ revision }) => useCoalescedRevisionRefresh(true, revision, refresh, true, 0),
      {
        initialProps: { revision: 1 },
        wrapper: StrictMode,
      },
    );
    rerender({ revision: 2 });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('refaz agregado no mesmo watermark quando a geração de resync muda', async () => {
    const refresh = vi.fn().mockResolvedValue(true);
    const { rerender } = renderHook(
      ({ generation }) => useCoalescedRevisionRefresh(
        true,
        5,
        refresh,
        true,
        generation,
      ),
      { initialProps: { generation: 0 } },
    );
    rerender({ generation: 1 });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('serializa o reload manual com uma revisão concorrente e aguarda o snapshot final', async () => {
    const first = deferred<boolean>();
    const followUp = deferred<boolean>();
    const refresh = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(followUp.promise);
    const { result, rerender } = renderHook(
      ({ revision }) => useCoalescedRevisionRefresh(true, revision, refresh, true, 0),
      { initialProps: { revision: 1 } },
    );

    let manualResult!: Promise<boolean>;
    act(() => { manualResult = result.current(); });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    rerender({ revision: 2 });
    expect(refresh).toHaveBeenCalledTimes(1);

    await act(async () => { first.resolve(true); });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
    await act(async () => { followUp.resolve(true); });
    await expect(manualResult).resolves.toBe(true);
  });
});
