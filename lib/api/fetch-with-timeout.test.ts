import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BackendFetchTimeoutError,
  BackendResponseTooLargeError,
  fetchJsonWithTimeout,
} from "@/lib/api/fetch-with-timeout";

const encoder = new TextEncoder();

function dripJsonResponse(firstChunk: string, lastChunk: string, delayMs: number): Response {
  let bodyTimer: ReturnType<typeof setTimeout> | undefined;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(firstChunk));
      bodyTimer = setTimeout(() => {
        controller.enqueue(encoder.encode(lastChunk));
        controller.close();
      }, delayMs);
    },
    cancel() {
      if (bodyTimer) clearTimeout(bodyTimer);
    },
  });
  return new Response(body, {
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchJsonWithTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("expira quando os headers chegam rápido, mas o corpo JSON passa do prazo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(dripJsonResponse('{"ok":', "true}", 4_000)),
    );

    const pending = fetchJsonWithTimeout<{ ok: boolean }>(
      "https://api.example.test/data",
      {},
      { timeoutMs: 3_000 },
    );
    const assertion = expect(pending).rejects.toBeInstanceOf(BackendFetchTimeoutError);

    await vi.advanceTimersByTimeAsync(3_000);
    await assertion;
  });

  it("preserva a razão do abort externo durante a leitura do corpo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(dripJsonResponse('{"ok":', "true}", 4_000)),
    );
    const controller = new AbortController();
    const externalError = new DOMException("Cancelado pelo chamador.", "AbortError");

    const pending = fetchJsonWithTimeout(
      "https://api.example.test/data",
      { signal: controller.signal },
      { timeoutMs: 3_000 },
    );
    const assertion = expect(pending).rejects.toBe(externalError);
    controller.abort(externalError);

    await assertion;
  });

  it("conclui e parseia JSON quando o corpo termina dentro do prazo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(dripJsonResponse('{"ok":', "true}", 1_000)),
    );

    const pending = fetchJsonWithTimeout<{ ok: boolean }>(
      "https://api.example.test/data",
      {},
      { timeoutMs: 3_000 },
    );
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(pending).resolves.toMatchObject({ body: { ok: true } });
  });

  it("rejeita pelo Content-Length antes de alocar um corpo acima do limite", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response("{}", {
          headers: {
            "Content-Type": "application/json",
            "Content-Length": "1000",
          },
        }),
      ),
    );

    await expect(
      fetchJsonWithTimeout("https://api.example.test/data", {}, { maxBodyBytes: 100 }),
    ).rejects.toBeInstanceOf(BackendResponseTooLargeError);
  });

  it("interrompe o stream quando os bytes recebidos excedem o limite", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response('{"value":"muito longo"}', {
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(
      fetchJsonWithTimeout("https://api.example.test/data", {}, { maxBodyBytes: 8 }),
    ).rejects.toBeInstanceOf(BackendResponseTooLargeError);
  });
});
