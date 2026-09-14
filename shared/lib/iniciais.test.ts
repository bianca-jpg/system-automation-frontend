import { describe, expect, it } from "vitest";
import { iniciaisDoNome } from "./iniciais";

describe("iniciaisDoNome", () => {
  it("usa a primeira letra do primeiro e do último nome", () => {
    expect(iniciaisDoNome("Victoria Mollica")).toBe("VM");
    expect(iniciaisDoNome("Natália Mazzoni")).toBe("NM");
  });

  it("ignora preposições, pegando o último nome de verdade", () => {
    // "Maria Aparecida de Souza" é a Souza, não a Aparecida: pegar as duas
    // primeiras palavras daria "MA".
    expect(iniciaisDoNome("Maria Aparecida de Souza")).toBe("MS");
    expect(iniciaisDoNome("Ana de Lima")).toBe("AL");
    expect(iniciaisDoNome("João dos Santos Silva")).toBe("JS");
    expect(iniciaisDoNome("Luiz e Souza")).toBe("LS");
  });

  it("nome único rende uma letra só", () => {
    // Inventar a segunda letra a partir do meio da palavra confundiria.
    expect(iniciaisDoNome("Madonna")).toBe("M");
  });

  it("normaliza espaço extra sem produzir letra vazia", () => {
    expect(iniciaisDoNome("  Ana   Paula  ")).toBe("AP");
  });

  it("preserva acento na inicial", () => {
    expect(iniciaisDoNome("Ângela Ferreira")).toBe("ÂF");
  });

  it("devolve string vazia para ausência de nome", () => {
    // O chamador usa isso para decidir entre iniciais e o ícone genérico.
    expect(iniciaisDoNome(null)).toBe("");
    expect(iniciaisDoNome(undefined)).toBe("");
    expect(iniciaisDoNome("")).toBe("");
    expect(iniciaisDoNome("    ")).toBe("");
  });

  it("nome só de preposições não gera inicial", () => {
    expect(iniciaisDoNome("de da do")).toBe("");
  });

  it("sempre em maiúsculas", () => {
    expect(iniciaisDoNome("victoria mollica")).toBe("VM");
  });
});
