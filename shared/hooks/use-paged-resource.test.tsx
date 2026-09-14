import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { NumberedPage } from "@/shared/types/numbered-page";
import { usePagedResource } from "./use-paged-resource";

function page(number: number, totalPages = 3): NumberedPage<number> {
  return {
    rows: [number],
    total: totalPages,
    page: number,
    pageSize: 1,
    totalPages,
  };
}

describe("usePagedResource", () => {
  it("busca páginas 1, 2 e 3 sem acumular as linhas anteriores", async () => {
    const fetchPage = vi.fn(async (number: number) => page(number));
    // `enabled` propositalmente omitido: cobre o default `true` do hook
    // consolidado — não "conserte" adicionando o campo aqui.
    const { result } = renderHook(() => usePagedResource({
      queryKey: "usuarios|email|asc",
      fetchPage,
    }));

    await waitFor(() => expect(result.current.rows).toEqual([1]));
    act(() => result.current.setPage(2));
    await waitFor(() => expect(result.current.rows).toEqual([2]));
    act(() => result.current.setPage(3));
    await waitFor(() => expect(result.current.rows).toEqual([3]));

    expect(fetchPage.mock.calls.map(([number]) => number)).toEqual([1, 2, 3]);
  });

  it("volta à página 1 quando busca ou ordenação muda", async () => {
    const fetchA = vi.fn(async (number: number) => page(number));
    const fetchB = vi.fn(async (number: number) => page(number, 1));
    // `enabled` propositalmente omitido aqui também: cobre o default `true`.
    const { result, rerender } = renderHook(
      ({ queryKey }) => usePagedResource({
        queryKey,
        fetchPage: queryKey === "a" ? fetchA : fetchB,
      }),
      { initialProps: { queryKey: "a" } },
    );

    await waitFor(() => expect(result.current.rows).toEqual([1]));
    act(() => result.current.setPage(3));
    await waitFor(() => expect(result.current.rows).toEqual([3]));

    rerender({ queryKey: "b" });
    await waitFor(() => expect(fetchB).toHaveBeenCalledWith(1, expect.any(AbortSignal)));
    await waitFor(() => expect(result.current.page).toBe(1));
  });
});
