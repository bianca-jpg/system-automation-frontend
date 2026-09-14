import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BackendFetchTimeoutError } from "@/lib/api/fetch-with-timeout";
import {
  requestRealtimeStatus,
  requestRealtimeTicket,
} from "@/features/realtime/api/realtime-api";

const encoder = new TextEncoder();

function delayedResponse(firstChunk: string, lastChunk: string, delayMs: number): Response {
  let bodyTimer: ReturnType<typeof setTimeout> | undefined;
  return new Response(
    new ReadableStream<Uint8Array>({
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
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("realtime API", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("API_URL", "https://api.example.test");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("expira se a resposta de controle continua chegando após os headers", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(delayedResponse('{"connected":', "true}", 11_000)),
    );

    const pending = requestRealtimeStatus("access-token");
    const assertion = expect(pending).rejects.toBeInstanceOf(BackendFetchTimeoutError);
    await vi.advanceTimersByTimeAsync(10_000);

    await assertion;
  });

  it("parseia um ticket completo dentro do limite", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(delayedResponse('{"ticket":"abc",', '"expiresIn":30}', 1_000)),
    );

    const pending = requestRealtimeTicket("access-token");
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(pending).resolves.toEqual({
      ticket: "abc",
      websocketUrl: undefined,
      expiresIn: 30,
    });
  });
});
