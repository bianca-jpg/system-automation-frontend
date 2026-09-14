export const authErrorCopy = {
  invalidCredentials: "E-mail ou senha incorretos.",
  cpfNotEligible:
    "Este CPF não está elegível para cadastro. Confirme se você consta como colaborador ativo na organização.",
  cpfAlreadyRegistered: "Este CPF já possui cadastro no aplicativo.",
  emailAlreadyRegistered: "Este e-mail já está cadastrado.",
  phoneAlreadyRegistered: "Este telefone já está cadastrado.",
  invalidCpf: "CPF inválido. Verifique os dígitos informados.",
  emailRequired: "Informe um e-mail.",
  signupFailed: "Não foi possível concluir o cadastro.",
  userNotFound: "Não encontramos uma conta com este e-mail.",
  invalidConfirmationCode: "Código inválido ou expirado. Solicite um novo código.",
  recoveryFailed: "Não foi possível concluir a recuperação. Tente novamente.",
  recoveryUnavailable: "Recuperação de senha indisponível no momento. Tente mais tarde.",
} as const;

const RECOVERY_OTP_ERROR_CODES = new Set([
  "invalid_confirmation_code",
  "code_mismatch",
  "expired_code",
]);

const AUTH_ERROR_BY_CODE: Record<string, string> = {
  invalid_credentials: authErrorCopy.invalidCredentials,
  cpf_not_eligible_for_registration: authErrorCopy.cpfNotEligible,
  cpf_already_registered: authErrorCopy.cpfAlreadyRegistered,
  email_already_registered: authErrorCopy.emailAlreadyRegistered,
  phone_already_registered: authErrorCopy.phoneAlreadyRegistered,
  user_not_found: authErrorCopy.userNotFound,
  invalid_confirmation_code: authErrorCopy.invalidConfirmationCode,
  code_mismatch: authErrorCopy.invalidConfirmationCode,
  expired_code: authErrorCopy.invalidConfirmationCode,
  password_recovery_failed: authErrorCopy.recoveryFailed,
};

const AUTH_ERROR_BY_MESSAGE: Record<string, string> = {
  "invalid credentials": authErrorCopy.invalidCredentials,
  "credenciais inválidas": authErrorCopy.invalidCredentials,
  "credenciais invalidas": authErrorCopy.invalidCredentials,
  "cpf is not eligible for registration": authErrorCopy.cpfNotEligible,
  "cpf is not elegible for registration": authErrorCopy.cpfNotEligible,
  "cpf already registered": authErrorCopy.cpfAlreadyRegistered,
  "email already registered": authErrorCopy.emailAlreadyRegistered,
  "phone already registered": authErrorCopy.phoneAlreadyRegistered,
  "invalid cpf": authErrorCopy.invalidCpf,
  "cpf inválido": authErrorCopy.invalidCpf,
  "cpf invalido": authErrorCopy.invalidCpf,
  "email is required": authErrorCopy.emailRequired,
  "user not found": authErrorCopy.userNotFound,
};

export function readAuthErrorCode(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const nested = (raw as Record<string, unknown>).error;
  if (!nested || typeof nested !== "object") return undefined;
  const code = (nested as Record<string, unknown>).code;
  return typeof code === "string" && code.trim() ? code.trim().toLowerCase() : undefined;
}

export function isRecoveryConfirmationCodeError(raw: unknown): boolean {
  const code = readAuthErrorCode(raw);
  return code ? RECOVERY_OTP_ERROR_CODES.has(code) : false;
}

/** Traduz erros conhecidos de auth/cadastro da API (inglês) para português. */
export function translateAuthError(
  message?: string | null,
  raw?: unknown,
): string | undefined {
  const code = readAuthErrorCode(raw);
  if (code && AUTH_ERROR_BY_CODE[code]) {
    return AUTH_ERROR_BY_CODE[code];
  }

  if (typeof message !== "string") return undefined;
  const trimmed = message.trim();
  if (!trimmed) return undefined;

  const normalized = trimmed.toLowerCase();
  return AUTH_ERROR_BY_MESSAGE[normalized] ?? trimmed;
}
