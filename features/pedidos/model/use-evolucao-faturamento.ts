"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEvolucaoFaturamento } from "@/features/pedidos/api/pedidos.api";
import { apiErrorMessage } from "@/lib/api/api-error-message";
import type { EvolucaoFaturamento } from "@/shared/types/models";

/** Não carrega o token de acesso (T-QUICK-02): a invalidação por identidade de
 * usuário é feita por remoção explícita do cache (ver AppDataProvider), não
 * por chave. Exportada para que o provider possa remover a query do cache. */
export const evolucaoFaturamentoQueryKey = ["evolucao-faturamento"] as const;

// Fallback estável para "sem dado ainda". Não é `initialData`: instalar dado
// inicial marcaria a query como tendo dado e derrubaria o esqueleto de
// carregamento. É uma constante de módulo para preservar identidade
// referencial — `dashboard-overview.tsx` memoiza a série por este array.
const EMPTY_EVOLUCAO: EvolucaoFaturamento[] = [];

export function useEvolucaoFaturamento(enabled: boolean) {
  const query = useQuery({
    queryKey: evolucaoFaturamentoQueryKey,
    queryFn: ({ signal }) => fetchEvolucaoFaturamento(signal),
    enabled,
  });

  const { refetch } = query;
  const refresh = useCallback(async (): Promise<boolean> => {
    // O refetch da v5 ignora o flag `enabled` — seguro aqui porque os dois
    // chamadores (refetchOverview e o agregado de revisão do
    // AppDataProvider) só rodam em /visao-geral, mas é uma armadilha para
    // quem reaproveitar este hook em outra rota.
    const result = await refetch();
    return result.isSuccess;
  }, [refetch]);

  return {
    data: query.data ?? EMPTY_EVOLUCAO,
    // `dataUpdatedAt` só é escrito em sucesso de fetch e permanece sticky:
    // uma falha de refresh em background não o zera. É o mesmo contrato que
    // `loadedOnce` tinha em `useLatestResource`.
    loadedOnce: query.dataUpdatedAt > 0,
    error: query.isError ? apiErrorMessage(query.error) : null,
    refresh,
  };
}
