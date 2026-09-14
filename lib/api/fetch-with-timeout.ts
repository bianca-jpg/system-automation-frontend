/** Padrão quando não há `API_FETCH_TIMEOUT_MS` / `NEXT_PUBLIC_API_FETCH_TIMEOUT_MS`. */
const DEFAULT_BACKEND_FETCH_TIMEOUT_MS = 25_000;

const TIMEOUT_MIN_MS = 3_000;
const TIMEOUT_MAX_MS = 120_000;

/** Limite defensivo padrão para respostas JSON da API. */
const DEFAULT_JSON_RESPONSE_MAX_BYTES = 8 * 1024 * 1024;

interface FetchWithTimeoutOptions {
  timeoutMs?: number;
}

interface FetchJsonWithTimeoutOptions<T> extends FetchWithTimeoutOptions {
  maxBodyBytes?: number;
  parse?: (text: string, response: Response) => T;
  shouldParse?: (response: Response) => boolean;
}

interface FetchJsonWithTimeoutResult<T> {
  response: Response;
  body: T | undefined;
}

/**
 * Timeout efetivo para pedidos ao backend (server e browser).
 * Em dev local (porta 8000) consultas pesadas ou muitos pedidos em paralelo ultrapassavam 10s com frequência.
 *
 * No Next.js, variáveis sem `NEXT_PUBLIC_` não entram no bundle do browser. Para o mesmo limite em
 * servidor e cliente, defina **as duas** (`API_FETCH_TIMEOUT_MS` e `NEXT_PUBLIC_API_FETCH_TIMEOUT_MS`)
 * com o mesmo valor em ms; no servidor sobra só a primeira.
 */
function resolveBackendFetchTimeoutMs(): number {
  const raw =
    process.env.API_FETCH_TIMEOUT_MS?.trim() ||
    process.env.NEXT_PUBLIC_API_FETCH_TIMEOUT_MS?.trim() ||
    "";
  if (!raw) return DEFAULT_BACKEND_FETCH_TIMEOUT_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_BACKEND_FETCH_TIMEOUT_MS;
  return Math.min(TIMEOUT_MAX_MS, Math.max(TIMEOUT_MIN_MS, Math.floor(n)));
}

export class BackendFetchTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super("Tempo limite ao contactar o backend.");
    this.name = "BackendFetchTimeoutError";
  }
}

export class BackendResponseTooLargeError extends Error {
  constructor(
    readonly maxBodyBytes: number,
    readonly status?: number,
  ) {
    super("Resposta do backend excedeu o limite permitido.");
    this.name = "BackendResponseTooLargeError";
  }
}

type AbortSource = "external" | "timeout" | null;

function resolveTimeoutMs(explicit?: number): number {
  return explicit != null && Number.isFinite(explicit) && explicit > 0
    ? Math.min(TIMEOUT_MAX_MS, Math.max(TIMEOUT_MIN_MS, Math.floor(explicit)))
    : resolveBackendFetchTimeoutMs();
}

function resolveMaxBodyBytes(explicit?: number): number {
  return explicit != null && Number.isFinite(explicit) && explicit > 0
    ? Math.floor(explicit)
    : DEFAULT_JSON_RESPONSE_MAX_BYTES;
}

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("The operation was aborted.", "AbortError");
}

async function readWithSignal(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  if (signal.aborted) throw abortReason(signal);

  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(abortReason(signal));
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });

  try {
    return await Promise.race([reader.read(), aborted]);
  } finally {
    if (onAbort) signal.removeEventListener("abort", onAbort);
  }
}

function validateContentLength(response: Response, maxBodyBytes: number): void {
  const rawContentLength = response.headers.get("content-length")?.trim();
  if (!rawContentLength || !/^\d+$/.test(rawContentLength)) return;

  const contentLength = Number(rawContentLength);
  if (Number.isSafeInteger(contentLength) && contentLength > maxBodyBytes) {
    throw new BackendResponseTooLargeError(maxBodyBytes, response.status);
  }
}

async function readBoundedResponseText(
  response: Response,
  signal: AbortSignal,
  maxBodyBytes: number,
): Promise<string> {
  validateContentLength(response, maxBodyBytes);
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let receivedBytes = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await readWithSignal(reader, signal);
      if (done) break;

      receivedBytes += value.byteLength;
      if (receivedBytes > maxBodyBytes) {
        throw new BackendResponseTooLargeError(maxBodyBytes, response.status);
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) {
    void reader.cancel(error).catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

async function runFetchWithDeadline<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  options: FetchWithTimeoutOptions,
  consume: (response: Response, signal: AbortSignal) => Promise<T>,
  enforceDeadlineAfterConsume: boolean,
): Promise<T> {
  const timeoutMs = resolveTimeoutMs(options.timeoutMs);
  const controller = new AbortController();
  const externalSignal = init.signal;
  const startedAt = Date.now();
  const timeoutError = new BackendFetchTimeoutError(timeoutMs);
  let abortSource: AbortSource = null;

  const abortFromTimeout = () => {
    if (abortSource !== null) return;
    abortSource = "timeout";
    controller.abort(timeoutError);
  };
  const abortFromExternalSignal = () => {
    if (abortSource !== null) return;
    abortSource = "external";
    controller.abort(externalSignal ? abortReason(externalSignal) : undefined);
  };

  const timeout = setTimeout(abortFromTimeout, timeoutMs);
  if (externalSignal?.aborted) {
    abortFromExternalSignal();
  } else {
    externalSignal?.addEventListener("abort", abortFromExternalSignal, {
      once: true,
    });
  }

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    const result = await consume(response, controller.signal);

    // `JSON.parse` é síncrono e pode bloquear o callback do timer; a verificação
    // após o consumo impede que uma parse concluída fora do prazo seja aceita.
    if (enforceDeadlineAfterConsume && Date.now() - startedAt >= timeoutMs) {
      abortFromTimeout();
    }
    if (abortSource === "timeout") throw timeoutError;
    return result;
  } catch (error) {
    if (abortSource === "timeout") throw timeoutError;
    throw error;
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abortFromExternalSignal);
  }
}

/**
 * Faz o fetch e mantém o mesmo timeout durante toda a leitura e parse do JSON.
 * O corpo é limitado pelos bytes efetivamente recebidos, além de `Content-Length`.
 */
export async function fetchJsonWithTimeout<T = unknown>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: FetchJsonWithTimeoutOptions<T> = {},
): Promise<FetchJsonWithTimeoutResult<T>> {
  const maxBodyBytes = resolveMaxBodyBytes(options.maxBodyBytes);

  return runFetchWithDeadline(
    input,
    init,
    options,
    async (response, signal) => {
      if (options.shouldParse && !options.shouldParse(response)) {
        return { response, body: undefined };
      }

      const text = await readBoundedResponseText(response, signal, maxBodyBytes);
      const body = options.parse
        ? options.parse(text, response)
        : (JSON.parse(text) as T);
      return { response, body };
    },
    true,
  );
}
