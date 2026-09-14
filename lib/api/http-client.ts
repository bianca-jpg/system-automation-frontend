import { getApiBaseUrl } from "@/lib/api/config";
import { fetchJsonWithTimeout } from "@/lib/api/fetch-with-timeout";

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

function getAuthToken(): string | null {
  return authToken;
}

export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

export interface ApiError extends Error {
  status?: number;
}

/** Erro lançado por `apiFetch` para toda resposta não-ok; carrega o status e o corpo desserializado do backend. */
export class ApiRequestError extends Error implements ApiError {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`API error: ${status}`);
    this.name = "ApiRequestError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Parse tolerante a falha: usado tanto no caminho de sucesso quanto no de
 * erro. Em resposta não-ok, corpo vazio ou malformado nunca lança — a
 * ausência de corpo aproveitável não pode mascarar o status HTTP real. No
 * caminho de sucesso o parse continua estrito (byte-idêntico ao anterior):
 * um JSON malformado em uma resposta 2xx segue lançando, como sempre lançou.
 */
function parseApiFetchBody<T>(text: string, response: Response): T {
  if (!response.ok) {
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return undefined as T;
    }
  }
  return JSON.parse(text) as T;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init?.headers ?? {}),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const { response, body } = await fetchJsonWithTimeout<T>(
    `${getApiBaseUrl()}${path}`,
    {
      ...init,
      headers,
    },
    {
      // 204 nunca tem corpo. Qualquer outro status passa pelo parse —
      // inclusive não-ok, para que o corpo de erro do backend fique
      // disponível em `ApiRequestError`. Antes, respostas não-ok tinham o
      // corpo deliberadamente descartado; ver `parseApiFetchBody` acima.
      shouldParse: (candidate) => candidate.status !== 204,
      parse: parseApiFetchBody<T>,
    },
  );
  if (!response.ok) {
    if (response.status === 401) {
      onUnauthorized?.();
    }
    // Tradeoff aceito: ler o corpo de erro passa a consumir o mesmo deadline
    // e o mesmo teto de bytes que já valem para respostas de sucesso. Um
    // corpo de erro gigante ou muito lento pode agora emergir como erro de
    // tamanho/timeout em vez do erro de status — falha honesta, dentro do
    // limite que a aplicação já tolera no caminho de sucesso.
    throw new ApiRequestError(response.status, body);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return body as T;
}
