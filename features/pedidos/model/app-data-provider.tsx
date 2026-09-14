"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtime } from '@/features/realtime';
import { pathToSection } from '@/shared/config/routes';
import type { EvolucaoFaturamento } from '@/shared/types/models';
import { setAuthToken } from '@/lib/api/http-client';
import {
  fetchPedidosResumo,
  type PedidosCanal,
  type PedidosResumo,
} from '@/features/pedidos/api/pedidos.api';
import { useLatestResource } from '@/features/pedidos/model/use-latest-resource';
import { useCoalescedRevisionRefresh } from '@/features/pedidos/model/use-coalesced-revision-refresh';
import {
  evolucaoFaturamentoQueryKey,
  useEvolucaoFaturamento,
} from '@/features/pedidos/model/use-evolucao-faturamento';

interface AppDataContextType {
  selectedChannel: PedidosCanal;
  setSelectedChannel: React.Dispatch<React.SetStateAction<PedidosCanal>>;
  selectedMonthSimulated: number;
  evolucaoFaturamento: EvolucaoFaturamento[];
  resumo: PedidosResumo | null;
  overviewLoading: boolean;
  overviewError: string | null;
  overviewRefreshError: string | null;
  refetchOverview: () => void;
  refetchPedidosResumo: () => Promise<boolean>;
  erroDeCarga: string | null;
  tentarNovamenteRecursos: () => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

// Espelha apenas o fato de o token já ter sido instalado no singleton HTTP.
// useSyncExternalStore permite que o effect sincronize esse sistema externo e
// só então monte consumidores filhos, sem setState síncrono dentro do effect.
let installedTokenSnapshot: string | null | undefined;
const installedTokenListeners = new Set<() => void>();
const subscribeInstalledToken = (listener: () => void) => {
  installedTokenListeners.add(listener);
  return () => installedTokenListeners.delete(listener);
};
const getInstalledTokenSnapshot = () => installedTokenSnapshot;
const publishInstalledToken = (token: string | null) => {
  setAuthToken(token);
  installedTokenSnapshot = token;
  installedTokenListeners.forEach(listener => listener());
};

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { data: session, status: authStatus } = useSession();
  const accessToken = session?.user?.accessToken ?? null;
  const pathname = usePathname();
  const secaoAtual = pathToSection(pathname ?? '');
  const { topicRevisions, resyncGeneration } = useRealtime();
  const usesResumo = secaoAtual === 'visao-geral' || secaoAtual === 'pedidos';
  const installedAccessToken = useSyncExternalStore(
    subscribeInstalledToken,
    getInstalledTokenSnapshot,
    () => undefined,
  );
  // Calculado aqui — antes dos hooks de dados — porque a query da evolução
  // precisa desse valor já no seu `enabled` durante ESTE render. Sem isso o
  // observer da query poderia disparar no mount do provider, antes do efeito
  // que instala o token: a mesma classe de defeito de ordem descrita no
  // cabeçalho do teste (`app-data-provider.test.tsx`).
  const apiClientReady = authStatus === 'authenticated'
    && Boolean(accessToken)
    && installedAccessToken === accessToken;
  const queryClient = useQueryClient();

  const {
    data: resumo,
    loading: resumoLoading,
    loadedOnce: resumoLoadedOnce,
    attempted: resumoAttempted,
    error: resumoError,
    reload: reloadResumo,
    reset: resetResumo,
  } = useLatestResource<PedidosResumo | null>(
    null,
    fetchPedidosResumo,
  );
  const {
    data: evolucaoFaturamento,
    loadedOnce: evolucaoLoadedOnce,
    error: evolucaoError,
    refresh: refreshEvolucao,
  } = useEvolucaoFaturamento(apiClientReady && secaoAtual === 'visao-geral');
  const [selectedChannel, setSelectedChannel] = useState<PedidosCanal>('Todos');
  const [selectedMonthSimulated] = useState(
    () => new Date().getMonth() + 1,
  );
  // O cache gigante em sessionStorage foi removido. Além de vários MB por aba,
  // suas chaves não carregavam identidade de usuário e podiam pintar dados do
  // login anterior até o refresh terminar. Mantemos somente dados em memória e
  // zeramos tudo quando o token muda.
  const previousTokenRef = useRef<string | null>(null);
  useEffect(() => {
    publishInstalledToken(accessToken);
    if (previousTokenRef.current !== accessToken) {
      resetResumo();
      // Descarte por identidade, não por chave: a query key da evolução não
      // carrega o token (T-QUICK-02), então trocar de usuário exige remover
      // a entrada do cache explicitamente — senão o próximo render pintaria
      // o dado do login anterior até o refetch terminar.
      queryClient.removeQueries({ queryKey: evolucaoFaturamentoQueryKey });
      previousTokenRef.current = accessToken;
    }
    return () => {
      // Uma instância antiga nunca pode apagar o token que uma instância nova
      // já instalou durante uma troca de árvore/layout.
      if (installedTokenSnapshot === accessToken) publishInstalledToken(null);
    };
  }, [accessToken, resetResumo, queryClient]);

  // Nenhuma leitura de negócio é global. `/resumo` entra apenas no dashboard e
  // em Pedidos (contagens agregadas); evolução e parâmetros também são por
  // rota. A evolução não precisa de ramo aqui: quem decide se ela busca é o
  // flag de habilitação passado a `useEvolucaoFaturamento`.
  useEffect(() => {
    if (authStatus !== 'authenticated' || !accessToken) return;
    setAuthToken(accessToken);

    if (usesResumo && !resumoLoadedOnce && !resumoAttempted && !resumoLoading) {
      void reloadResumo();
    }
  }, [
    authStatus,
    accessToken,
    usesResumo,
    resumoLoadedOnce,
    resumoAttempted,
    resumoLoading,
    reloadResumo,
  ]);

  const refetchOverviewAsync = useCallback(async () => {
    const [resumoOk, evolucaoOk] = await Promise.all([
      reloadResumo(),
      refreshEvolucao(),
    ]);
    return resumoOk && evolucaoOk;
  }, [
    reloadResumo,
    refreshEvolucao,
  ]);

  // Em /visao-geral, uma revisão invalida resumo e evolução como uma unidade.
  // Em /pedidos, só o resumo acompanha as filas. Bursts são coalescidos: uma
  // requisição em voo e, se necessário, um follow-up no maior watermark.
  const refreshOrdersAggregate = useCallback(
    () => secaoAtual === 'visao-geral' ? refetchOverviewAsync() : reloadResumo(),
    [refetchOverviewAsync, reloadResumo, secaoAtual],
  );
  useCoalescedRevisionRefresh(
    authStatus === 'authenticated' && Boolean(accessToken) && usesResumo,
    topicRevisions.orders,
    refreshOrdersAggregate,
    secaoAtual === 'visao-geral'
      ? resumoLoadedOnce && evolucaoLoadedOnce
      : resumoLoadedOnce,
    resyncGeneration,
  );

  const tentarNovamenteRecursos = useCallback(() => {
    if (usesResumo && resumoError) void reloadResumo();
    if (secaoAtual === 'visao-geral' && evolucaoError) {
      void refreshEvolucao();
    }
  }, [
    secaoAtual,
    usesResumo,
    resumoError,
    reloadResumo,
    evolucaoError,
    refreshEvolucao,
  ]);

  const erroDeCarga = (usesResumo ? resumoError : null)
    ?? (secaoAtual === 'visao-geral' ? evolucaoError : null)
    ?? null;

  const overviewLoading = (!resumoLoadedOnce && !resumoError)
    || (!evolucaoLoadedOnce && !evolucaoError);
  const combinedOverviewError = resumoError ?? evolucaoError;
  const overviewHasData = resumoLoadedOnce && evolucaoLoadedOnce;
  const overviewError = overviewHasData ? null : combinedOverviewError;
  const overviewRefreshError = overviewHasData ? combinedOverviewError : null;

  const contextValue = useMemo<AppDataContextType>(() => ({
    selectedChannel,
    setSelectedChannel,
    selectedMonthSimulated,
    evolucaoFaturamento,
    resumo,
    overviewLoading,
    overviewError,
    overviewRefreshError,
    refetchOverview: () => { void refetchOverviewAsync(); },
    refetchPedidosResumo: reloadResumo,
    erroDeCarga,
    tentarNovamenteRecursos,
  }), [
    selectedChannel,
    selectedMonthSimulated,
    evolucaoFaturamento,
    resumo,
    overviewLoading,
    overviewError,
    overviewRefreshError,
    refetchOverviewAsync,
    reloadResumo,
    erroDeCarga,
    tentarNovamenteRecursos,
  ]);

  // Effects de filhos rodam antes dos effects do pai. No primeiro mount, não
  // montamos filas/lookup até o commit que confirma que o Bearer desta sessão
  // já foi instalado no cliente HTTP; assim nenhum GET protegido pode sair no
  // intervalo e transformar uma falsa 401 em loop de logout.
  return (
    <AppDataContext.Provider value={contextValue}>
      {apiClientReady ? children : null}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
