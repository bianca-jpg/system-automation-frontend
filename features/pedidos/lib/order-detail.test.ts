import { describe, expect, it } from "vitest";
import type { ProductItem } from "@/shared/types/models";
import { classifyItemCategory, formatToBRLDate, groupByCategory, groupItems, sumItemsValue } from "./order-detail";

function makeItem(overrides: Partial<ProductItem>): ProductItem {
  return { name: "Produto", code: "A1", unitValue: 100, qty: 1, cdStatus: "Regular", ...overrides };
}

describe("classifyItemCategory", () => {
  it("classifica por palavra-chave (amostra representativa)", () => {
    expect(classifyItemCategory("Camiseta Estonada")).toBe("Camisetas");
    expect(classifyItemCategory("Camisa Polo Piquet")).toBe("Polos");
    expect(classifyItemCategory("Calça Chino Classic")).toBe("Calças");
    expect(classifyItemCategory("Blazer de Linho Premium")).toBe("Alfaiataria");
    expect(classifyItemCategory("Sapatênis Couro Nobre")).toBe("Calçados");
    expect(classifyItemCategory("Camisa Social Slim Fio 80")).toBe("Camisas");
    expect(classifyItemCategory("Cinto Couro Dupla Face")).toBe("Cintos");
    expect(classifyItemCategory("Óculos de Sol")).toBe("Óculos");
  });

  it("é case-insensitive", () => {
    expect(classifyItemCategory("camiseta básica")).toBe("Camisetas");
    expect(classifyItemCategory("CAMISETA BÁSICA")).toBe("Camisetas");
  });

  it("nome sem nenhuma palavra-chave conhecida cai em 'Outros'", () => {
    expect(classifyItemCategory("Produto Genérico XYZ")).toBe("Outros");
  });
});

describe("formatToBRLDate", () => {
  it("undefined/vazio retorna travessão", () => {
    expect(formatToBRLDate(undefined)).toBe("—");
    expect(formatToBRLDate("")).toBe("—");
  });

  it("já no formato DD/MM/YYYY: retorna como está", () => {
    expect(formatToBRLDate("05/03/2026")).toBe("05/03/2026");
  });

  it("formato YYYY-MM-DD: converte para DD/MM/YYYY", () => {
    expect(formatToBRLDate("2026-03-05")).toBe("05/03/2026");
  });

  it("string não reconhecida e não parseável como data: retorna como está", () => {
    expect(formatToBRLDate("não é uma data")).toBe("não é uma data");
  });
});

describe("groupItems", () => {
  it("item sem sufixo de tamanho: mantém nome e qty, sizesList com 'UN'", () => {
    const result = groupItems([makeItem({ name: "Cinto Couro", code: "C1", qty: 2 })]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Cinto Couro");
    expect(result[0].qty).toBe(2);
    expect(result[0].sizesList).toEqual(["UN: 2"]);
  });

  it("mesmo código com sufixos de tamanho diferentes: consolida em 1 linha, soma qty", () => {
    const result = groupItems([
      makeItem({ name: "Camisa Polo (Tam: M)", code: "P1", qty: 3 }),
      makeItem({ name: "Camisa Polo (Tam: G)", code: "P1", qty: 2 }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Camisa Polo");
    expect(result[0].qty).toBe(5);
    expect(result[0].sizesList).toEqual(["M: 3", "G: 2"]);
  });

  it("códigos diferentes: mantém linhas separadas", () => {
    const result = groupItems([
      makeItem({ name: "Produto A", code: "A1" }),
      makeItem({ name: "Produto B", code: "B1" }),
    ]);
    expect(result).toHaveLength(2);
  });
});

describe("groupByCategory", () => {
  it("agrupa por categoria preservando a ordem de primeira ocorrência", () => {
    const items = groupItems([
      makeItem({ name: "Camisa Social", code: "S1" }),
      makeItem({ name: "Calça Chino", code: "C1" }),
      makeItem({ name: "Camisa Casual", code: "S2" }),
    ]);
    const grouped = groupByCategory(items);
    expect(Object.keys(grouped)).toEqual(["Camisas", "Calças"]);
    expect(grouped["Camisas"]).toHaveLength(2);
    expect(grouped["Calças"]).toHaveLength(1);
  });
});

describe("sumItemsValue", () => {
  it("soma qty * unitValue de todos os itens", () => {
    const total = sumItemsValue([
      makeItem({ qty: 2, unitValue: 100 }),
      makeItem({ qty: 3, unitValue: 50 }),
    ]);
    expect(total).toBe(350); // 200 + 150
  });

  it("lista vazia: retorna 0", () => {
    expect(sumItemsValue([])).toBe(0);
  });
});
