import { act, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { useEffect } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { RealtimeContextValue } from "./types";
import * as realtimeApi from "../api/realtime-api";

const authMock = vi.hoisted(() => ({
  session: {
    data: {
      user: {
        id: "user-1",
        email: "ana@example.com",
        accessToken: "access-token",
      },
    },
    status: "authenticated" as "authenticated" | "loading" | "unauthenticated",
  },
}));

vi.mock("next-auth/react", () => ({
  useSession: () => authMock.session,
}));

import { RealtimeProvider, useRealtime } from "./realtime-provider";

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readonly url: string;
  readyState = FakeWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  send = vi.fn();
  private delayedClose:
    | { handler: ((event: CloseEvent) => void) | null; event: CloseEvent }
    | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.(new Event("open"));
  }

  receive(frame: unknown): void {
    this.onmessage?.({ data: JSON.stringify(frame) } as MessageEvent);
  }

  close(code = 1000, reason = ""): void {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code, reason, wasClean: code === 1000 } as CloseEvent);
  }

  beginDelayedClose(code: number, reason: string): void {
    this.readyState = FakeWebSocket.CLOSING;
    this.delayedClose = {
      handler: this.onclose,
      event: { code, reason, wasClean: code === 1000 } as CloseEvent,
    };
  }

  finishDelayedClose(): void {
    if (!this.delayedClose) return;
    const delayed = this.delayedClose;
    this.delayedClose = null;
    this.readyState = FakeWebSocket.CLOSED;
    delayed.handler?.(delayed.event);
  }
}

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }
}

const zeroStatus = {
  lastSequence: 0,
  topics: Object.fromEntries(
    ["orders", "alerts", "communications", "history"].map((topic) => [
      topic,
      {
        latestSequence: 0,
        lastReadSequence: 0,
        unseen: false,
        latest: null,
      },
    ]),
  ),
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

let currentRealtime: RealtimeContextValue | null = null;
let fetchMock: ReturnType<typeof vi.fn>;

function Probe() {
  const realtime = useRealtime();
  useEffect(() => {
    currentRealtime = realtime;
  }, [realtime]);
  return <output data-testid="connection-state">{realtime.connectionState}</output>;
}

function renderProvider() {
  return render(
    <RealtimeProvider>
      <Probe />
    </RealtimeProvider>,
  );
}

function ticketCalls(): number {
  return fetchMock.mock.calls.filter(([input]) =>
    String(input).includes("/api/v1/realtime/tickets"),
  ).length;
}

async function flushMicrotasks(rounds = 12): Promise<void> {
  await act(async () => {
    for (let index = 0; index < rounds; index += 1) {
      await Promise.resolve();
    }
  });
}

function realtimeTopics(latestSequence = 0) {
  return {
    orders: { latestSequence, lastReadSequence: 0, unseen: latestSequence },
    alerts: { latestSequence: 0, lastReadSequence: 0, unseen: 0 },
    communications: { latestSequence: 0, lastReadSequence: 0, unseen: 0 },
    history: { latestSequence: 0, lastReadSequence: 0, unseen: 0 },
  };
}

function completeHandshake(
  socket: FakeWebSocket,
  {
    lastSequence = 0,
    latestSequence = lastSequence,
    heartbeatSeconds = 20,
  }: {
    lastSequence?: number;
    latestSequence?: number;
    heartbeatSeconds?: number;
  } = {},
): void {
  socket.open();
  sendHello(socket, { lastSequence, latestSequence, heartbeatSeconds });
  socket.receive({ type: "replay_complete", lastSequence: latestSequence });
}

function sendHello(
  socket: FakeWebSocket,
  {
    lastSequence,
    latestSequence,
    heartbeatSeconds = 20,
    topics = realtimeTopics(latestSequence),
  }: {
    lastSequence: number;
    latestSequence: number;
    heartbeatSeconds?: number;
    topics?: ReturnType<typeof realtimeTopics>;
  },
): void {
  socket.receive({
    type: "hello",
    version: 1,
    lastSequence,
    latestSequence,
    heartbeatSeconds,
    topics,
  });
}

beforeEach(() => {
  currentRealtime = null;
  FakeWebSocket.instances = [];
  authMock.session = {
    data: {
      user: {
        id: "user-1",
        email: "ana@example.com",
        accessToken: "access-token",
      },
    },
    status: "authenticated",
  };
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: new MemoryStorage(),
  });
  delete process.env.API_URL;
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  vi.stubGlobal("WebSocket", FakeWebSocket);
  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/v1/realtime/status")) return jsonResponse(zeroStatus);
    if (url.includes("/api/v1/realtime/tickets")) {
      return jsonResponse({
        ticket: "one-use-ticket",
        expiresIn: 30,
        websocketUrl:
          "ws://api.test/api/v1/realtime/ws?ticket=stale&last_sequence=999&topics=wrong",
      });
    }
    if (url.includes("/api/v1/realtime/read")) return jsonResponse({}, 200);
    throw new Error(`URL inesperada no teste: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("RealtimeProvider", () => {
  it("é seguro no SSR e só acessa APIs do navegador depois do mount", () => {
    expect(
      renderToString(
        <RealtimeProvider>
          <span>conteúdo protegido</span>
        </RealtimeProvider>,
      ),
    ).toContain("conteúdo protegido");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("abre WS direto com ticket, deduplica eventos e confirma leitura durável", async () => {
    renderProvider();

    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    const socket = FakeWebSocket.instances[0];
    expect(socket.url).toContain("ticket=one-use-ticket");
    expect(socket.url).toContain("topics=orders%2Calerts%2Ccommunications%2Chistory");
    expect(socket.url).not.toContain("ticket=stale");
    expect(socket.url).not.toContain("last_sequence");
    const ticketCallIndex = fetchMock.mock.calls.findIndex(([input]) =>
      String(input).includes("/api/v1/realtime/tickets"),
    );
    const ticketCall = fetchMock.mock.calls[ticketCallIndex];
    expect(ticketCall?.[1]).toMatchObject({
      method: "POST",
      credentials: "omit",
    });
    expect(new Headers(ticketCall?.[1]?.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
    const statusCallIndex = fetchMock.mock.calls.findIndex(([input]) =>
      String(input).includes("/api/v1/realtime/status"),
    );
    expect(fetchMock.mock.invocationCallOrder[ticketCallIndex]).toBeLessThan(
      fetchMock.mock.invocationCallOrder[statusCallIndex] ?? Number.POSITIVE_INFINITY,
    );

    act(() => completeHandshake(socket));
    expect(screen.getByTestId("connection-state")).toHaveTextContent("connected");

    act(() => {
      socket.receive({
        version: 1,
        eventId: "event-1",
        sequence: 1,
        type: "order.created",
        topic: "orders",
        occurredAt: "2026-08-08T10:00:00Z",
        payload: { orderId: "OR-1" },
      });
    });
    expect(currentRealtime?.topicRevisions.orders).toBe(1);
    expect(currentRealtime?.unseenTopics.orders).toBe(true);

    // Mesmo eventId com outra sequência avança o cursor, mas não reaplica a
    // revisão do tópico. Um evento posterior continua funcionando.
    act(() => {
      socket.receive({
        version: 1,
        eventId: "event-1",
        sequence: 2,
        type: "order.created",
        topic: "orders",
        occurredAt: "2026-08-08T10:00:01Z",
      });
      socket.receive({
        version: 1,
        eventId: "event-2",
        sequence: 3,
        type: "order.updated",
        topic: "orders",
        occurredAt: "2026-08-08T10:00:02Z",
      });
    });
    expect(currentRealtime?.topicRevisions.orders).toBe(3);

    await act(async () => {
      await currentRealtime?.markTopicRead("orders", 3);
    });
    expect(currentRealtime?.unseenTopics.orders).toBe(false);
    const readCall = fetchMock.mock.calls.find(([input]) =>
      String(input).includes("/api/v1/realtime/read"),
    );
    expect(JSON.parse(String(readCall?.[1]?.body))).toEqual({
      topic: "orders",
      throughSequence: 3,
    });
  });

  it("sinaliza revisões do status sem avançar o cursor pré-handshake", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/tickets")) {
        return jsonResponse({ ticket: "t", websocketUrl: "ws://api.test/api/v1/realtime/ws" });
      }
      if (url.includes("/status")) {
        return jsonResponse({
          lastSequence: 12,
          topics: {
            orders: { latestSequence: 12, lastReadSequence: 8, unseen: true },
            alerts: { latestSequence: 0, lastReadSequence: 0, unseen: false },
            communications: { latestSequence: 0, lastReadSequence: 0, unseen: false },
            history: { latestSequence: 0, lastReadSequence: 0, unseen: false },
          },
        });
      }
      throw new Error(url);
    });

    renderProvider();

    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    expect(currentRealtime?.topicRevisions.orders).toBe(12);
    expect(currentRealtime?.unseenTopics.orders).toBe(true);
    // O status pode sinalizar revisões, mas não representa eventos consumidos:
    // o primeiro replay ainda parte do cursor persistido (zero).
    expect(FakeWebSocket.instances[0].url).not.toContain("lastSequence");
  });

  it("renova o ticket quando o status consome o orçamento do TTL", async () => {
    vi.useFakeTimers();
    let issuedTickets = 0;
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/tickets")) {
        issuedTickets += 1;
        return jsonResponse({
          ticket: `ttl-ticket-${issuedTickets}`,
          expiresIn: 20,
          websocketUrl: "ws://api.test/api/v1/realtime/ws",
        });
      }
      if (url.includes("/status")) {
        await new Promise<void>((resolve) => setTimeout(resolve, 9_000));
        return jsonResponse(zeroStatus);
      }
      throw new Error(url);
    });

    renderProvider();
    await flushMicrotasks();
    expect(issuedTickets).toBe(1);
    expect(FakeWebSocket.instances).toHaveLength(0);

    await act(async () => vi.advanceTimersByTimeAsync(9_000));
    await flushMicrotasks();
    expect(issuedTickets).toBe(2);
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toContain("ttl-ticket-2");
  });

  it("aplica replay N+1..M e só consolida M após replay_complete", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    window.localStorage.setItem(
      "system-automation:realtime:v1:user-1",
      JSON.stringify({
        version: 1,
        sequence: 10,
        topicRevisions: { orders: 0, alerts: 0, communications: 0, history: 0 },
        readRevisions: { orders: 0, alerts: 0, communications: 0, history: 0 },
        seenEventIds: [],
      }),
    );
    let issuedTickets = 0;
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/status")) return jsonResponse(zeroStatus);
      if (url.includes("/tickets")) {
        issuedTickets += 1;
        return jsonResponse({
          ticket: `ticket-${issuedTickets}`,
          websocketUrl: "ws://api.test/api/v1/realtime/ws",
        });
      }
      throw new Error(url);
    });

    renderProvider();
    await flushMicrotasks();
    const interruptedSocket = FakeWebSocket.instances[0];
    expect(interruptedSocket.url).toContain("lastSequence=10");

    act(() => {
      interruptedSocket.open();
      sendHello(interruptedSocket, {
        lastSequence: 10,
        latestSequence: 12,
        topics: realtimeTopics(0),
      });
      interruptedSocket.receive({
        version: 1,
        eventId: "replay-11",
        sequence: 11,
        type: "order.updated",
        topic: "orders",
        occurredAt: "2026-08-08T10:00:11Z",
      });
      interruptedSocket.receive({
        version: 1,
        eventId: "replay-12",
        sequence: 12,
        type: "alert.created",
        topic: "alerts",
        occurredAt: "2026-08-08T10:00:12Z",
      });
    });
    expect(currentRealtime?.topicRevisions.orders).toBe(11);
    expect(currentRealtime?.topicRevisions.alerts).toBe(12);

    // Sem `replay_complete`, uma queda repete o replay desde N.
    act(() => interruptedSocket.close(1013, "replay_interrupted"));
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    await flushMicrotasks();
    const replayedSocket = FakeWebSocket.instances[1];
    expect(replayedSocket.url).toContain("lastSequence=10");

    act(() => {
      replayedSocket.open();
      sendHello(replayedSocket, {
        lastSequence: 10,
        latestSequence: 12,
        topics: realtimeTopics(0),
      });
      replayedSocket.receive({
        version: 1,
        eventId: "replay-11",
        sequence: 11,
        type: "order.updated",
        topic: "orders",
        occurredAt: "2026-08-08T10:00:11Z",
      });
      replayedSocket.receive({
        version: 1,
        eventId: "replay-12",
        sequence: 12,
        type: "alert.created",
        topic: "alerts",
        occurredAt: "2026-08-08T10:00:12Z",
      });
      replayedSocket.receive({ type: "replay_complete", lastSequence: 12 });
      replayedSocket.close(1013, "after_complete");
    });
    await act(async () => vi.advanceTimersByTimeAsync(2_000));
    await flushMicrotasks();
    expect(FakeWebSocket.instances[2].url).toContain("lastSequence=12");
  });

  it("preserva evento que chega durante o POST de leitura", async () => {
    let resolveRead: (() => void) | null = null;
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/status")) return jsonResponse(zeroStatus);
      if (url.includes("/tickets")) {
        return jsonResponse({ ticket: "t", websocketUrl: "ws://api.test/api/v1/realtime/ws" });
      }
      if (url.includes("/read")) {
        await new Promise<void>((resolve) => {
          resolveRead = resolve;
        });
        return jsonResponse({});
      }
      throw new Error(url);
    });

    renderProvider();
    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    const socket = FakeWebSocket.instances[0];
    act(() => {
      completeHandshake(socket);
      socket.receive({
        version: 1,
        eventId: "event-4",
        sequence: 4,
        type: "order.updated",
        topic: "orders",
        occurredAt: "2026-08-08T10:00:04Z",
      });
    });

    let marking: Promise<void> | undefined;
    act(() => {
      marking = currentRealtime?.markTopicRead("orders", 4);
    });
    act(() => {
      socket.receive({
        version: 1,
        eventId: "event-5",
        sequence: 5,
        type: "order.updated",
        topic: "orders",
        occurredAt: "2026-08-08T10:00:05Z",
      });
    });
    await act(async () => {
      resolveRead?.();
      await marking;
    });

    expect(currentRealtime?.topicRevisions.orders).toBe(5);
    expect(currentRealtime?.unseenTopics.orders).toBe(true);
  });

  it("mantém o ponto quando o backend não confirma a leitura", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/status")) return jsonResponse(zeroStatus);
      if (url.includes("/tickets")) {
        return jsonResponse({ ticket: "t", websocketUrl: "ws://api.test/api/v1/realtime/ws" });
      }
      if (url.includes("/read")) return jsonResponse({ detail: "Redis indisponível" }, 503);
      throw new Error(url);
    });

    renderProvider();
    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    const socket = FakeWebSocket.instances[0];
    act(() => {
      completeHandshake(socket);
      socket.receive({
        version: 1,
        eventId: "event-6",
        sequence: 6,
        type: "alert.created",
        topic: "alerts",
        occurredAt: "2026-08-08T10:00:06Z",
      });
    });

    await act(async () => {
      await expect(
        currentRealtime?.markTopicRead("alerts", 6),
      ).rejects.toThrow("Realtime indisponível (503)");
    });
    expect(currentRealtime?.unseenTopics.alerts).toBe(true);
  });

  it("aborta e ignora confirmação de leitura após troca de usuário", async () => {
    let resolveRead: (() => void) | null = null;
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/status")) return jsonResponse(zeroStatus);
      if (url.includes("/tickets")) {
        return jsonResponse({ ticket: "t", websocketUrl: "ws://api.test/api/v1/realtime/ws" });
      }
      if (url.includes("/read")) {
        await new Promise<void>((resolve) => {
          resolveRead = resolve;
        });
        return jsonResponse({});
      }
      throw new Error(url);
    });

    const view = renderProvider();
    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    const firstSocket = FakeWebSocket.instances[0];
    act(() => {
      completeHandshake(firstSocket);
      firstSocket.receive({
        version: 1,
        eventId: "user-1-event",
        sequence: 10,
        type: "order.updated",
        topic: "orders",
        occurredAt: "2026-08-08T10:00:10Z",
      });
    });
    let marking: Promise<void> | undefined;
    act(() => {
      marking = currentRealtime?.markTopicRead("orders", 10);
    });

    authMock.session = {
      data: {
        user: {
          id: "user-2",
          email: "bia@example.com",
          accessToken: "access-token-2",
        },
      },
      status: "authenticated",
    };
    view.rerender(
      <RealtimeProvider>
        <Probe />
      </RealtimeProvider>,
    );
    await flushMicrotasks();
    expect(currentRealtime?.topicRevisions.orders).toBe(0);

    await act(async () => {
      resolveRead?.();
      await expect(marking).rejects.toMatchObject({ name: "AbortError" });
    });
    expect(currentRealtime?.topicRevisions.orders).toBe(0);
    expect(currentRealtime?.unseenTopics.orders).toBe(false);
  });

  it("usa polling de status enquanto o ticket falha", async () => {
    let statusRequests = 0;
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/status")) {
        statusRequests += 1;
        return jsonResponse({
          lastSequence: 9,
          topics: {
            orders: { latestSequence: 9, lastReadSequence: 0, unseen: true },
            alerts: { latestSequence: 0, lastReadSequence: 0, unseen: false },
            communications: { latestSequence: 0, lastReadSequence: 0, unseen: false },
            history: { latestSequence: 0, lastReadSequence: 0, unseen: false },
          },
        });
      }
      if (url.includes("/tickets")) return jsonResponse({ detail: "Redis fora" }, 503);
      throw new Error(url);
    });

    renderProvider();

    await waitFor(() => expect(statusRequests).toBeGreaterThanOrEqual(1));
    expect(currentRealtime?.connectionState).toBe("polling");
    expect(currentRealtime?.topicRevisions.orders).toBe(9);
    expect(currentRealtime?.unseenTopics.orders).toBe(true);
    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it.each([409, 422])(
    "trata %i no ACK como resync autoritativo com reconexão em backoff",
    async (readStatus) => {
      vi.useFakeTimers();
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.spyOn(realtimeApi, "markRealtimeTopicRead").mockRejectedValue(
        new realtimeApi.RealtimeRequestError("cursor incompatível", readStatus),
      );
      let statusRequests = 0;
      let issuedTickets = 0;
      fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/tickets")) {
          issuedTickets += 1;
          return jsonResponse({
            ticket: `read-${readStatus}-ticket-${issuedTickets}`,
            websocketUrl: "ws://api.test/api/v1/realtime/ws",
          });
        }
        if (url.includes("/status")) {
          statusRequests += 1;
          if (statusRequests === 1) return jsonResponse(zeroStatus);
          return jsonResponse({
            lastSequence: 5,
            topics: {
              ...realtimeTopics(0),
              orders: { latestSequence: 5, lastReadSequence: 0, unseen: 5 },
            },
          });
        }
        throw new Error(url);
      });

      renderProvider();
      await flushMicrotasks();
      const socket = FakeWebSocket.instances[0];
      act(() => {
        completeHandshake(socket);
        socket.receive({
          version: 1,
          eventId: "read-expired-5",
          sequence: 5,
          type: "order.updated",
          topic: "orders",
          occurredAt: "2026-08-08T10:00:05Z",
        });
      });
      expect(currentRealtime?.unseenTopics.orders).toBe(true);

      await act(async () => {
        await expect(
          currentRealtime?.markTopicRead("orders", 5),
        ).rejects.toMatchObject({ status: readStatus });
      });
      await flushMicrotasks();
      expect(currentRealtime?.resyncGeneration).toBe(1);
      expect(currentRealtime?.unseenTopics.orders).toBe(true);
      expect(FakeWebSocket.instances).toHaveLength(1);

      await act(async () => vi.advanceTimersByTimeAsync(999));
      expect(FakeWebSocket.instances).toHaveLength(1);
      await act(async () => vi.advanceTimersByTimeAsync(1));
      await flushMicrotasks();
      expect(FakeWebSocket.instances).toHaveLength(2);
      expect(FakeWebSocket.instances[1].url).toContain("lastSequence=5");
    },
  );

  it("corrige cursor adiantado após ACK 422 mesmo com WS indisponível", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    window.localStorage.setItem(
      "system-automation:realtime:v1:user-1",
      JSON.stringify({
        version: 1,
        sequence: 999,
        topicRevisions: { orders: 999, alerts: 0, communications: 0, history: 0 },
        readRevisions: { orders: 0, alerts: 0, communications: 0, history: 0 },
        seenEventIds: [],
      }),
    );
    vi.spyOn(realtimeApi, "markRealtimeTopicRead").mockRejectedValue(
      new realtimeApi.RealtimeRequestError("cursor adiante do watermark", 422),
    );
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/tickets")) {
        return jsonResponse({ detail: "WS indisponível" }, 503);
      }
      if (url.includes("/status")) {
        return jsonResponse({
          lastSequence: 10,
          topics: {
            ...realtimeTopics(0),
            orders: { latestSequence: 10, lastReadSequence: 8, unseen: 2 },
          },
        });
      }
      throw new Error(url);
    });

    renderProvider();
    await flushMicrotasks();
    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(currentRealtime?.topicRevisions.orders).toBe(999);

    await act(async () => {
      await expect(
        currentRealtime?.markTopicRead("orders", 999),
      ).rejects.toMatchObject({ status: 422 });
    });
    await flushMicrotasks();
    expect(currentRealtime?.resyncGeneration).toBe(1);
    expect(currentRealtime?.topicRevisions.orders).toBe(10);
    expect(currentRealtime?.unseenTopics.orders).toBe(true);
    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it("aplica backoff crescente em 1012 repetido sem hot-loop de tickets", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    renderProvider();
    await flushMicrotasks();
    const firstSocket = FakeWebSocket.instances[0];
    act(() => {
      completeHandshake(firstSocket);
      firstSocket.close(1012, "resync_required");
    });
    await flushMicrotasks();
    expect(ticketCalls()).toBe(1);
    expect(FakeWebSocket.instances).toHaveLength(1);

    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    await flushMicrotasks();
    expect(ticketCalls()).toBe(2);
    const secondSocket = FakeWebSocket.instances[1];
    act(() => {
      completeHandshake(secondSocket);
      secondSocket.close(1012, "resync_required");
    });
    await flushMicrotasks();
    expect(ticketCalls()).toBe(2);

    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    await flushMicrotasks();
    expect(FakeWebSocket.instances).toHaveLength(2);
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    await flushMicrotasks();
    expect(ticketCalls()).toBe(3);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it("ignora final de status de resync antigo após reconexão manual", async () => {
    let statusRequests = 0;
    let resolveOldStatus: (() => void) | null = null;
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/tickets")) {
        return jsonResponse({
          ticket: `manual-ticket-${ticketCalls()}`,
          websocketUrl: "ws://api.test/api/v1/realtime/ws",
        });
      }
      if (url.includes("/status")) {
        statusRequests += 1;
        if (statusRequests === 2) {
          await new Promise<void>((resolve) => {
            resolveOldStatus = resolve;
          });
        }
        return jsonResponse(zeroStatus);
      }
      throw new Error(url);
    });

    renderProvider();
    await flushMicrotasks();
    const oldSocket = FakeWebSocket.instances[0];
    act(() => {
      completeHandshake(oldSocket);
      oldSocket.close(1012, "resync_required");
    });
    await flushMicrotasks();
    expect(resolveOldStatus).not.toBeNull();

    act(() => currentRealtime?.requestReconnect());
    await flushMicrotasks();
    expect(FakeWebSocket.instances).toHaveLength(2);
    const currentSocket = FakeWebSocket.instances[1];
    act(() => completeHandshake(currentSocket));
    expect(currentRealtime?.connectionState).toBe("connected");

    await act(async () => {
      resolveOldStatus?.();
      await Promise.resolve();
    });
    await flushMicrotasks();
    expect(currentRealtime?.connectionState).toBe("connected");
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("invalida connect em voo quando ACK exige novo resync", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    let ticketRequests = 0;
    let resolveStaleTicket: (() => void) | null = null;
    vi.spyOn(realtimeApi, "requestRealtimeTicket").mockImplementation(
      async () => {
        ticketRequests += 1;
        if (ticketRequests === 2) {
          await new Promise<void>((resolve) => {
            resolveStaleTicket = resolve;
          });
        }
        return {
          ticket: `connect-generation-${ticketRequests}`,
          websocketUrl: "ws://api.test/api/v1/realtime/ws",
          expiresIn: 30,
        };
      },
    );
    vi.spyOn(realtimeApi, "markRealtimeTopicRead").mockRejectedValue(
      new realtimeApi.RealtimeRequestError("cursor adiante do watermark", 422),
    );
    let statusRequests = 0;
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/status")) {
        statusRequests += 1;
        if (statusRequests === 1) return jsonResponse(zeroStatus);
        return jsonResponse({
          lastSequence: 5,
          topics: {
            ...realtimeTopics(0),
            orders: { latestSequence: 5, lastReadSequence: 0, unseen: 5 },
          },
        });
      }
      throw new Error(url);
    });

    renderProvider();
    await flushMicrotasks();
    const firstSocket = FakeWebSocket.instances[0];
    act(() => {
      completeHandshake(firstSocket);
      firstSocket.receive({
        version: 1,
        eventId: "connect-race-5",
        sequence: 5,
        type: "order.updated",
        topic: "orders",
        occurredAt: "2026-08-08T10:00:05Z",
      });
      firstSocket.close(1013, "restart");
    });

    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    await flushMicrotasks();
    expect(ticketRequests).toBe(2);
    expect(resolveStaleTicket).not.toBeNull();
    expect(FakeWebSocket.instances).toHaveLength(1);

    await act(async () => {
      await expect(
        currentRealtime?.markTopicRead("orders", 5),
      ).rejects.toMatchObject({ status: 422 });
    });
    await flushMicrotasks();
    expect(currentRealtime?.resyncGeneration).toBe(1);

    await act(async () => vi.advanceTimersByTimeAsync(2_000));
    await flushMicrotasks();
    expect(ticketRequests).toBe(3);
    expect(FakeWebSocket.instances).toHaveLength(2);
    const currentSocket = FakeWebSocket.instances[1];
    act(() =>
      completeHandshake(currentSocket, {
        lastSequence: 5,
        latestSequence: 5,
      }),
    );

    await act(async () => {
      resolveStaleTicket?.();
      await Promise.resolve();
    });
    await flushMicrotasks();
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(currentRealtime?.connectionState).toBe("connected");
  });

  it("faz resync por status e reconecta ao voltar à aba", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    let statusRequests = 0;
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/tickets")) {
        return jsonResponse({ ticket: `t-${ticketCalls()}`, websocketUrl: "ws://api.test/api/v1/realtime/ws" });
      }
      if (url.includes("/status")) {
        statusRequests += 1;
        return jsonResponse(
          statusRequests === 1
            ? zeroStatus
            : {
                lastSequence: 14,
                topics: {
                  orders: { latestSequence: 14, lastReadSequence: 0, unseen: true },
                  alerts: { latestSequence: 0, lastReadSequence: 0, unseen: false },
                  communications: { latestSequence: 0, lastReadSequence: 0, unseen: false },
                  history: { latestSequence: 0, lastReadSequence: 0, unseen: false },
                },
              },
        );
      }
      throw new Error(url);
    });

    renderProvider();
    await flushMicrotasks();
    expect(FakeWebSocket.instances).toHaveLength(1);
    const socket = FakeWebSocket.instances[0];
    act(() => completeHandshake(socket));

    // Voltar à aba não derruba uma conexão que já está saudável.
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await flushMicrotasks();
    expect(FakeWebSocket.instances).toHaveLength(1);

    act(() => {
      socket.receive({ type: "resync_required", reason: "cursor_expired" });
      socket.close(1012, "resync_required");
    });
    await flushMicrotasks();
    expect(currentRealtime?.topicRevisions.orders).toBe(14);
    expect(currentRealtime?.unseenTopics.orders).toBe(true);
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    await flushMicrotasks();
    expect(FakeWebSocket.instances).toHaveLength(2);
    const resyncedSocket = FakeWebSocket.instances[1];
    act(() =>
      completeHandshake(resyncedSocket, {
        lastSequence: 14,
        latestSequence: 14,
      }),
    );

    // Voltar à aba continua sem derrubar o socket novo e saudável.
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await flushMicrotasks();
    expect(FakeWebSocket.instances).toHaveLength(2);

    act(() => resyncedSocket.close(1013, "backpressure"));
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await flushMicrotasks();
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it("substitui cursor corrompido no resync e aceita o próximo evento", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    window.localStorage.setItem(
      "system-automation:realtime:v1:user-1",
      JSON.stringify({
        version: 1,
        sequence: 999,
        topicRevisions: { orders: 999, alerts: 0, communications: 0, history: 0 },
        readRevisions: { orders: 998, alerts: 0, communications: 0, history: 0 },
        seenEventIds: ["future-event"],
      }),
    );
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/tickets")) {
        return jsonResponse({ ticket: `t-${ticketCalls()}`, websocketUrl: "ws://api.test/api/v1/realtime/ws" });
      }
      if (url.includes("/status")) {
        return jsonResponse({
          lastSequence: 10,
          topics: {
            orders: { latestSequence: 10, lastReadSequence: 8, unseen: true },
            alerts: { latestSequence: 0, lastReadSequence: 0, unseen: false },
            communications: { latestSequence: 0, lastReadSequence: 0, unseen: false },
            history: { latestSequence: 0, lastReadSequence: 0, unseen: false },
          },
        });
      }
      throw new Error(url);
    });

    renderProvider();
    await flushMicrotasks();
    expect(FakeWebSocket.instances).toHaveLength(1);
    const staleSocket = FakeWebSocket.instances[0];
    expect(staleSocket.url).toContain("lastSequence=999");
    act(() => {
      staleSocket.open();
      staleSocket.receive({
        type: "hello",
        version: 1,
        lastSequence: 999,
        latestSequence: 10,
        heartbeatSeconds: 20,
        topics: realtimeTopics(10),
      });
      staleSocket.receive({ type: "resync_required", reason: "cursor_ahead" });
      // Um complete fora de contrato depois de resync não pode consolidar o
      // cursor rejeitado.
      staleSocket.receive({ type: "replay_complete", lastSequence: 999 });
      staleSocket.close(1012, "resync_required");
    });

    await flushMicrotasks();
    expect(currentRealtime?.topicRevisions.orders).toBe(10);
    expect(currentRealtime?.resyncGeneration).toBe(1);
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    await flushMicrotasks();
    expect(FakeWebSocket.instances).toHaveLength(2);
    const repairedSocket = FakeWebSocket.instances[1];
    expect(repairedSocket.url).toContain("lastSequence=10");

    act(() => {
      completeHandshake(repairedSocket, {
        lastSequence: 10,
        latestSequence: 10,
      });
      repairedSocket.receive({
        version: 1,
        eventId: "future-event",
        sequence: 11,
        type: "order.updated",
        topic: "orders",
        occurredAt: "2026-08-08T10:00:11Z",
      });
    });
    expect(currentRealtime?.topicRevisions.orders).toBe(11);
    expect(currentRealtime?.unseenTopics.orders).toBe(true);
  });

  it("descarta confirmação de leitura iniciada antes do resync autoritativo", async () => {
    window.localStorage.setItem(
      "system-automation:realtime:v1:user-1",
      JSON.stringify({
        version: 1,
        sequence: 999,
        topicRevisions: { orders: 999, alerts: 0, communications: 0, history: 0 },
        readRevisions: { orders: 0, alerts: 0, communications: 0, history: 0 },
        seenEventIds: [],
      }),
    );
    let statusRequests = 0;
    let resolveRead: (() => void) | null = null;
    const markReadSpy = vi
      .spyOn(realtimeApi, "markRealtimeTopicRead")
      .mockImplementation(async (_token, _topic, throughSequence) => {
        if (throughSequence !== 999) return;
        await new Promise<void>((resolve) => {
          resolveRead = resolve;
        });
      });
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/tickets")) {
        return jsonResponse({
          ticket: `resync-ticket-${ticketCalls()}`,
          websocketUrl: "ws://api.test/api/v1/realtime/ws",
        });
      }
      if (url.includes("/status")) {
        statusRequests += 1;
        const latestSequence = statusRequests === 1 ? 999 : 10;
        const lastReadSequence = statusRequests === 1 ? 0 : 8;
        return jsonResponse({
          lastSequence: latestSequence,
          topics: {
            ...realtimeTopics(0),
            orders: {
              latestSequence,
              lastReadSequence,
              unseen: latestSequence - lastReadSequence,
            },
          },
        });
      }
      throw new Error(url);
    });

    renderProvider();
    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    const staleSocket = FakeWebSocket.instances[0];
    let markOutcome: Promise<unknown> | null = null;
    act(() => {
      markOutcome = currentRealtime
        ?.markTopicRead("orders", 999)
        .then(() => null, (error: unknown) => error) ?? null;
    });
    await flushMicrotasks();

    act(() => {
      staleSocket.open();
      sendHello(staleSocket, {
        lastSequence: 999,
        latestSequence: 10,
        topics: realtimeTopics(10),
      });
      staleSocket.receive({ type: "resync_required", reason: "cursor_ahead" });
      staleSocket.close(1012, "resync_required");
    });
    await waitFor(() => expect(currentRealtime?.resyncGeneration).toBe(1));
    expect(currentRealtime?.topicRevisions.orders).toBe(10);
    expect(currentRealtime?.unseenTopics.orders).toBe(true);

    let outcome: unknown;
    await act(async () => {
      resolveRead?.();
      outcome = await markOutcome;
    });
    expect(outcome).toMatchObject({ name: "AbortError" });
    expect(currentRealtime?.topicRevisions.orders).toBe(10);
    expect(currentRealtime?.unseenTopics.orders).toBe(true);

    await act(async () => {
      await currentRealtime?.markTopicRead("orders", 10);
    });
    expect(markReadSpy).toHaveBeenLastCalledWith(
      "access-token",
      "orders",
      10,
      expect.any(AbortSignal),
    );
    expect(currentRealtime?.unseenTopics.orders).toBe(false);
  });

  it("aplica backoff exponencial com jitter e teto de 30 segundos", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/status")) return jsonResponse(zeroStatus);
      if (url.includes("/tickets")) return jsonResponse({ detail: "indisponível" }, 503);
      throw new Error(url);
    });

    renderProvider();
    await flushMicrotasks();
    expect(ticketCalls()).toBe(1);

    for (const delay of [1_000, 2_000, 4_000, 8_000, 16_000, 30_000]) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(delay);
      });
      await flushMicrotasks();
    }

    expect(ticketCalls()).toBe(7);
    const delays = timeoutSpy.mock.calls
      .map(([, delay]) => Number(delay))
      .filter((delay) => Number.isFinite(delay));
    expect(delays).toEqual(expect.arrayContaining([1_000, 2_000, 4_000, 8_000, 16_000, 30_000]));
    expect(delays.every((delay) => delay <= 30_000)).toBe(true);
  });

  it("renova ticket após 4408 e trata 1013 como recuperável", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    let issuedTickets = 0;
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/status")) return jsonResponse(zeroStatus);
      if (url.includes("/tickets")) {
        issuedTickets += 1;
        return jsonResponse({
          ticket: `fresh-ticket-${issuedTickets}`,
          websocketUrl: "ws://api.test/api/v1/realtime/ws",
        });
      }
      throw new Error(url);
    });

    renderProvider();
    await flushMicrotasks();
    const expiredTicketSocket = FakeWebSocket.instances[0];
    expect(expiredTicketSocket.url).toContain("fresh-ticket-1");
    act(() => expiredTicketSocket.close(4408, "invalid_ticket"));
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    await flushMicrotasks();

    const backpressureSocket = FakeWebSocket.instances[1];
    expect(backpressureSocket.url).toContain("fresh-ticket-2");
    act(() => backpressureSocket.close(1013, "backpressure"));
    await act(async () => vi.advanceTimersByTimeAsync(2_000));
    await flushMicrotasks();
    expect(FakeWebSocket.instances[2].url).toContain("fresh-ticket-3");
  });

  it("não zera backoff em opens instáveis consecutivos", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    renderProvider();
    await flushMicrotasks();

    const firstSocket = FakeWebSocket.instances[0];
    act(() => {
      firstSocket.open();
      firstSocket.close(1013, "immediate_failure");
    });
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    await flushMicrotasks();
    expect(FakeWebSocket.instances).toHaveLength(2);

    const secondSocket = FakeWebSocket.instances[1];
    act(() => {
      secondSocket.open();
      secondSocket.close(1013, "immediate_failure");
    });
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    await flushMicrotasks();
    expect(FakeWebSocket.instances).toHaveLength(2);
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    await flushMicrotasks();
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it("ignora close atrasado de socket substituído", async () => {
    renderProvider();
    await flushMicrotasks();
    expect(FakeWebSocket.instances).toHaveLength(1);
    const oldSocket = FakeWebSocket.instances[0];
    act(() => completeHandshake(oldSocket));

    act(() => {
      oldSocket.beginDelayedClose(1013, "late_backpressure");
      currentRealtime?.requestReconnect();
    });
    await flushMicrotasks();
    expect(FakeWebSocket.instances).toHaveLength(2);
    const currentSocket = FakeWebSocket.instances[1];
    act(() => completeHandshake(currentSocket));
    expect(currentRealtime?.connectionState).toBe("connected");

    act(() => oldSocket.finishDelayedClose());
    await flushMicrotasks();
    expect(currentRealtime?.connectionState).toBe("connected");
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("não aplica watchdog de heartbeat durante replay válido e silencioso", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    renderProvider();
    await flushMicrotasks();
    const socket = FakeWebSocket.instances[0];
    act(() => {
      socket.open();
      sendHello(socket, {
        lastSequence: 0,
        latestSequence: 0,
        heartbeatSeconds: 5,
      });
    });

    await act(async () => vi.advanceTimersByTimeAsync(35_000));
    expect(socket.readyState).toBe(FakeWebSocket.OPEN);
    expect(FakeWebSocket.instances).toHaveLength(1);

    act(() => socket.receive({ type: "replay_complete", lastSequence: 0 }));
    await act(async () => vi.advanceTimersByTimeAsync(32_500));
    expect(socket.readyState).toBe(FakeWebSocket.CLOSED);
    expect(FakeWebSocket.instances).toHaveLength(1);
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    await flushMicrotasks();
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("deriva o watchdog do heartbeat negociado com margem para jitter", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    renderProvider();
    await flushMicrotasks();
    const socket = FakeWebSocket.instances[0];
    act(() =>
      completeHandshake(socket, {
        heartbeatSeconds: 60,
      }),
    );

    // 130s de silêncio ainda estão dentro de 2x heartbeat + margem.
    await act(async () => vi.advanceTimersByTimeAsync(130_000));
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(socket.readyState).toBe(FakeWebSocket.OPEN);

    // Após a margem, o watchdog fecha e a política recuperável reconecta.
    await act(async () => vi.advanceTimersByTimeAsync(21_000));
    await flushMicrotasks();
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("responde heartbeat e para sem retry em erro de autorização", async () => {
    vi.useFakeTimers();
    renderProvider();
    await flushMicrotasks();
    const socket = FakeWebSocket.instances[0];
    act(() => completeHandshake(socket));

    act(() => socket.receive({ type: "ping", sentAt: "2026-08-08T10:00:00Z" }));
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: "pong" }));

    act(() => socket.close(1008, "ticket inválido"));
    expect(currentRealtime?.connectionState).toBe("unauthorized");
    const attempts = ticketCalls();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(ticketCalls()).toBe(attempts);
  });

  it("restaura estado por usuário e o remove no clear de logout", async () => {
    window.localStorage.setItem(
      "system-automation:realtime:v1:user-1",
      JSON.stringify({
        version: 1,
        sequence: 7,
        topicRevisions: { orders: 7, alerts: 0, communications: 0, history: 0 },
        readRevisions: { orders: 3, alerts: 0, communications: 0, history: 0 },
        seenEventIds: ["persisted-event"],
      }),
    );

    renderProvider();
    await flushMicrotasks();
    expect(currentRealtime?.topicRevisions.orders).toBe(7);
    expect(currentRealtime?.unseenTopics.orders).toBe(true);

    act(() => currentRealtime?.clearPersistedState());
    expect(window.localStorage.getItem("system-automation:realtime:v1:user-1")).toBeNull();
    expect(currentRealtime?.unseenTopics.orders).toBe(false);
  });
});
