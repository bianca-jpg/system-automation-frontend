import { describe, expect, it } from "vitest";
import { formatCurrency } from "./currency";

// Intl.NumberFormat('pt-BR') separa o símbolo do valor com NBSP (U+00A0), não
// com espaço comum. Escrito como \u00a0 de propósito: como caractere invisível,
// qualquer cópia/edição do arquivo troca silenciosamente por U+0020 e quebra o
// teste com um diff que parece idêntico ("R$ 0,00" vs "R$ 0,00").
describe("formatCurrency", () => {
  it("formata como moeda BRL (pt-BR), com 2 casas decimais e símbolo R$", () => {
    expect(formatCurrency(1234.5)).toBe("R$\u00a01.234,50");
  });

  it("formata zero e negativos corretamente", () => {
    expect(formatCurrency(0)).toBe("R$\u00a00,00");
    expect(formatCurrency(-50)).toBe("-R$\u00a050,00");
  });
});
