import { describe, expect, it } from "vitest";
import type { EvolucaoFaturamento, Order, ProductItem } from "@/shared/types/models";
import { computeEvolucaoSerie, computeOrderStats, formatCompact } from "./dashboard-stats";

function makeItem(overrides: Partial<ProductItem>): ProductItem {
  return {
    name: "Produto A",
    code: "A1",
    unitValue: 100,
    qty: 1,
    cdStatus: "Regular",
    ...overrides,
  };
}

function makeOrder(overrides: Partial<Order>): Order {
  return {
    id: "#1",
    client: "Cliente",
    value: 100,
    originalValueBeforeAdequacao: 100,
    status: "Liberados para faturamento",
    motivo: "",
    canal: "Franquia",
    items: [],
    adequacaoAplicada: false,
    adequacaoValorAjustado: 0,
    ...overrides,
  };
}

describe("computeOrderStats", () => {
  it("conta pedidos por status", () => {
    const orders = [
      makeOrder({ status: "Liberados para faturamento" }),
      makeOrder({ status: "OR com adequação" }),
      makeOrder({ status: "OR sem adequação" }),
      makeOrder({ status: "Bloqueado Estoque" }),
      makeOrder({ status: "Bloqueado sem crédito" }),
      makeOrder({ status: "Processado no ERP" }),
    ];
    const stats = computeOrderStats(orders, "Todos");
    expect(stats.liberadosCount).toBe(1);
    expect(stats.orComAdequacaoCount).toBe(1);
    expect(stats.orSemAdequacaoCount).toBe(1);
    expect(stats.editingOrderCount).toBe(1);
    expect(stats.bloqueadosSemCreditoCount).toBe(1);
    expect(stats.processadoErpCount).toBe(1);
  });

  it("separa pedido distinto de identidade produto+canal na edição", () => {
    const orders = [
      makeOrder({
        id: "#10",
        canal: "Franquia",
        status: "OR com adequação",
        items: [makeItem({ code: "DUP" })],
      }),
      makeOrder({
        id: "#10",
        canal: "Multimarca",
        status: "OR sem adequação",
        items: [makeItem({ code: "DUP" })],
      }),
    ];

    const stats = computeOrderStats(orders, "Todos");
    expect(stats.editingOrderCount).toBe(1);
    expect(stats.editingProductCount).toBe(2);
  });

  it("totalOrdersCount NÃO inclui 'Processado no ERP'", () => {
    const orders = [
      makeOrder({ status: "Liberados para faturamento" }),
      makeOrder({ status: "Processado no ERP" }),
    ];
    const stats = computeOrderStats(orders, "Todos");
    expect(stats.totalOrdersCount).toBe(1);
  });

  it("filtra por canal, normalizando singular/plural e maiúsculas", () => {
    const orders = [
      makeOrder({ status: "Liberados para faturamento", canal: "Franquia" }),
      makeOrder({ status: "Liberados para faturamento", canal: "Multimarca" }),
    ];
    const franquia = computeOrderStats(orders, "Franquia");
    expect(franquia.liberadosCount).toBe(1);
    const multimarca = computeOrderStats(orders, "Multimarca");
    expect(multimarca.liberadosCount).toBe(1);
    const todos = computeOrderStats(orders, "Todos");
    expect(todos.liberadosCount).toBe(2);
  });

  it("peças bloqueadas: max(0, demanda - estoque), só para pedidos liberados", () => {
    const orders = [
      makeOrder({
        status: "Liberados para faturamento",
        items: [makeItem({ code: "A1", qty: 5, stock: 3 })],
      }),
    ];
    const stats = computeOrderStats(orders, "Todos");
    expect(stats.pecasBloqueadasCount).toBe(2); // max(0, 5-3)
    expect(stats.pecasBloqueadasPercent).toBe(40); // 2/5 = 40%
  });

  it("estoque negativo (mais estoque que demanda) não gera peças bloqueadas negativas", () => {
    const orders = [
      makeOrder({
        status: "Liberados para faturamento",
        items: [makeItem({ code: "A1", qty: 2, stock: 10 })],
      }),
    ];
    const stats = computeOrderStats(orders, "Todos");
    expect(stats.pecasBloqueadasCount).toBe(0);
  });

  it("pedidos que não são 'Liberados para faturamento' não geram demanda de estoque", () => {
    const orders = [
      makeOrder({
        status: "OR com adequação",
        items: [makeItem({ code: "A1", qty: 5, stock: 0 })],
      }),
    ];
    const stats = computeOrderStats(orders, "Todos");
    expect(stats.pecasBloqueadasCount).toBe(0);
    expect(stats.pecasBloqueadasPercent).toBe(0);
  });

  it("estoque do mesmo código+nome não é contado 2x quando aparece em pedidos diferentes", () => {
    const orders = [
      makeOrder({
        id: "#1",
        status: "Liberados para faturamento",
        items: [makeItem({ code: "A1", name: "Produto A", qty: 5, stock: 3 })],
      }),
      makeOrder({
        id: "#2",
        status: "Liberados para faturamento",
        items: [makeItem({ code: "A1", name: "Produto A", qty: 4, stock: 3 })],
      }),
    ];
    const stats = computeOrderStats(orders, "Todos");
    // demanda total = 5+4 = 9; estoque contado 1x só (3, não 6) => bloqueadas = max(0, 9-3) = 6
    expect(stats.pecasBloqueadasCount).toBe(6);
  });

  it("sem pedidos: tudo zerado, sem divisão por zero", () => {
    const stats = computeOrderStats([], "Todos");
    expect(stats.totalOrdersCount).toBe(0);
    expect(stats.liberadosPercent).toBe(0);
    expect(stats.pecasBloqueadasPercent).toBe(0);
    expect(stats.bloqueadosSemCreditoPercent).toBe(0);
  });
});

function makeEvolPonto(overrides: Partial<EvolucaoFaturamento>): EvolucaoFaturamento {
  return { colecao: 118, canal: "Franquia", planejado: 100, distribuido: 90, ...overrides };
}

describe("computeEvolucaoSerie", () => {
  it("soma planejado/distribuido por coleção quando 'Todos'", () => {
    const pontos = [
      makeEvolPonto({ colecao: 118, canal: "Franquia", planejado: 100, distribuido: 90 }),
      makeEvolPonto({ colecao: 118, canal: "Multimarca", planejado: 50, distribuido: 40 }),
    ];
    const serie = computeEvolucaoSerie(pontos, "Todos");
    expect(serie).toEqual([{ colecao: 118, planejado: 150, distribuido: 130 }]);
  });

  it("filtra por canal específico", () => {
    const pontos = [
      makeEvolPonto({ colecao: 118, canal: "Franquia", planejado: 100, distribuido: 90 }),
      makeEvolPonto({ colecao: 118, canal: "Multimarca", planejado: 50, distribuido: 40 }),
    ];
    const serie = computeEvolucaoSerie(pontos, "Franquia");
    expect(serie).toEqual([{ colecao: 118, planejado: 100, distribuido: 90 }]);
  });

  it("ordena por coleção ascendente", () => {
    const pontos = [
      makeEvolPonto({ colecao: 118 }),
      makeEvolPonto({ colecao: 116 }),
      makeEvolPonto({ colecao: 117 }),
    ];
    const serie = computeEvolucaoSerie(pontos, "Todos");
    expect(serie.map((s) => s.colecao)).toEqual([116, 117, 118]);
  });

  it("sem pontos: retorna array vazio", () => {
    expect(computeEvolucaoSerie([], "Todos")).toEqual([]);
  });
});

describe("formatCompact", () => {
  it("valores >= 1 milhão viram 'R$ X.XM'", () => {
    expect(formatCompact(1_500_000)).toBe("R$ 1.5M");
  });

  it("valores >= 1000 viram 'R$ XK'", () => {
    expect(formatCompact(2_000)).toBe("R$ 2K");
  });

  it("valores menores viram 'R$ X' sem casas decimais", () => {
    expect(formatCompact(500)).toBe("R$ 500");
  });
});
