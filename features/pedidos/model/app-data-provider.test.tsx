// Estes testes existem por causa de uma entrega revertida. A carga por rota foi
// tentada antes com o disparo num COMPONENTE FILHO do provider — e como o React
// descarrega os efeitos dos filhos ANTES dos do pai, o fetch saía antes do
// `setAuthToken`, tomava 401, e o `apiFetch` traduz 401 em signOut: loop de
// login em toda rota. O segundo defeito foi falha de carga não ter superfície.
//
// O que estes testes guardam: (1) nenhuma requisição sai sem Bearer instalado;
// (2) só a rota atual busca o que consome; (3) falha vira erro visível e
// retentável, não silêncio.
import { useEffect, type ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { setAuthTokenMock, apiFetchMock, pathnameRef, realtimeRef } = vi.hoisted(() => ({
  setAuthTokenMock: vi.fn(),
  apiFetchMock: vi.fn(),
  pathnameRef: { atual: "/pedidos" },
  realtimeRef: {
    ordersRevision: 0,
    resyncGeneration: 0,
  },
}));

// Registra a ORDEM real: cada chamada de apiFetch anota se o token já havia
// sido instalado naquele instante. É isso que pega a regressão de ordem.
const chamadas: { rota: string; tokenInstalado: boolean }[] = [];

// Mock parcial: `apiErrorMessage` (usado pelo hook novo da evolução) importa
// `ApiRequestError` deste módulo para checagem de `instanceof` em runtime —
// precisa acompanhar o real via `importOriginal`, senão vira `undefined` e
// `instanceof` lança. `setAuthToken`/`apiFetch` continuam substituídos pelos
// espiões deste arquivo.
vi.mock("@/lib/api/http-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/http-client")>();
  return {
    ...actual,
    setAuthToken: (t: string | null) => {
      setAuthTokenMock(t);
      return t;
    },
    apiFetch: (rota: string) => {
      chamadas.push({ rota, tokenInstalado: setAuthTokenMock.mock.calls.length > 0 });
      return apiFetchMock(rota);
    },
  };
});

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { accessToken: "token-de-teste" } },
    status: "authenticated",
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameRef.atual,
}));

vi.mock("@/features/realtime", () => ({
  useRealtime: () => ({
    topicRevisions: {
      orders: realtimeRef.ordersRevision,
      alerts: 0,
      communications: 0,
      history: 0,
    },
    resyncGeneration: realtimeRef.resyncGeneration,
  }),
}));

import { AppDataProvider, useAppData } from "./app-data-provider";
import { apiFetch } from "@/lib/api/http-client";

function Sonda() {
  const {
    erroDeCarga,
    overviewLoading,
    overviewError,
    overviewRefreshError,
    resumo,
    tentarNovamenteRecursos,
  } = useAppData();
  return (
    <div>
      <span data-testid="erro">{erroDeCarga ?? "sem-erro"}</span>
      <span data-testid="overview-loading">{overviewLoading ? "carregando" : "pronto"}</span>
      <span data-testid="overview-error">{overviewError ?? "sem-erro"}</span>
      <span data-testid="overview-refresh-error">{overviewRefreshError ?? "sem-erro"}</span>
      <span data-testid="resumo-presente">{resumo ? "sim" : "não"}</span>
      <button type="button" onClick={tentarNovamenteRecursos}>
        Tentar novamente
      </button>
    </div>
  );
}

function ChildProtectedRequest() {
  useEffect(() => {
    void apiFetch("/api/v1/pedidos/produtos?stage=aguardando");
  }, []);
  return <span>filho montado</span>;
}

function rotasChamadas(): string[] {
  return chamadas.map((c) => c.rota);
}

// Client novo por teste, sem retry: um caso não pode herdar cache do
// anterior, e a ausência de retry preserva o mesmo comportamento imediato de
// falha que `useLatestResource` sempre teve.
let queryClient: QueryClient;

function wrap(node: ReactNode) {
  return <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>;
}

beforeEach(() => {
  chamadas.length = 0;
  setAuthTokenMock.mockClear();
  apiFetchMock.mockReset();
  apiFetchMock.mockResolvedValue([]);
  pathnameRef.atual = "/pedidos";
  realtimeRef.ordersRevision = 0;
  realtimeRef.resyncGeneration = 0;
  sessionStorage.clear();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
});

describe("AppDataProvider — carga por rota", () => {
  it("NENHUMA requisição sai antes do Bearer ser instalado", async () => {
    render(wrap(
      <AppDataProvider>
        <Sonda />
      </AppDataProvider>,
    ));

    await waitFor(() => expect(chamadas.length).toBeGreaterThan(0));

    // Se alguma sair com token=false, volta o 401 → signOut → loop de login.
    const semToken = chamadas.filter((c) => !c.tokenInstalado);
    expect(semToken).toEqual([]);
  });

  it("só monta um consumidor filho depois de instalar o token da sessão", async () => {
    render(wrap(
      <AppDataProvider>
        <ChildProtectedRequest />
      </AppDataProvider>,
    ));

    await screen.findByText("filho montado");
    await waitFor(() => expect(
      chamadas.some(call => call.rota.includes("stage=aguardando")),
    ).toBe(true));
    const childCall = chamadas.find(call => call.rota.includes("stage=aguardando"));
    expect(childCall).toEqual(expect.objectContaining({ tokenInstalado: true }));
  });

  it("em /parametros deixa a página buscar seus parâmetros paginados e não busca recursos globais", async () => {
    pathnameRef.atual = "/parametros";

    render(wrap(
      <AppDataProvider>
        <Sonda />
      </AppDataProvider>,
    ));

    await waitFor(() => expect(setAuthTokenMock).toHaveBeenCalled());

    const rotas = rotasChamadas();
    expect(rotas.some((r) => r.includes("parametros"))).toBe(false);
    expect(rotas.some((r) => r.includes("/resumo"))).toBe(false);
    expect(rotas.some((r) => r.includes("/comunicacoes"))).toBe(false);
    expect(rotas.some((r) => r.includes("evolucao-faturamento"))).toBe(false);
  });

  it("em /visao-geral busca evolução, e NÃO busca parâmetros", async () => {
    pathnameRef.atual = "/visao-geral";

    render(wrap(
      <AppDataProvider>
        <Sonda />
      </AppDataProvider>,
    ));

    await waitFor(() =>
      expect(rotasChamadas().some((r) => r.includes("evolucao-faturamento"))).toBe(true),
    );
    expect(rotasChamadas().some((r) => r.includes("/parametros"))).toBe(false);
  });

  it("não busca pedidos nem parâmetros de página fora da rota de pedidos", async () => {
    pathnameRef.atual = "/parametros";

    render(wrap(
      <AppDataProvider>
        <Sonda />
      </AppDataProvider>,
    ));

    await waitFor(() => expect(setAuthTokenMock).toHaveBeenCalled());
    expect(rotasChamadas().some((r) => r.includes("parametros"))).toBe(false);
    expect(rotasChamadas().some((r) => r.startsWith("/api/v1/pedidos?"))).toBe(false);
  });

  it("falha de recurso da rota vira erro visível, e o retry refaz a busca", async () => {
    const user = userEvent.setup();
    apiFetchMock.mockImplementation((rota: string) =>
      rota.includes("/resumo")
        ? Promise.reject(new Error("resumo fora do ar"))
        : Promise.resolve([]),
    );

    render(wrap(
      <AppDataProvider>
        <Sonda />
      </AppDataProvider>,
    ));

    await waitFor(() =>
      expect(screen.getByTestId("erro")).toHaveTextContent("resumo fora do ar"),
    );

    const antes = rotasChamadas().filter((r) => r.includes("/resumo")).length;
    await new Promise(resolve => window.setTimeout(resolve, 50));
    expect(rotasChamadas().filter((r) => r.includes("/resumo"))).toHaveLength(antes);
    apiFetchMock.mockResolvedValue({ erpBilling: {}, erpCount: {}, statsByChannel: {} });

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    await waitFor(() =>
      expect(rotasChamadas().filter((r) => r.includes("/resumo")).length).toBeGreaterThan(antes),
    );
    await waitFor(() => expect(screen.getByTestId("erro")).toHaveTextContent("sem-erro"));
  });

  it("o mesmo recurso não é buscado duas vezes na mesma rota", async () => {
    const { rerender } = render(wrap(
      <AppDataProvider>
        <Sonda />
      </AppDataProvider>,
    ));

    await waitFor(() => expect(rotasChamadas().some((r) => r.includes("/resumo"))).toBe(true));

    rerender(wrap(
      <AppDataProvider>
        <Sonda />
      </AppDataProvider>,
    ));

    await waitFor(() => {
      expect(rotasChamadas().filter((r) => r.includes("/resumo")).length).toBe(1);
    });
  });

  it("usa o resumo enxuto e nunca solicita o mapa global de estoque", async () => {
    render(wrap(
      <AppDataProvider>
        <Sonda />
      </AppDataProvider>,
    ));

    await waitFor(() => expect(rotasChamadas().some((r) => r.includes("/resumo"))).toBe(true));
    const rotaResumo = rotasChamadas().find((r) => r.includes("/resumo"));
    expect(rotaResumo).toBe("/api/v1/pedidos/resumo");
    expect(rotaResumo).not.toContain("includeStock=true");
  });

  it("mantém o último dashboard bom durante falha de refresh em background", async () => {
    pathnameRef.atual = "/visao-geral";
    const resumo = {
      stockByCode: { Todos: {}, Franquia: {}, Multimarca: {} },
      erpBilling: { Todos: 10, Franquia: 10, Multimarca: 0 },
      erpCount: { Todos: 1, Franquia: 1, Multimarca: 0 },
      statsByChannel: {},
    };
    apiFetchMock.mockImplementation((rota: string) => Promise.resolve(
      rota.includes("/resumo") ? resumo : [],
    ));

    const { rerender } = render(wrap(
      <AppDataProvider>
        <Sonda />
      </AppDataProvider>,
    ));
    await waitFor(() => expect(screen.getByTestId("overview-loading")).toHaveTextContent("pronto"));
    expect(screen.getByTestId("resumo-presente")).toHaveTextContent("sim");

    const chamadasAntes = chamadas.length;
    apiFetchMock.mockRejectedValue(new Error("refresh fora do ar"));
    realtimeRef.ordersRevision = 1;
    rerender(wrap(
      <AppDataProvider>
        <Sonda />
      </AppDataProvider>,
    ));

    await waitFor(() => expect(chamadas.length).toBeGreaterThan(chamadasAntes));
    await waitFor(() => {
      expect(screen.getByTestId("overview-refresh-error")).toHaveTextContent("refresh fora do ar");
    });
    expect(screen.getByTestId("overview-loading")).toHaveTextContent("pronto");
    expect(screen.getByTestId("overview-error")).toHaveTextContent("sem-erro");
    expect(screen.getByTestId("resumo-presente")).toHaveTextContent("sim");
  });

  it("refaz o resumo ao voltar à rota depois de uma revisão perdida", async () => {
    pathnameRef.atual = "/visao-geral";
    apiFetchMock.mockImplementation((rota: string) => Promise.resolve(
      rota.includes("/resumo")
        ? { stockByCode: {}, erpBilling: {}, erpCount: {}, statsByChannel: {} }
        : [],
    ));
    const { rerender } = render(wrap(
      <AppDataProvider>
        <Sonda />
      </AppDataProvider>,
    ));
    await waitFor(() => expect(screen.getByTestId("overview-loading")).toHaveTextContent("pronto"));
    const initialResumoCalls = rotasChamadas().filter((rota) => rota.includes("/resumo")).length;

    pathnameRef.atual = "/usuarios";
    rerender(wrap(<AppDataProvider><Sonda /></AppDataProvider>));
    realtimeRef.ordersRevision = 4;
    rerender(wrap(<AppDataProvider><Sonda /></AppDataProvider>));
    expect(rotasChamadas().filter((rota) => rota.includes("/resumo"))).toHaveLength(initialResumoCalls);

    pathnameRef.atual = "/visao-geral";
    rerender(wrap(<AppDataProvider><Sonda /></AppDataProvider>));
    await waitFor(() => {
      expect(rotasChamadas().filter((rota) => rota.includes("/resumo")).length)
        .toBeGreaterThan(initialResumoCalls);
    });
  });
});
