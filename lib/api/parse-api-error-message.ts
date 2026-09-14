import { translateAuthError } from "@/lib/api/translate-auth-error";

const TECHNICAL_MESSAGE_PATTERN =
  /(traceback|stack|exception|sqlstate|syntaxerror|referenceerror|typeerror|econnrefused|enotfound| at [\w$.]+\(|https?:\/\/|\/app\/|\/usr\/|file ")/i;
const SENSITIVE_MESSAGE_PATTERN =
  /(bearer\s+[a-z0-9._-]+|access[_-]?token|refresh[_-]?token|authorization|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\b\d{2}\s?\d{4,5}-?\d{4}\b)/i;
const MAX_USER_FACING_ERROR_LENGTH = 240;

/** Erros de campo devolvidos pelo backend (ex.: FastAPI + ``build_error_response`` com ``details.errors``). */
type ApiValidationIssue = {
  field: string | null;
  reason: string;
};

const API_VALIDATION_FIELD_LABELS_PT: Record<string, string> = {
  org_id: "Organização",
  first_name: "Nome",
  last_name: "Sobrenome",
  cpf: "CPF",
  email: "E-mail",
  phone: "Telefone",
  job_title: "Cargo",
  employment_start_date: "Data de admissão",
  city: "Cidade",
  state: "Estado (UF)",
  work_model: "Modelo de trabalho",
  employee_code: "Matrícula",
  full_name: "Nome completo (RH)",
};

function normalizeUserFacingText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > MAX_USER_FACING_ERROR_LENGTH) return undefined;
  if (TECHNICAL_MESSAGE_PATTERN.test(trimmed)) return undefined;
  if (SENSITIVE_MESSAGE_PATTERN.test(trimmed)) return undefined;
  return trimmed;
}

function parseIssueRow(row: unknown): ApiValidationIssue | undefined {
  if (!row || typeof row !== "object") return undefined;
  const r = row as Record<string, unknown>;
  const reason = normalizeUserFacingText(r.reason);
  if (!reason) return undefined;
  const fieldRaw = r.field;
  const field = typeof fieldRaw === "string" && fieldRaw.trim() ? fieldRaw.trim() : null;
  return { field, reason };
}

/**
 * Lê ``error.details.errors`` do envelope ``{ error: { … } }`` usado pela API.
 */
function parseApiValidationIssues(raw: unknown): ApiValidationIssue[] | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const nested = o.error;
  if (!nested || typeof nested !== "object") return undefined;
  const err = nested as Record<string, unknown>;
  const details = err.details;
  if (!details || typeof details !== "object") return undefined;
  const d = details as Record<string, unknown>;
  const arr = d.errors;
  if (!Array.isArray(arr)) return undefined;
  const out: ApiValidationIssue[] = [];
  for (const item of arr) {
    const parsed = parseIssueRow(item);
    if (parsed) out.push(parsed);
  }
  return out.length ? out : undefined;
}

/**
 * Texto único para toast / alerta quando a API devolve vários erros de validação.
 */
function formatApiValidationIssuesSummary(issues: ApiValidationIssue[]): string | undefined {
  const parts: string[] = [];
  for (const issue of issues) {
    const label =
      issue.field != null
        ? (API_VALIDATION_FIELD_LABELS_PT[issue.field] ?? issue.field)
        : "Formulário";
    const reasonRaw = normalizeUserFacingText(issue.reason);
    if (!reasonRaw) continue;
    const reason = translateAuthError(reasonRaw) ?? reasonRaw;
    parts.push(`${label}: ${reason}`);
  }
  if (!parts.length) return undefined;
  let s = parts.slice(0, 3).join(" · ");
  if (parts.length > 3) s += ` (+${parts.length - 3})`;
  if (s.length > MAX_USER_FACING_ERROR_LENGTH) {
    return `${s.slice(0, MAX_USER_FACING_ERROR_LENGTH - 1)}…`;
  }
  return s;
}

/**
 * Extrai mensagem legível do JSON de erro do backend (FastAPI, contratos do auth, etc.).
 * Prioriza erros de validação com campo (``error.details.errors``) quando existirem.
 */
export function parseApiErrorMessage(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;

  const validationSummary = formatApiValidationIssuesSummary(parseApiValidationIssues(raw) ?? []);
  if (validationSummary) return validationSummary;

  const topMessage = normalizeUserFacingText(o.message);
  if (topMessage) return translateAuthError(topMessage) ?? topMessage;

  const detailMessage = normalizeUserFacingText(o.detail);
  if (detailMessage) return translateAuthError(detailMessage) ?? detailMessage;

  if (Array.isArray(o.detail) && o.detail.length > 0) {
    const first = o.detail[0];
    if (first && typeof first === "object") {
      const d = first as Record<string, unknown>;
      const detailArrayMessage = normalizeUserFacingText(d.msg);
      if (detailArrayMessage) return translateAuthError(detailArrayMessage) ?? detailArrayMessage;
    }
  }
  const nested = o.error;
  if (nested && typeof nested === "object") {
    const e = nested as Record<string, unknown>;
    const nestedMessage = normalizeUserFacingText(e.message);
    if (nestedMessage) return translateAuthError(nestedMessage, raw) ?? nestedMessage;

    const nestedDetails = normalizeUserFacingText(e.details);
    if (nestedDetails) return nestedDetails;
  }
  return undefined;
}
