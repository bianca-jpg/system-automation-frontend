"use client";

import { useMemo, useState } from "react";

/**
 * Tamanho do lote de "carregar mais". É o MESMO 25 do `pageSize` default do
 * Histórico e do contrato paginado de `GET /api/v1/pedidos` — um lote só para
 * a tela inteira evita que cada lista invente o próprio número.
 */
export const LOAD_MORE_STEP = 25;

interface LoadMoreResult<T> {
  /** A fatia carregada — é ela que vai para a tabela/lista. */
  visiveis: T[];
  /** Quantos itens estão na tela (numerador do "N de M"). */
  carregados: number;
  /** Quantos existem depois de busca e filtros (denominador do "N de M"). */
  total: number;
  temMais: boolean;
  carregarMais: () => void;
}

interface LoadMoreOptions {
  /**
   * Volta a janela ao primeiro lote quando MUDA. Serve para busca, canal e
   * filtros: sem isso, quem carregou 200 linhas e depois digitou uma busca
   * continuaria vendo 200 linhas de um conjunto que agora tem 3.
   *
   * Deliberadamente NÃO é a identidade do array: `alerts` é derivado ao vivo de
   * `orders` no provider, então "marcar como lido" recria a lista — resetar aí
   * jogaria o usuário de volta para o primeiro lote a cada item lido.
   */
  resetKey?: string;
}

/**
 * Janela crescente de "carregar mais" sobre uma lista já em memória.
 *
 * Não busca nada: recebe a lista pronta e devolve o primeiro lote, crescendo de
 * `LOAD_MORE_STEP` em `LOAD_MORE_STEP`. Quem tiver endpoint paginado combina os
 * dois — carrega mais do servidor quando a janela local chega ao fim (é o que o
 * `OrdersList` faz com `carregarMaisPedidos`).
 */
export function useLoadMore<T>(
  itens: T[],
  { resetKey = "" }: LoadMoreOptions = {},
): LoadMoreResult<T> {
  const [limite, setLimite] = useState(LOAD_MORE_STEP);
  const [chaveAnterior, setChaveAnterior] = useState(resetKey);

  // Ajuste de estado DURANTE o render (padrão documentado do React para "estado
  // derivado de props"): um `useEffect` renderizaria a janela antiga por um
  // frame antes de encolher, e a lista piscaria a cada tecla da busca.
  if (chaveAnterior !== resetKey) {
    setChaveAnterior(resetKey);
    setLimite(LOAD_MORE_STEP);
  }

  const visiveis = useMemo(() => itens.slice(0, limite), [itens, limite]);

  return {
    visiveis,
    carregados: visiveis.length,
    total: itens.length,
    temMais: itens.length > visiveis.length,
    carregarMais: () => setLimite((atual) => atual + LOAD_MORE_STEP),
  };
}
