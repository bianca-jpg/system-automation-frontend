import { getApiBaseUrl } from "@/lib/api/config";
import {
  BackendResponseTooLargeError,
  fetchJsonWithTimeout,
} from "@/lib/api/fetch-with-timeout";

const REALTIME_REQUEST_TIMEOUT_MS = 10_000;
const MAX_CONTROL_RESPONSE_LENGTH = 64 * 1024;
const MAX_TICKET_LENGTH = 2_048;

export class RealtimeRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "RealtimeRequestError";
  }
}

interface RealtimeTicketResponse {
  ticket: string;
  websocketUrl?: string;
  expiresIn?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readSmallJson(text: string, response: Response): unknown {
  if (text.length > MAX_CONTROL_RESPONSE_LENGTH) {
    throw new RealtimeRequestError("Resposta realtime excedeu o limite permitido.", response.status);
  }
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new RealtimeRequestError("Resposta realtime inválida.", response.status);
  }
}

async function authenticatedRealtimeRequest(
  path: string,
  accessToken: string,
  init: RequestInit,
  signal?: AbortSignal,
): Promise<unknown> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new RealtimeRequestError("Backend realtime não configurado.");
  }

  let response: Response;
  let body: unknown;
  try {
    const result = await fetchJsonWithTimeout(
      `${apiBaseUrl}${path}`,
      {
        ...init,
        cache: "no-store",
        credentials: "omit",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          ...(init.headers ?? {}),
        },
        signal,
      },
      {
        timeoutMs: REALTIME_REQUEST_TIMEOUT_MS,
        maxBodyBytes: MAX_CONTROL_RESPONSE_LENGTH,
        parse: readSmallJson,
      },
    );
    response = result.response;
    body = result.body;
  } catch (error) {
    if (error instanceof BackendResponseTooLargeError) {
      throw new RealtimeRequestError(
        "Resposta realtime excedeu o limite permitido.",
        error.status,
      );
    }
    throw error;
  }

  if (!response.ok) {
    throw new RealtimeRequestError(
      `Realtime indisponível (${response.status}).`,
      response.status,
    );
  }
  return body;
}

export async function requestRealtimeTicket(
  accessToken: string,
  signal?: AbortSignal,
): Promise<RealtimeTicketResponse> {
  const body = await authenticatedRealtimeRequest(
    "/api/v1/realtime/tickets",
    accessToken,
    { method: "POST" },
    signal,
  );

  if (!isRecord(body)) {
    throw new RealtimeRequestError("Ticket realtime inválido.");
  }

  const ticket = body.ticket;
  if (typeof ticket !== "string" || ticket.length === 0 || ticket.length > MAX_TICKET_LENGTH) {
    throw new RealtimeRequestError("Ticket realtime inválido.");
  }

  const websocketUrlCandidate = body.websocketUrl ?? body.websocket_url ?? body.wsUrl ?? body.ws_url;
  const websocketUrl =
    typeof websocketUrlCandidate === "string" && websocketUrlCandidate.length > 0
      ? websocketUrlCandidate
      : undefined;
  const expiresInCandidate = body.expiresIn ?? body.expires_in;

  return {
    ticket,
    websocketUrl,
    expiresIn:
      typeof expiresInCandidate === "number" && Number.isFinite(expiresInCandidate)
        ? Math.max(0, expiresInCandidate)
        : undefined,
  };
}

export async function requestRealtimeStatus(
  accessToken: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const params = new URLSearchParams();
  params.set("topics", "orders,alerts,communications,history");
  return authenticatedRealtimeRequest(
    `/api/v1/realtime/status?${params.toString()}`,
    accessToken,
    { method: "GET" },
    signal,
  );
}

export async function markRealtimeTopicRead(
  accessToken: string,
  topic: string,
  throughSequence: number,
  signal?: AbortSignal,
): Promise<void> {
  await authenticatedRealtimeRequest(
    "/api/v1/realtime/read",
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, throughSequence }),
    },
    signal,
  );
}

export function buildRealtimeWebSocketUrl(
  ticket: RealtimeTicketResponse,
  lastSequence: number,
): string {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new RealtimeRequestError("Backend realtime não configurado.");
  }

  const fallback = `${apiBaseUrl}/api/v1/realtime/ws`;
  const apiUrl = new URL(apiBaseUrl);
  const url = new URL(ticket.websocketUrl ?? fallback, apiBaseUrl);
  if (url.protocol === "http:") url.protocol = "ws:";
  if (url.protocol === "https:") url.protocol = "wss:";
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new RealtimeRequestError("URL realtime inválida.");
  }
  // `websocketUrl` vem autenticada pelo backend, mas o ticket de uso único não
  // deve ser encaminhado a outro host caso a resposta seja adulterada.
  if (url.host !== apiUrl.host) {
    throw new RealtimeRequestError("Host realtime não autorizado.");
  }

  url.searchParams.delete("last_sequence");
  url.searchParams.set("ticket", ticket.ticket);
  if (lastSequence > 0) {
    url.searchParams.set("lastSequence", String(lastSequence));
  } else {
    url.searchParams.delete("lastSequence");
  }
  url.searchParams.set("topics", "orders,alerts,communications,history");
  return url.toString();
}
