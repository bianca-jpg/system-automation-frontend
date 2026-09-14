// Cobertura da correção do CONTRACT-01: o fator de adequação (antes hardcoded
// como 1.05 em orders-list.tsx) agora vem de GET /api/v1/parametros.
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { NumberedPage } from "@/shared/types/numbered-page";
import type { Parameter } from "@/entities/parametro/model/types";

const { fetchParametrosMock } = vi.hoisted(() => ({ fetchParametrosMock: vi.fn() }));
vi.mock("@/entities/parametro/api/parametros.api", () => ({
  fetchParametros: fetchParametrosMock,
}));

import { useToleranciaAdequacaoFator } from "./use-tolerancia-adequacao";

function parametroPage(rows: Parameter[]): NumberedPage<Parameter> {
  return { rows, total: rows.length, page: 1, pageSize: 25, totalPages: 1 };
}

function parametro(overrides: Partial<Parameter> = {}): Parameter {
  return {
    id: 1,
    name: "tolerancia_adequacao",
    type: "float",
    value: "0.05",
    unit: "",
    limits: "",
    limitsDetail: "",
    description: "",
    status: "Ativo",
    ...overrides,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useToleranciaAdequacaoFator", () => {
  it("antes do fetch resolver, devolve o fallback (1 + 0.05 = 1.05)", () => {
    fetchParametrosMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useToleranciaAdequacaoFator(), { wrapper });

    expect(result.current).toBe(1.05);
  });

  it("com o valor real da API (0.1), devolve 1.1", async () => {
    fetchParametrosMock.mockResolvedValue(
      parametroPage([parametro({ value: "0.1" })]),
    );

    const { result } = renderHook(() => useToleranciaAdequacaoFator(), { wrapper });

    await waitFor(() => expect(result.current).toBeCloseTo(1.1));
    expect(fetchParametrosMock).toHaveBeenCalledWith(
      expect.objectContaining({ search: "tolerancia_adequacao" }),
    );
  });

  it("se a chave não vier na resposta, cai no fallback (1.05)", async () => {
    fetchParametrosMock.mockResolvedValue(parametroPage([]));

    const { result } = renderHook(() => useToleranciaAdequacaoFator(), { wrapper });

    await waitFor(() => expect(fetchParametrosMock).toHaveBeenCalled());
    expect(result.current).toBe(1.05);
  });

  it("se a API falhar, cai no fallback (1.05) em vez de quebrar a tela", async () => {
    fetchParametrosMock.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useToleranciaAdequacaoFator(), { wrapper });

    await waitFor(() => expect(fetchParametrosMock).toHaveBeenCalled());
    expect(result.current).toBe(1.05);
  });
});
