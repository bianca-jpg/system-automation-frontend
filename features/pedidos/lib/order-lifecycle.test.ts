import { describe, expect, it } from "vitest";
import type { Order } from "@/shared/types/models";
import {
  DAY_MS,
  getFormattedRemainingTime,
  isAwaitingFaturamento,
  isInEditWindow,
} from "./order-lifecycle";

function makeOrder(overrides: Partial<Order>): Order {
  return {
    id: "#14789",
    client: "Cliente Teste",
    value: 1000,
    originalValueBeforeAdequacao: 1000,
    status: "Liberados para faturamento",
    motivo: "",
    canal: "Franquia",
    items: [],
    adequacaoAplicada: false,
    adequacaoValorAjustado: 0,
    ...overrides,
  };
}

describe("isAwaitingFaturamento", () => {
  it("true quando 'Liberados para faturamento' sem processedAt e sem aprovado", () => {
    const order = makeOrder({ status: "Liberados para faturamento" });
    expect(isAwaitingFaturamento(order)).toBe(true);
  });

  it("false quando já tem processedAt", () => {
    const order = makeOrder({ status: "Liberados para faturamento", processedAt: 1000 });
    expect(isAwaitingFaturamento(order)).toBe(false);
  });

  it("false quando já aprovado", () => {
    const order = makeOrder({ status: "Liberados para faturamento", aprovado: true });
    expect(isAwaitingFaturamento(order)).toBe(false);
  });

  it("false para outros status", () => {
    expect(isAwaitingFaturamento(makeOrder({ status: "OR com adequação" }))).toBe(false);
  });
});

describe("isInEditWindow", () => {
  it("true quando processado, não aprovado e dentro de 24h", () => {
    const processedAt = 1_000_000;
    const order = makeOrder({ processedAt, aprovado: false });
    expect(isInEditWindow(order, processedAt + DAY_MS - 1)).toBe(true);
  });

  it("true exatamente em 24h (limite é <=)", () => {
    const processedAt = 1_000_000;
    const order = makeOrder({ processedAt, aprovado: false });
    expect(isInEditWindow(order, processedAt + DAY_MS)).toBe(true);
  });

  it("false passado 24h", () => {
    const processedAt = 1_000_000;
    const order = makeOrder({ processedAt, aprovado: false });
    expect(isInEditWindow(order, processedAt + DAY_MS + 1)).toBe(false);
  });

  it("false quando já aprovado", () => {
    const processedAt = 1_000_000;
    const order = makeOrder({ processedAt, aprovado: true });
    expect(isInEditWindow(order, processedAt + 1000)).toBe(false);
  });

  it("false sem processedAt", () => {
    const order = makeOrder({ processedAt: undefined });
    expect(isInEditWindow(order, 9_999_999)).toBe(false);
  });
});

describe("getFormattedRemainingTime", () => {
  it("string vazia sem processedAt", () => {
    const order = makeOrder({ processedAt: undefined });
    expect(getFormattedRemainingTime(order, 9_999_999)).toBe("");
  });

  it("'Expirado (>24h)' quando o tempo restante é <= 0", () => {
    const processedAt = 1_000_000;
    const order = makeOrder({ processedAt });
    expect(getFormattedRemainingTime(order, processedAt + DAY_MS)).toBe("Expirado (>24h)");
    expect(getFormattedRemainingTime(order, processedAt + DAY_MS + 1)).toBe("Expirado (>24h)");
  });

  it("formata 'Restam Xh Ym' com o tempo restante", () => {
    const processedAt = 1_000_000;
    const order = makeOrder({ processedAt });
    const threeHoursThirtyMinutesMs = 3 * 3600 * 1000 + 30 * 60 * 1000;
    const now = processedAt + (DAY_MS - threeHoursThirtyMinutesMs);
    expect(getFormattedRemainingTime(order, now)).toBe("Restam 3h 30m");
  });
});
