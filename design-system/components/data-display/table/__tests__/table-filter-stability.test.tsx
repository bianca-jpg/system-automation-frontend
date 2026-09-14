// Regressão do loop "Maximum update depth exceeded" no funil de filtros.
//
// Causa raiz (2026-07-15): os defaults `searchKeys/filters/actions = []` eram
// literais inline — identidade nova a cada render — e re-executavam o useMemo
// de filteredData; com filtro ativo, cada re-execução produz um array novo,
// o autoResetPageIndex do TanStack agenda resetPageIndex → setState → render,
// fechando o ciclo até o React cortar em 50 updates aninhados. Em jsdom o
// act() coalesce os updates e o loop não estoura, então o guard determinístico
// aqui é a ESTABILIDADE: re-renders do pai não podem re-rodar o filtro.
import { StrictMode, useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DynamicTable, type ColumnConfig } from "../table";

type Row = { id: string; name: string; status: string };

const DATA: Row[] = [
  { id: "1", name: "Ana", status: "in_analysis" },
  { id: "2", name: "Bruno", status: "approved" },
  { id: "3", name: "Carla", status: "rejected" },
  { id: "4", name: "Davi", status: "in_development" },
  { id: "5", name: "Eva", status: "completed" },
];

// Identidade ESTÁVEL de propósito: o alvo do teste são os defaults internos
// (searchKeys/actions) — um caller que recria `filters` a cada render re-roda
// o memo por dep legítima e invalidaria o assert.
const STATUS_FILTERS = [
  {
    key: "status",
    label: "Filtrar por status",
    options: [
      { value: "in_analysis", label: "Em Análise" },
      { value: "approved", label: "Aprovada" },
      { value: "in_development", label: "Em Desenvolvimento" },
      { value: "completed", label: "Concluída" },
      { value: "rejected", label: "Reprovada" },
    ],
  },
];

describe("DynamicTable filter stability", () => {
  test("re-renders do pai não re-executam o filtro quando nada mudou", async () => {
    const user = userEvent.setup();
    const filterAccessor = vi.fn((item: Row) => item.status);
    const columns: ColumnConfig<Row>[] = [
      { key: "name", label: "Nome" },
      { key: "status", label: "Status", filterAccessor },
    ];

    let forceParentRender: () => void = () => {};
    function Harness() {
      const [, setTick] = useState(0);
      forceParentRender = () => setTick((t) => t + 1);
      return (
        <DynamicTable
          data={DATA}
          columns={columns}
          rowKey={(row) => row.id}
          filters={STATUS_FILTERS}
        />
      );
    }

    render(<Harness />);

    await user.click(screen.getByRole("button", { name: /^Filtros/ }));
    await user.click(screen.getByRole("menuitemcheckbox", { name: "Aprovada" }));
    await user.keyboard("{Escape}");

    const callsAfterFilter = filterAccessor.mock.calls.length;
    expect(callsAfterFilter).toBeGreaterThan(0);

    for (let i = 0; i < 3; i++) {
      act(() => forceParentRender());
    }

    expect(filterAccessor.mock.calls.length).toBe(callsAfterFilter);
  });

  test("gesto do filtro sob StrictMode não dispara Maximum update depth", async () => {
    const user = userEvent.setup();
    const errors: string[] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args.map((a) => String((a as Error)?.message ?? a)).join(" "));
      origError(...args);
    };

    const columns: ColumnConfig<Row>[] = [
      { key: "name", label: "Nome" },
      { key: "status", label: "Status" },
    ];

    try {
      render(
        <StrictMode>
          <DynamicTable
            data={DATA}
            columns={columns}
            rowKey={(row) => row.id}
            filters={STATUS_FILTERS}
          />
        </StrictMode>,
      );

      await user.click(screen.getByRole("button", { name: /^Filtros/ }));
      await user.click(
        screen.getByRole("menuitemcheckbox", { name: "Aprovada" }),
      );
      await user.keyboard("{Escape}");
      await user.click(screen.getByRole("button", { name: /^Filtros/ }));
      await user.click(
        screen.getByRole("menuitemcheckbox", { name: "Reprovada" }),
      );
      await user.keyboard("{Escape}");
    } finally {
      console.error = origError;
    }

    expect(errors.filter((e) => e.includes("Maximum update depth"))).toEqual(
      [],
    );
  }, 30000);
});
