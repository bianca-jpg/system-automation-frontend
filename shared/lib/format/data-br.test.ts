// O que este helper protege não é visual: é a ORDEM da coluna de data. Ordenar
// o texto "dd/mm/aaaa" ordena pelo dia do mês, e a tabela mostraria o histórico
// fora de ordem sem nenhum sinal de erro na tela.
import { describe, expect, it } from "vitest";

import { chaveOrdenacaoDataBr } from "./data-br";

describe("chaveOrdenacaoDataBr", () => {
  it("ordena cronologicamente onde o texto formatado ordenaria errado", () => {
    const janeiro = chaveOrdenacaoDataBr("31/01/2026");
    const fevereiro = chaveOrdenacaoDataBr("01/02/2026");

    expect(janeiro < fevereiro).toBe(true);
    // Prova de que o problema existe: comparado como texto, a ordem se inverte.
    expect("31/01/2026" < "01/02/2026").toBe(false);
  });

  it("desempata pelo horário quando o dia é o mesmo", () => {
    expect(chaveOrdenacaoDataBr("01/01/2026, 09:30")).toBe("202601010930");
    expect(
      chaveOrdenacaoDataBr("01/01/2026, 09:30") <
        chaveOrdenacaoDataBr("01/01/2026, 14:05"),
    ).toBe(true);
  });

  it("aceita hora com um dígito e sem a vírgula do locale", () => {
    expect(chaveOrdenacaoDataBr("01/01/2026 9:05")).toBe("202601010905");
  });

  it("normaliza ano de 2 dígitos para manter o comprimento da chave", () => {
    expect(chaveOrdenacaoDataBr("01/01/26")).toBe("202601010000");
  });

  it("texto sem data (o travessão de 'sem valor') ordena antes de qualquer data", () => {
    expect(chaveOrdenacaoDataBr("—")).toBe("");
    expect(chaveOrdenacaoDataBr("") < chaveOrdenacaoDataBr("01/01/2026")).toBe(true);
  });
});
