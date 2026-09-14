// Login é exclusivamente via SSO Microsoft Entra ID (ver auth.ts) — não há
// mais formulário de e-mail/senha, cadastro ou recuperação neste app. Cobre o
// botão de SSO (callbackUrl padrão, callbackUrl da query, proteção contra
// open redirect, erro AccessDenied), a mensagem de sessão expirada e o
// tratamento de `forceSignOut=api` — comportamento herdado do antigo
// `useLoginForm`, agora absorvido diretamente pelo componente.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginCopy } from "@/features/auth/config/login-copy";
import { automation_PANEL_ACCESS_DENIED_MESSAGE } from "@/shared/config/auth/automation-panel-roles";
import { routes } from "@/shared/config/routes";

const { useSessionMock, signInMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
  signInMock: vi.fn(),
}));
vi.mock("next-auth/react", () => ({ useSession: useSessionMock, signIn: signInMock }));

const { routerPushMock, routerReplaceMock, routerRefreshMock, searchParamsMock } = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  routerReplaceMock: vi.fn(),
  routerRefreshMock: vi.fn(),
  searchParamsMock: vi.fn(() => new URLSearchParams()),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock, replace: routerReplaceMock, refresh: routerRefreshMock }),
  useSearchParams: searchParamsMock,
}));

const fetchMock = vi.fn();

import { LoginPage } from "./LoginPage";

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  global.fetch = fetchMock as unknown as typeof fetch;
  useSessionMock.mockReturnValue({ data: null, status: "unauthenticated" });
  searchParamsMock.mockReturnValue(new URLSearchParams());
});

describe("LoginPage — regressão: só SSO", () => {
  it("mostra apenas o botão Microsoft, sem campo de senha, cadastro ou recuperação", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: "Entrar com Microsoft" })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Digite seu login")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Digite sua senha")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Entrar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cadastre-se" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Esqueceu a senha?" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("LoginPage — login via Microsoft", () => {
  it("aciona o signIn do provider Microsoft com o callbackUrl padrão", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "Entrar com Microsoft" }));

    expect(signInMock).toHaveBeenCalledWith("microsoft-entra-id", {
      callbackUrl: routes.visaoGeral,
    });
  });

  it("usa o callbackUrl da query string quando é um caminho interno válido", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams({ callbackUrl: "/pedidos" }));
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "Entrar com Microsoft" }));

    expect(signInMock).toHaveBeenCalledWith("microsoft-entra-id", { callbackUrl: "/pedidos" });
  });

  it("ignora callbackUrl externo e cai no padrão (proteção contra open redirect)", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams({ callbackUrl: "https://evil.example" }));
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "Entrar com Microsoft" }));

    expect(signInMock).toHaveBeenCalledWith("microsoft-entra-id", {
      callbackUrl: routes.visaoGeral,
    });
  });

  it("mostra a mensagem de acesso negado quando error=AccessDenied", () => {
    searchParamsMock.mockReturnValue(new URLSearchParams({ error: "AccessDenied" }));
    render(<LoginPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(automation_PANEL_ACCESS_DENIED_MESSAGE);
  });

  it("mostra uma mensagem genérica para outros códigos de erro", () => {
    searchParamsMock.mockReturnValue(new URLSearchParams({ error: "Configuration" }));
    render(<LoginPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível entrar com a conta Microsoft. Tente novamente.",
    );
  });
});

describe("LoginPage — erro/sessão vindos da URL", () => {
  it("error=session_expired sem sessão ativa: mostra a mensagem e limpa a URL (sem forçar signout na API)", async () => {
    useSessionMock.mockReturnValue({ data: null, status: "unauthenticated" });
    searchParamsMock.mockReturnValue(new URLSearchParams({ error: "session_expired" }));
    render(<LoginPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(loginCopy.sessionExpired);
    await waitFor(() => expect(routerReplaceMock).toHaveBeenCalledWith("/login"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("error=session_expired COM sessão ativa: força signout na API e depois limpa a URL", async () => {
    useSessionMock.mockReturnValue({
      data: { user: { email: "gestor@example.com" } },
      status: "authenticated",
    });
    searchParamsMock.mockReturnValue(new URLSearchParams({ error: "session_expired" }));
    render(<LoginPage />);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/force-api-signout",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    await waitFor(() => expect(routerReplaceMock).toHaveBeenCalledWith("/login"));
    expect(routerRefreshMock).toHaveBeenCalled();
  });

  it("forceSignOut=api: força signout na API e limpa a URL, preservando callbackUrl", async () => {
    searchParamsMock.mockReturnValue(
      new URLSearchParams("forceSignOut=api&callbackUrl=%2Fpedidos"),
    );
    render(<LoginPage />);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/force-api-signout",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    await waitFor(() =>
      expect(routerReplaceMock).toHaveBeenCalledWith("/login?callbackUrl=%2Fpedidos"),
    );
  });
});
