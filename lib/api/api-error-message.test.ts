import { describe, expect, it } from "vitest";

import { apiErrorMessage } from "@/lib/api/api-error-message";
import { ApiRequestError } from "@/lib/api/http-client";

const GENERIC_FALLBACK_MESSAGE = "Não foi possível carregar os dados.";

describe("apiErrorMessage", () => {
  it("extrai a mensagem legível do corpo estruturado quando o erro é ApiRequestError", () => {
    const error = new ApiRequestError(422, { message: "Estoque insuficiente para o produto." });

    expect(apiErrorMessage(error)).toBe("Estoque insuficiente para o produto.");
  });

  it("cai para a mensagem de um erro comum de aplicação", () => {
    const error = new Error("resumo fora do ar");

    expect(apiErrorMessage(error)).toBe("resumo fora do ar");
  });

  it("cai para o texto genérico de fallback quando nada é aproveitável", () => {
    expect(apiErrorMessage("não é nem um Error")).toBe(GENERIC_FALLBACK_MESSAGE);
    expect(apiErrorMessage(null)).toBe(GENERIC_FALLBACK_MESSAGE);
    expect(apiErrorMessage(undefined)).toBe(GENERIC_FALLBACK_MESSAGE);
  });

  it("nunca deixa um corpo com traceback/URL interna vazar para a UI", () => {
    const error = new ApiRequestError(500, {
      message:
        'Traceback (most recent call last): File "/app/main.py", line 42, in handler raise TypeError("boom")',
    });

    const result = apiErrorMessage(error);
    expect(result).not.toContain("Traceback");
    expect(result).not.toContain("/app/main.py");
    expect(result).not.toContain("TypeError");
  });

  it("nunca deixa um corpo com token/e-mail vazar para a UI", () => {
    const error = new ApiRequestError(401, {
      message: "Falha ao validar Bearer abc123.def456 para usuario@empresa.com",
    });

    const result = apiErrorMessage(error);
    expect(result).not.toContain("Bearer");
    expect(result).not.toContain("usuario@empresa.com");
  });
});
