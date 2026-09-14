import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BackendFetchTimeoutError } from "@/lib/api/fetch-with-timeout";
import { ApiRequestError, apiFetch, setAuthToken, setOnUnauthorized } from "@/lib/api/http-client";

const encoder = new TextEncoder();

function delayedResponse(delayMs: number): Response {
  let bodyTimer: ReturnType<typeof setTimeout> | undefined;
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('{"value":'));
        bodyTimer = setTimeout(() => {
          controller.enqueue(encoder.encode('"ready"}'));
          controller.close();
        }, delayMs);
      },
      cancel() {
        if (bodyTimer) clearTimeout(bodyTimer);
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("apiFetch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("API_URL", "https://api.example.test");
    vi.stubEnv("API_FETCH_TIMEOUT_MS", "3000");
    setAuthToken(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("mantém o timeout ativo até o JSON terminar", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(delayedResponse(4_000)));

    const pending = apiFetch<{ value: string }>("/api/v1/data");
    const assertion = expect(pending).rejects.toBeInstanceOf(BackendFetchTimeoutError);
    await vi.advanceTimersByTimeAsync(3_000);

    await assertion;
  });

  it("retorna o JSON concluído dentro do prazo", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(delayedResponse(1_000)));

    const pending = apiFetch<{ value: string }>("/api/v1/data");
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(pending).resolves.toEqual({ value: "ready" });
  });
});

describe("apiFetch — erro estruturado", () => {
  beforeEach(() => {
    vi.stubEnv("API_URL", "https://api.example.test");
    setAuthToken(null);
    setOnUnauthorized(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    setOnUnauthorized(() => {});
  });

  it("resposta não-ok com corpo JSON carrega status e corpo desserializado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ message: "Não autorizado" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const pending = apiFetch("/api/v1/data");
    await expect(pending).rejects.toBeInstanceOf(ApiRequestError);
    await expect(pending).rejects.toMatchObject({
      status: 403,
      body: { message: "Não autorizado" },
    });
  });

  it("resposta não-ok com corpo vazio lança erro com status correto e sem corpo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 500 })),
    );

    const pending = apiFetch("/api/v1/data");
    await expect(pending).rejects.toMatchObject({ status: 500, body: undefined });
  });

  it("resposta não-ok com corpo não-JSON (página de erro de proxy) lança erro com status correto e sem corpo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response("<html>502 Bad Gateway</html>", {
          status: 502,
          headers: { "Content-Type": "text/html" },
        }),
      ),
    );

    const pending = apiFetch("/api/v1/data");
    await expect(pending).rejects.toMatchObject({ status: 502, body: undefined });
  });

  it("401 aciona o callback de não-autorizado antes de lançar o erro", async () => {
    const order: string[] = [];
    setOnUnauthorized(() => order.push("callback"));
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ message: "expirado" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await apiFetch("/api/v1/data").catch(() => order.push("throw"));

    expect(order).toEqual(["callback", "throw"]);
  });

  it("204 resolve sem corpo, sem tentar parse", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 })),
    );

    await expect(apiFetch("/api/v1/data")).resolves.toBeUndefined();
  });
});
