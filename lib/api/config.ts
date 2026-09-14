/**
 * Valor sentinela (Playwright / E2E): força “sem backend” mesmo quando o `.env` define URL.
 * O cliente e o servidor partilham a mesma leitura via `getApiBaseUrl`.
 */
const E2E_DISABLE_BACKEND_SENTINEL = "__E2E_NO_BACKEND__";

/**
 * Base URL do backend (sem barra final). Usada em Route Handlers, Server Actions e NextAuth.
 * Preferir `API_URL` em produção; `NEXT_PUBLIC_API_URL` também é aceito para alinhar cliente/servidor em dev.
 */
export function getApiBaseUrl(): string {
  const raw = process.env.API_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim() || "";
  if (raw === E2E_DISABLE_BACKEND_SENTINEL) return "";
  return raw.replace(/\/$/, "");
}

export function isBackendApiConfigured(): boolean {
  return getApiBaseUrl().length > 0;
}
