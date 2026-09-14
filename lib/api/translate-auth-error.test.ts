// Rede de segurança (Fase 2, Etapa 0) — caracteriza o comportamento ATUAL de
// translateAuthError/isRecoveryConfirmationCodeError/readAuthErrorCode.
import { describe, expect, it } from "vitest";
import {
  authErrorCopy,
  isRecoveryConfirmationCodeError,
  readAuthErrorCode,
  translateAuthError,
} from "./translate-auth-error";

describe("readAuthErrorCode", () => {
  it("extrai e normaliza (trim + lowercase) error.code de um objeto aninhado", () => {
    expect(readAuthErrorCode({ error: { code: "  INVALID_CREDENTIALS  " } })).toBe("invalid_credentials");
  });

  it("retorna undefined para entradas sem a forma esperada", () => {
    expect(readAuthErrorCode(undefined)).toBeUndefined();
    expect(readAuthErrorCode(null)).toBeUndefined();
    expect(readAuthErrorCode("string")).toBeUndefined();
    expect(readAuthErrorCode({})).toBeUndefined();
    expect(readAuthErrorCode({ error: "string" })).toBeUndefined();
    expect(readAuthErrorCode({ error: {} })).toBeUndefined();
    expect(readAuthErrorCode({ error: { code: "   " } })).toBeUndefined();
    expect(readAuthErrorCode({ error: { code: 123 } })).toBeUndefined();
  });
});

describe("isRecoveryConfirmationCodeError", () => {
  it.each(["invalid_confirmation_code", "code_mismatch", "expired_code"])(
    "reconhece o código %s como erro de código de recuperação",
    (code) => {
      expect(isRecoveryConfirmationCodeError({ error: { code } })).toBe(true);
    }
  );

  it("não reconhece outros códigos ou ausência de código", () => {
    expect(isRecoveryConfirmationCodeError({ error: { code: "invalid_credentials" } })).toBe(false);
    expect(isRecoveryConfirmationCodeError(undefined)).toBe(false);
  });
});

describe("translateAuthError", () => {
  it("prioriza o mapeamento por código sobre a mensagem, quando ambos presentes", () => {
    const result = translateAuthError("qualquer mensagem", { error: { code: "user_not_found" } });
    expect(result).toBe(authErrorCopy.userNotFound);
  });

  it.each([
    ["invalid_credentials", authErrorCopy.invalidCredentials],
    ["cpf_not_eligible_for_registration", authErrorCopy.cpfNotEligible],
    ["cpf_already_registered", authErrorCopy.cpfAlreadyRegistered],
    ["email_already_registered", authErrorCopy.emailAlreadyRegistered],
    ["phone_already_registered", authErrorCopy.phoneAlreadyRegistered],
    ["user_not_found", authErrorCopy.userNotFound],
    ["invalid_confirmation_code", authErrorCopy.invalidConfirmationCode],
    ["code_mismatch", authErrorCopy.invalidConfirmationCode],
    ["expired_code", authErrorCopy.invalidConfirmationCode],
    ["password_recovery_failed", authErrorCopy.recoveryFailed],
  ])("código %s -> %s", (code, expected) => {
    expect(translateAuthError(undefined, { error: { code } })).toBe(expected);
  });

  it.each([
    ["invalid credentials", authErrorCopy.invalidCredentials],
    ["credenciais inválidas", authErrorCopy.invalidCredentials],
    ["credenciais invalidas", authErrorCopy.invalidCredentials],
    ["cpf is not eligible for registration", authErrorCopy.cpfNotEligible],
    ["cpf is not elegible for registration", authErrorCopy.cpfNotEligible],
    ["cpf already registered", authErrorCopy.cpfAlreadyRegistered],
    ["email already registered", authErrorCopy.emailAlreadyRegistered],
    ["phone already registered", authErrorCopy.phoneAlreadyRegistered],
    ["invalid cpf", authErrorCopy.invalidCpf],
    ["cpf inválido", authErrorCopy.invalidCpf],
    ["cpf invalido", authErrorCopy.invalidCpf],
    ["email is required", authErrorCopy.emailRequired],
    ["user not found", authErrorCopy.userNotFound],
  ])("mensagem conhecida (sem código) %s -> %s, case-insensitive", (message, expected) => {
    expect(translateAuthError(message.toUpperCase())).toBe(expected);
  });

  it("mensagem desconhecida (sem código): retorna a própria mensagem, só com trim", () => {
    expect(translateAuthError("  Alguma mensagem nunca vista  ")).toBe("Alguma mensagem nunca vista");
  });

  it("mensagem vazia/ausente (sem código): retorna undefined", () => {
    expect(translateAuthError("")).toBeUndefined();
    expect(translateAuthError("   ")).toBeUndefined();
    expect(translateAuthError(undefined)).toBeUndefined();
    expect(translateAuthError(null)).toBeUndefined();
  });

  it("código presente mas não mapeado: cai para a mensagem", () => {
    expect(translateAuthError("mensagem de fallback", { error: { code: "codigo_nao_mapeado" } })).toBe(
      "mensagem de fallback"
    );
  });
});
