"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Cria uma instância de `QueryClient` por chamada, nunca no escopo do módulo.
 * Uma instância de módulo compartilharia cache entre requisições no servidor
 * e entre usuários diferentes no cliente — o mesmo defeito de identidade que
 * motivou a remoção do cache em `sessionStorage` no `AppDataProvider`.
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Hoje uma falha de fetch vira erro visível já na primeira tentativa
        // (`useLatestResource` não reintenta sozinho); os testes de falha do
        // AppDataProvider dependem desse comportamento imediato.
        retry: false,
        // Hoje nada refaz fetch ao focar a janela; quem cuida de dado
        // desatualizado por reconexão é o `resyncGeneration` do realtime.
        refetchOnWindowFocus: false,
        // Hoje nada refaz fetch ao reconectar a rede; mesma razão acima —
        // o realtime já resincroniza via `resyncGeneration`.
        refetchOnReconnect: false,
        // Sem isso, toda remontagem de rota (ex.: sair e voltar para
        // /visao-geral) dispararia um refetch imediato mesmo com dado fresco.
        staleTime: 30_000,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
