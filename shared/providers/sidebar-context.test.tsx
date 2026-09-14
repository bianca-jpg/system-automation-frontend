// Regressão: a sidebar recolhida "abria e fechava" a cada reload. A preferência
// vivia em localStorage, que o servidor não enxerga, então o HTML saía sempre
// expandido e o `useSyncExternalStore` só recolhia depois de hidratar.
//
// A correção move a preferência para cookie e passa o valor lido no servidor
// como `defaultCollapsed`. O que estes testes fixam é justamente o que elimina
// o flash: o PRIMEIRO render já sai no estado certo.
import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import {
  SIDEBAR_COLLAPSED_COOKIE,
  SidebarProvider,
  useSidebar,
} from "./sidebar-context";

function Probe() {
  const { isSidebarCollapsed, toggleSidebar } = useSidebar();

  return (
    <button type="button" onClick={toggleSidebar}>
      {isSidebarCollapsed ? "recolhida" : "expandida"}
    </button>
  );
}

function clearCookie() {
  document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=; path=/; max-age=0`;
}

afterEach(clearCookie);

describe("SidebarProvider", () => {
  it("o HTML do servidor já sai recolhido quando o cookie diz recolhido", () => {
    // Este é o teste que fixa a ausência de flash. O servidor não tem acesso a
    // `document.cookie`: o valor chega por `defaultCollapsed`, lido do cookie no
    // layout. Se o HTML sair "expandida", a sidebar volta a piscar no reload.
    const html = renderToString(
      <SidebarProvider defaultCollapsed>
        <Probe />
      </SidebarProvider>,
    );

    expect(html).toContain("recolhida");
    expect(html).not.toContain("expandida");
  });

  it("o HTML do servidor sai expandido quando não há cookie", () => {
    const html = renderToString(
      <SidebarProvider>
        <Probe />
      </SidebarProvider>,
    );

    expect(html).toContain("expandida");
  });

  it("primeiro render do cliente sai expandido quando não há preferência salva", () => {
    render(
      <SidebarProvider>
        <Probe />
      </SidebarProvider>,
    );

    expect(screen.getByRole("button")).toHaveTextContent("expandida");
  });

  it("alternar grava a preferência em cookie, para o servidor ler no próximo request", () => {
    render(
      <SidebarProvider>
        <Probe />
      </SidebarProvider>,
    );

    act(() => {
      screen.getByRole("button").click();
    });

    expect(document.cookie).toContain(`${SIDEBAR_COLLAPSED_COOKIE}=true`);
    expect(screen.getByRole("button")).toHaveTextContent("recolhida");

    act(() => {
      screen.getByRole("button").click();
    });

    expect(document.cookie).toContain(`${SIDEBAR_COLLAPSED_COOKIE}=false`);
    expect(screen.getByRole("button")).toHaveTextContent("expandida");
  });

  it("lê o cookie já existente quando não recebe defaultCollapsed", () => {
    document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=true; path=/`;

    render(
      <SidebarProvider>
        <Probe />
      </SidebarProvider>,
    );

    expect(screen.getByRole("button")).toHaveTextContent("recolhida");
  });
});
