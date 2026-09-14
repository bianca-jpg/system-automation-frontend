// O ponto sensível aqui não é o visual: é a fronteira com a API. A tela mostra
// vírgula (pt-BR), o backend recebe ponto. Se `paraEnvio` falhar, o parâmetro é
// gravado com um valor que o servidor não sabe ler — e isso não aparece na tela.
import { describe, expect, it } from "vitest";

import { mascararNumeroBr, paraEnvio, paraExibicao } from "./numero-br";

describe("mascararNumeroBr", () => {
  it("agrupa o milhar com ponto", () => {
    expect(mascararNumeroBr("1234567")).toBe("1.234.567");
  });

  it("usa vírgula como separador decimal", () => {
    expect(mascararNumeroBr("1234,56")).toBe("1.234,56");
  });

  it("aceita ponto digitado como decimal — quem cola valor de outro lugar não perde a casa", () => {
    expect(mascararNumeroBr("1234.56")).toBe("1.234,56");
  });

  it("mantém a vírgula solta durante a digitação", () => {
    expect(mascararNumeroBr("10,")).toBe("10,");
  });

  it("limita as casas decimais quando pedido", () => {
    expect(mascararNumeroBr("10,5678", { casasDecimais: 2 })).toBe("10,56");
  });

  it("descarta a parte decimal no modo inteiro", () => {
    expect(mascararNumeroBr("1234,99", { inteiro: true })).toBe("123.499");
  });

  it("preserva o sinal negativo", () => {
    expect(mascararNumeroBr("-10,5")).toBe("-10,5");
  });

  it("ignora letras e símbolos", () => {
    expect(mascararNumeroBr("R$ 1.2a3b4,5%")).toBe("1.234,5");
  });

  it("string vazia continua vazia", () => {
    expect(mascararNumeroBr("")).toBe("");
  });
});

describe("paraEnvio", () => {
  it("devolve ponto decimal, sem separador de milhar", () => {
    expect(paraEnvio("1.234,56")).toBe("1234.56");
  });

  it("número inteiro sai sem casa decimal", () => {
    expect(paraEnvio("1.234")).toBe("1234");
  });

  it("vírgula sem casas não vira ponto solto — 'R$ 10,' não pode virar '10.'", () => {
    expect(paraEnvio("10,")).toBe("10");
  });

  it("preserva o negativo", () => {
    expect(paraEnvio("-1.234,5")).toBe("-1234.5");
  });

  it("vazio continua vazio", () => {
    expect(paraEnvio("")).toBe("");
  });

  it("o resultado é sempre parseável por Number()", () => {
    for (const entrada of ["1.234,56", "10,5", "1.000", "-42,7", "0,01"]) {
      expect(Number.isNaN(Number(paraEnvio(entrada)))).toBe(false);
    }
  });
});

describe("paraExibicao", () => {
  it("traz o valor da API (ponto) para a exibição (vírgula)", () => {
    expect(paraExibicao("10.5")).toBe("10,5");
  });

  it("aceita número, não só string", () => {
    expect(paraExibicao(1234.56)).toBe("1.234,56");
  });

  it("null e undefined viram vazio, não 'null'", () => {
    expect(paraExibicao(null)).toBe("");
    expect(paraExibicao(undefined)).toBe("");
  });

  it("ida e volta preserva o valor", () => {
    for (const daApi of ["10.5", "1234.56", "0.01", "-42.7"]) {
      expect(paraEnvio(paraExibicao(daApi))).toBe(daApi);
    }
  });
});
