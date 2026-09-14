import { getApiBaseUrl } from "@/lib/api/config";
import { fetchJsonWithTimeout } from "@/lib/api/fetch-with-timeout";
import { hasAuthenticatedToken, isAuthApiResponse } from "@/lib/api/normalize-auth-api";
import { parseApiErrorMessage } from "@/lib/api/parse-api-error-message";
import { translateAuthError } from "@/lib/api/translate-auth-error";
import type { AuthenticatedAuthApiResponse } from "@/lib/api/types/auth";

export class BackendAuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "BackendAuthError";
  }
}

function messageForFetchFailure(error: unknown): string {
  const parts: string[] = [];
  if (error instanceof Error) {
    parts.push(error.message);
    if (error.cause instanceof Error) {
      parts.push(error.cause.message);
    } else if (error.cause && typeof error.cause === "object" && "code" in error.cause) {
      parts.push(String((error.cause as { code?: string }).code));
    }
  }
  const joined = parts.join(" ");
  if (/ECONNREFUSED|ENOTFOUND/i.test(joined)) {
    return "Não foi possível conectar ao servidor. Verifique sua conexão ou tente novamente.";
  }
  return joined || "Falha de rede. Tente novamente.";
}

const SERVICE_UNAVAILABLE = "Serviço temporariamente indisponível. Tente novamente em instantes.";
const AUTH_JSON_MAX_BYTES = 64 * 1024;

function parseAuthResponseBody(text: string): unknown {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function postJson(
  path: string,
  body: object,
  fallbackError: string,
  headers?: Record<string, string>,
) {
  const base = getApiBaseUrl();
  if (!base) {
    throw new BackendAuthError(SERVICE_UNAVAILABLE, 500);
  }

  let res: Response;
  let json: unknown;
  try {
    const result = await fetchJsonWithTimeout<unknown>(
      `${base}/api/auth/${path}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...headers,
        },
        body: JSON.stringify(body),
      },
      {
        maxBodyBytes: AUTH_JSON_MAX_BYTES,
        parse: parseAuthResponseBody,
      },
    );
    res = result.response;
    json = result.body;
  } catch (e) {
    throw new BackendAuthError(messageForFetchFailure(e), 503, e);
  }

  if (!res.ok) {
    const parsed = parseApiErrorMessage(json);
    const msg = translateAuthError(parsed, json) ?? fallbackError;
    throw new BackendAuthError(msg, res.status, json);
  }

  return json;
}

export async function postSignInMicrosoft(
  idToken: string,
): Promise<AuthenticatedAuthApiResponse> {
  const json = await postJson(
    "sso/microsoft",
    { id_token: idToken },
    "Não foi possível entrar com a conta Microsoft.",
  );
  if (!isAuthApiResponse(json) || !hasAuthenticatedToken(json)) {
    throw new BackendAuthError("Não foi possível concluir o login.", 502, json);
  }
  return json;
}

export async function postRefresh(refreshToken: string): Promise<AuthenticatedAuthApiResponse> {
  const json = await postJson(
    "token/refresh",
    { refresh_token: refreshToken },
    "Falha ao renovar sessão.",
  );
  if (!isAuthApiResponse(json) || !hasAuthenticatedToken(json)) {
    throw new BackendAuthError("Sessão expirada. Faça login novamente.", 502, json);
  }
  return json;
}

export async function postSignOut(accessToken: string): Promise<void> {
  const base = getApiBaseUrl();
  if (!base) return;

  const { response: res } = await fetchJsonWithTimeout<undefined>(
    `${base}/api/auth/sign-out`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
    {
      maxBodyBytes: AUTH_JSON_MAX_BYTES,
      parse: () => undefined,
    },
  );

  if (!res.ok) {
    // Revogação best-effort: sessão local ainda será encerrada pelo NextAuth
    console.warn("[auth] sign-out no backend retornou", res.status);
  }
}

export function parseSignInError(error: unknown): string | undefined {
  if (error instanceof BackendAuthError) return error.message;
  if (error instanceof Error) return error.message;
  return undefined;
}
