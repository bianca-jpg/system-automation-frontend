import { ApiRequestError } from "@/lib/api/http-client";
import { parseApiErrorMessage } from "@/lib/api/parse-api-error-message";

/** Mesmo texto que `use-latest-resource.ts` usa hoje, para que as duas superfícies de erro digam a mesma coisa. */
const GENERIC_FALLBACK_MESSAGE = "Não foi possível carregar os dados.";

/**
 * Traduz qualquer erro capturado (tipicamente vindo de `apiFetch`) para uma
 * string segura de exibir na UI, em ordem:
 *
 * 1. `ApiRequestError` com corpo: reaproveita `parseApiErrorMessage` — a
 *    mesma filtragem de conteúdo técnico/sensível que mitiga T-QUICK-01 —
 *    para extrair a mensagem legível do corpo estruturado do backend.
 * 2. Qualquer `Error` com mensagem própria: a mensagem passa pelo mesmo
 *    filtro (embrulhada como `{ message }`) antes de ser aproveitada, para
 *    nunca devolver texto técnico ou sensível.
 * 3. Nada aproveitável: cai no texto genérico de fallback.
 */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError && error.body !== undefined) {
    const fromBody = parseApiErrorMessage(error.body);
    if (fromBody) return fromBody;
  }
  if (error instanceof Error && error.message) {
    const fromMessage = parseApiErrorMessage({ message: error.message });
    if (fromMessage) return fromMessage;
  }
  return GENERIC_FALLBACK_MESSAGE;
}
