import { describe, expect, it } from "vitest";
import type { Order, ProductItem } from "@/shared/types/models";
import { buildBasketSignature, getGroupedItems, groupItemsBySizes, parseOrderDate } from "./orders-list-helpers";

function makeItem(overrides: Partial<ProductItem>): ProductItem {
  return { name: "Produto", code: "A1", unitValue: 100, qty: 1, cdStatus: "Regular", ...overrides };
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

describe("groupItemsBySizes", () => {
  it("item sem sufixo '(Tam: X)': mantém como linha própria (chave code|nome completo)", () => {
    const result = groupItemsBySizes([makeItem({ name: "Cinto Couro", code: "C1", qty: 2 })]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Cinto Couro");
    expect(result[0].qty).toBe(2);
    expect(result[0].sizes).toBeUndefined();
  });

  it("consolida linhas com o mesmo código+nome base em tamanhos diferentes", () => {
    const result = groupItemsBySizes([
      makeItem({ name: "Camisa Polo (Tam: m)", code: "P1", qty: 3, stock: 5 }),
      makeItem({ name: "Camisa Polo (Tam: G)", code: "P1", qty: 2, stock: 4 }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Camisa Polo");
    expect(result[0].qty).toBe(5);
    expect(result[0].sizes).toEqual({ M: 3, G: 2 });
    expect(result[0].stock).toBe(9); // soma o estoque de cada linha de tamanho
  });

  it("mantém XXG como a chave real da grade", () => {
    const result = groupItemsBySizes([makeItem({ name: "Blazer (Tam: XXG)", code: "B1", qty: 4 })]);
    expect(result[0].sizes).toEqual({ XXG: 4 });
  });

  it("preserva tamanhos numéricos reais sem fabricar buckets de letras", () => {
    const result = groupItemsBySizes([
      makeItem({ name: "Sapato Derby (Tam: 37)", code: "S1", qty: 2 }),
      makeItem({ name: "Sapato Derby (Tam: 36)", code: "S1", qty: 1 }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Sapato Derby");
    expect(result[0].qty).toBe(3);
    expect(result[0].sizes).toEqual({ "36": 1, "37": 2 });
  });

  it("preserva uma grade explícita em vez de substituí-la por buckets fixos", () => {
    const sizes = { "36": 2, "37": 3 };
    const result = groupItemsBySizes([
      makeItem({ name: "Calça Alfaiataria", code: "C1", qty: 5, sizes }),
    ]);

    expect(result[0].sizes).toEqual(sizes);
  });

  it("códigos diferentes ficam em linhas separadas mesmo com o mesmo nome base", () => {
    const result = groupItemsBySizes([
      makeItem({ name: "Camisa (Tam: M)", code: "X1", qty: 1 }),
      makeItem({ name: "Camisa (Tam: M)", code: "X2", qty: 1 }),
    ]);
    expect(result).toHaveLength(2);
  });
});

describe("getGroupedItems", () => {
  it("agrupa os itens do pedido (delega para groupItemsBySizes)", () => {
    const order = makeOrder({ items: [makeItem({ name: "Produto (Tam: M)", code: "A1", qty: 2 })] });
    const grouped = getGroupedItems(order);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].sizes?.M).toBe(2);
  });

  it("retorna a MESMA referência de array em chamadas repetidas para o mesmo pedido (cache por WeakMap)", () => {
    const order = makeOrder({ items: [makeItem({})] });
    const first = getGroupedItems(order);
    const second = getGroupedItems(order);
    expect(second).toBe(first);
  });

  it("pedidos diferentes (mesmo com itens iguais) não compartilham cache", () => {
    const orderA = makeOrder({ id: "#1", items: [makeItem({})] });
    const orderB = makeOrder({ id: "#2", items: [makeItem({})] });
    expect(getGroupedItems(orderA)).not.toBe(getGroupedItems(orderB));
  });
});

describe("buildBasketSignature", () => {
  it("mesma cesta (código+qty) gera a mesma assinatura, ordenada por código", () => {
    const sigA = buildBasketSignature([makeItem({ code: "B1", qty: 2 }), makeItem({ code: "A1", qty: 3 })]);
    const sigB = buildBasketSignature([makeItem({ code: "A1", qty: 3 }), makeItem({ code: "B1", qty: 2 })]);
    expect(sigA).toBe(sigB);
    expect(sigA).toBe("A1:3,B1:2");
  });

  it("soma qty do mesmo código quando aparece em múltiplas linhas", () => {
    const sig = buildBasketSignature([makeItem({ code: "A1", qty: 2 }), makeItem({ code: "A1", qty: 3 })]);
    expect(sig).toBe("A1:5");
  });

  it("cestas com quantidades diferentes geram assinaturas diferentes", () => {
    const sig1 = buildBasketSignature([makeItem({ code: "A1", qty: 2 })]);
    const sig2 = buildBasketSignature([makeItem({ code: "A1", qty: 3 })]);
    expect(sig1).not.toBe(sig2);
  });
});

describe("parseOrderDate", () => {
  it("string vazia/undefined: retorna 0", () => {
    expect(parseOrderDate(undefined)).toBe(0);
    expect(parseOrderDate("")).toBe(0);
  });

  it("data parseável: retorna o timestamp real", () => {
    expect(parseOrderDate("2026-03-05")).toBe(Date.parse("2026-03-05"));
  });

  it("string não parseável: não lança, cai no fallback 'agora' (não é 0 nem NaN)", () => {
    const result = parseOrderDate("Hoje 10:00");
    expect(result).not.toBe(0);
    expect(Number.isNaN(result)).toBe(false);
  });
});
