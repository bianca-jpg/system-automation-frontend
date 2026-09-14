"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchParametros } from "@/entities/parametro/api/parametros.api";

export const toleranciaAdequacaoQueryKey = ["parametro", "tolerancia_adequacao"] as const;

// Mesmo default do backend (app/shared/config/settings.py::tolerancia_adequacao)
// — usado só como fallback antes do fetch resolver ou se ele falhar; a
// previsão exibida na tela nunca fica sem número, só menos precisa até o
// valor real chegar.
const DEFAULT_TOLERANCIA_ADEQUACAO = 0.05;

async function fetchToleranciaAdequacao(signal?: AbortSignal): Promise<number> {
  const page = await fetchParametros({
    page: 1,
    pageSize: 1,
    search: "tolerancia_adequacao",
    signal,
  });
  const row = page.rows.find(p => p.name === "tolerancia_adequacao");
  const parsed = row ? Number(row.value) : NaN;
  return Number.isFinite(parsed) ? parsed : DEFAULT_TOLERANCIA_ADEQUACAO;
}

/** Fator de adequação (1 + tolerância) usado nas previsões de faturamento
 * "com adequação" — substitui o `1.05` hardcoded (CONTRACT-01). O valor real
 * é lido de `GET /api/v1/parametros`; muda raramente, então cacheia por 5min. */
export function useToleranciaAdequacaoFator(): number {
  const query = useQuery({
    queryKey: toleranciaAdequacaoQueryKey,
    queryFn: ({ signal }) => fetchToleranciaAdequacao(signal),
    staleTime: 5 * 60 * 1000,
  });

  return 1 + (query.data ?? DEFAULT_TOLERANCIA_ADEQUACAO);
}
