import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useQueryClient } from "@tanstack/react-query";
import { QueryProvider } from "./QueryProvider";

function DefaultsProbe() {
  const queryClient = useQueryClient();
  const { queries } = queryClient.getDefaultOptions();
  return (
    <dl>
      <dt>retry</dt>
      <dd data-testid="retry">{String(queries?.retry)}</dd>
      <dt>refetchOnWindowFocus</dt>
      <dd data-testid="refetch-on-focus">{String(queries?.refetchOnWindowFocus)}</dd>
      <dt>refetchOnReconnect</dt>
      <dd data-testid="refetch-on-reconnect">{String(queries?.refetchOnReconnect)}</dd>
      <dt>staleTime</dt>
      <dd data-testid="stale-time">{String(queries?.staleTime)}</dd>
    </dl>
  );
}

describe("QueryProvider", () => {
  it("renderiza os filhos", () => {
    render(
      <QueryProvider>
        <span>conteúdo filho</span>
      </QueryProvider>,
    );

    expect(screen.getByText("conteúdo filho")).toBeInTheDocument();
  });

  it("expõe um QueryClient cujos defaults espelham o comportamento atual do useLatestResource", () => {
    render(
      <QueryProvider>
        <DefaultsProbe />
      </QueryProvider>,
    );

    // Sem retry: hoje uma falha vira erro visível já na primeira tentativa.
    expect(screen.getByTestId("retry")).toHaveTextContent("false");
    // Sem refetch ao focar a janela: comportamento inexistente hoje.
    expect(screen.getByTestId("refetch-on-focus")).toHaveTextContent("false");
    // Sem refetch ao reconectar: o realtime cuida disso via resyncGeneration.
    expect(screen.getByTestId("refetch-on-reconnect")).toHaveTextContent("false");
    // staleTime diferente de zero para não disparar rajadas em remontagem de rota.
    expect(screen.getByTestId("stale-time")).toHaveTextContent("30000");
  });
});
