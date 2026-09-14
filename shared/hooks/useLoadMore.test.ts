// O contrato do `useLoadMore` que a UI não consegue exercitar sozinha: QUANDO a
// janela volta ao primeiro lote. É a diferença entre "mudei a busca" (deve
// resetar) e "a lista foi recriada com o mesmo conteúdo lógico" (não deve) — e o
// segundo caso é real: `alerts` é derivado ao vivo de `orders` no provider, então
// marcar um alerta como lido devolve um array NOVO.
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LOAD_MORE_STEP, useLoadMore } from "./useLoadMore";

const lista = (qtd: number) => Array.from({ length: qtd }, (_, i) => i);

describe("useLoadMore", () => {
  it("começa no primeiro lote e cresce de passo em passo", () => {
    const { result } = renderHook(() => useLoadMore(lista(60)));

    expect(result.current.carregados).toBe(LOAD_MORE_STEP);
    expect(result.current.total).toBe(60);
    expect(result.current.temMais).toBe(true);

    act(() => result.current.carregarMais());
    expect(result.current.carregados).toBe(50);

    act(() => result.current.carregarMais());
    expect(result.current.carregados).toBe(60);
    expect(result.current.temMais).toBe(false);
  });

  it("não reseta quando o array é recriado com a mesma resetKey", () => {
    const { result, rerender } = renderHook(
      ({ itens }: { itens: number[] }) => useLoadMore(itens),
      { initialProps: { itens: lista(60) } },
    );

    act(() => result.current.carregarMais());
    expect(result.current.carregados).toBe(50);

    // Array novo, mesmo tamanho — é o que acontece a cada render do provider.
    rerender({ itens: lista(60) });
    expect(result.current.carregados).toBe(50);

    // E quando um item é removido ("marcar como lido"), a janela SEGUE em 50 —
    // o usuário continua vendo o que já tinha aberto, só com um item a menos no
    // denominador.
    rerender({ itens: lista(59) });
    expect(result.current.carregados).toBe(50);
    expect(result.current.total).toBe(59);

    // Encolhendo abaixo da janela, a contagem acompanha a lista (nada de "50 de 30").
    rerender({ itens: lista(30) });
    expect(result.current.carregados).toBe(30);
    expect(result.current.temMais).toBe(false);
  });

  it("reseta quando a resetKey muda (busca, canal, filtro)", () => {
    const { result, rerender } = renderHook(
      ({ chave }: { chave: string }) => useLoadMore(lista(60), { resetKey: chave }),
      { initialProps: { chave: "Todos|" } },
    );

    act(() => result.current.carregarMais());
    expect(result.current.carregados).toBe(50);

    rerender({ chave: "Franquia|" });
    expect(result.current.carregados).toBe(LOAD_MORE_STEP);
  });

  it("uma lista menor que o lote já vem inteira e sem 'mais'", () => {
    const { result } = renderHook(() => useLoadMore(lista(8)));

    expect(result.current.carregados).toBe(8);
    expect(result.current.temMais).toBe(false);
  });
});
