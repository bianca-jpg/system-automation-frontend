// Plan 38-3 Task 2 — composeStories smoke test (FE-QUAL-10).
// One test per exported story; enumerates them automatically so new stories get
// coverage for free. Pure render smoke — interaction tests are Playwright (Plan 38-4).
//
// Assertion shape: render() returning (i.e. not throwing) is the smoke contract.
// Some stories deliberately render null (caps-lock-warning Hidden, icon-count-badge
// ZeroHidden) — those are legitimate states; `container` is always a Node, so the
// test passes when render completes. Using `expect(container).toBeInstanceOf(Node)`
// asserts the smoke happened without imposing visual content.
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react";

const { virtualRange, stableMeasureElement } = vi.hoisted(() => ({
  virtualRange: { start: 0, end: null as number | null },
  // O virtualizer real expõe `measureElement` como método de instância, com
  // identidade estável entre renders. O mock precisa refletir isso, senão o
  // `React.memo` da linha nunca segura e o teste mede o mock, não o componente.
  stableMeasureElement: () => undefined,
}));

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({
    count,
    estimateSize,
  }: {
    count: number;
    estimateSize: () => number;
  }) => {
    const size = estimateSize();
    const start = Math.min(virtualRange.start, count);
    const end = Math.min(virtualRange.end ?? count, count);
    return {
      getVirtualItems: () =>
        Array.from({ length: Math.max(0, end - start) }, (_, offset) => ({
          index: start + offset,
          key: start + offset,
          start: (start + offset) * size,
          end: (start + offset + 1) * size,
          size,
        })),
      getTotalSize: () => count * size,
      measureElement: stableMeasureElement,
    };
  },
}));

import * as stories from "../table.stories";
import {
  DynamicTable,
  shouldIgnoreRowClick,
  type ColumnConfig,
} from "../table";

const composed = composeStories(stories);

beforeEach(() => {
  virtualRange.start = 0;
  virtualRange.end = null;
});

describe("Table (composeStories smoke)", () => {
  Object.entries(composed).forEach(([name, Story]) => {
    test(`renders ${name} without errors`, () => {
      const { container } = render(<Story />);
      expect(container).toBeInstanceOf(Node);
    });
  });
});

describe("DynamicTable footer", () => {
  test("passes the internally filtered count to a custom footer row", () => {
    type Row = { id: string; name: string };
    const columns: ColumnConfig<Row>[] = [{ key: "name", label: "Nome" }];

    render(
      <DynamicTable
        data={[
          { id: "1", name: "Ana" },
          { id: "2", name: "Bruno" },
          { id: "3", name: "Carla" },
        ]}
        columns={columns}
        searchKeys={["name"]}
        searchValue="ana"
        rowKey={(row) => row.id}
        footerRow={({ filteredCount, totalCount }) => (
          <span>
            Rodapé: {filteredCount}/{totalCount}
          </span>
        )}
      />,
    );

    expect(screen.getByText("Mostrando 1 registro")).toBeInTheDocument();
    expect(screen.getByText("Rodapé: 1/3")).toBeInTheDocument();
  });
});

describe("DynamicTable toolbar", () => {
  const columns: ColumnConfig<{ id: string; name: string }>[] = [
    { key: "name", label: "Nome" },
  ];

  test("does not announce zero records while the initial skeleton is visible", () => {
    render(<DynamicTable data={[]} columns={columns} searchValue="" loading />);

    expect(screen.getByText("Carregando registros...")).toBeInTheDocument();
    expect(screen.queryByText("Mostrando 0 registros")).not.toBeInTheDocument();
  });

  test("renders custom actions beside the native filters", () => {
    render(
      <DynamicTable
        data={[]}
        columns={columns}
        searchValue=""
        toolbarActions={<button type="button">Período</button>}
        filters={[
          {
            key: "name",
            label: "Filtrar por nome",
            options: [{ value: "Ana", label: "Ana" }],
          },
        ]}
      />,
    );

    const periodAction = screen.getByRole("button", { name: "Período" });
    const filtersAction = screen.getByRole("button", { name: "Filtros" });

    expect(
      periodAction.compareDocumentPosition(filtersAction) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test("opens the filter menu and selects an option without a render loop", async () => {
    const user = userEvent.setup();
    const onActiveFiltersChange = vi.fn();

    render(
      <DynamicTable
        data={[{ id: "1", name: "Ana" }]}
        columns={columns}
        filters={[
          {
            key: "name",
            label: "Filtrar por nome",
            options: [{ value: "Ana", label: "Ana" }],
          },
        ]}
        onActiveFiltersChange={onActiveFiltersChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Filtros" }));
    await user.click(screen.getByRole("menuitemcheckbox", { name: "Ana" }));
    await user.keyboard("{Escape}");

    expect(onActiveFiltersChange).toHaveBeenLastCalledWith({ name: ["Ana"] });
    expect(document.body.style.pointerEvents).not.toBe("none");
  });

  test("exposes an accessible search name and removable filter controls", async () => {
    const user = userEvent.setup();

    render(
      <DynamicTable
        data={[{ id: "1", name: "Ana" }]}
        columns={columns}
        searchKeys={["name"]}
        searchLabel="Buscar pessoas"
        searchMaxLength={120}
        filters={[
          {
            key: "name",
            label: "Filtrar por nome",
            options: [{ value: "Ana", label: "Ana" }],
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("searchbox", { name: "Buscar pessoas" }),
    ).toHaveAttribute("maxlength", "120");

    await user.click(screen.getByRole("button", { name: "Filtros" }));
    await user.click(screen.getByRole("menuitemcheckbox", { name: "Ana" }));
    await user.keyboard("{Escape}");

    const removeFilter = screen.getByRole("button", {
      name: "Remover filtro Ana",
    });
    await user.click(removeFilter);

    expect(
      screen.queryByRole("button", { name: "Remover filtro Ana" }),
    ).not.toBeInTheDocument();
  });
});

describe("DynamicTable virtualization", () => {
  test("hides layout spacer rows without changing the accessible row count", () => {
    virtualRange.start = 1;
    virtualRange.end = 3;
    const columns: ColumnConfig<{ id: string; name: string }>[] = [
      { key: "name", label: "Nome" },
    ];

    const { container } = render(
      <DynamicTable
        data={[
          { id: "1", name: "Ana" },
          { id: "2", name: "Bruno" },
          { id: "3", name: "Carla" },
          { id: "4", name: "Diego" },
        ]}
        columns={columns}
        rowKey={(row) => row.id}
      />,
    );

    const table = screen.getByRole("table");
    expect(table).toHaveAttribute("aria-rowcount", "5");
    expect(
      container.querySelectorAll('tbody tr[aria-hidden="true"]'),
    ).toHaveLength(2);
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });
});

describe("DynamicTable row actions", () => {
  const asRowClickEvent = (
    target: Element,
    currentTarget: HTMLTableRowElement,
  ) =>
    ({ target, currentTarget }) as unknown as Parameters<
      typeof shouldIgnoreRowClick
    >[0];

  test("allows a click on regular row content", () => {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    row.append(cell);

    expect(shouldIgnoreRowClick(asRowClickEvent(cell, row))).toBe(false);
  });

  test("ignores interactive content inside the row", () => {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    const button = document.createElement("button");
    cell.append(button);
    row.append(cell);

    expect(shouldIgnoreRowClick(asRowClickEvent(button, row))).toBe(true);
  });

  test("ignores menu events bubbling from a portal outside the row", () => {
    const row = document.createElement("tr");
    const menuItem = document.createElement("div");
    menuItem.setAttribute("role", "menuitem");

    expect(shouldIgnoreRowClick(asRowClickEvent(menuItem, row))).toBe(true);
  });

  test("only makes rows interactive when onRowClick is provided", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    const columns: ColumnConfig<{ id: string; name: string }>[] = [
      { key: "name", label: "Nome" },
    ];
    const data = [{ id: "candidate-1", name: "Ana" }];

    const { container, rerender } = render(
      <DynamicTable data={data} columns={columns} rowKey={(row) => row.id} />,
    );

    await waitFor(() => {
      expect(
        container.querySelector('tbody tr[data-index="0"]'),
      ).toBeInTheDocument();
    });
    const staticRow = container.querySelector(
      'tbody tr[data-index="0"]',
    ) as HTMLTableRowElement;
    expect(staticRow).not.toHaveAttribute("tabindex");
    expect(staticRow).not.toHaveClass("cursor-pointer");

    rerender(
      <DynamicTable
        data={data}
        columns={columns}
        rowKey={(row) => row.id}
        getRowLabel={(row) => row.name}
        onRowClick={onRowClick}
      />,
    );

    await waitFor(() => {
      expect(
        container.querySelector('tbody tr[data-index="0"]'),
      ).toHaveAttribute("tabindex", "0");
    });
    const interactiveRow = container.querySelector(
      'tbody tr[data-index="0"]',
    ) as HTMLTableRowElement;
    expect(interactiveRow).toHaveAttribute("tabindex", "0");
    expect(interactiveRow).toHaveAttribute("aria-label", "Abrir registro Ana");
    expect(interactiveRow).toHaveAttribute("aria-keyshortcuts", "Enter Space");

    interactiveRow.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  test("exposes sorting state and supports keyboard column resizing", async () => {
    const user = userEvent.setup();
    const columns: ColumnConfig<{ id: string; name: string }>[] = [
      { key: "name", label: "Nome", sortable: true, minWidth: "100px" },
    ];

    render(
      <DynamicTable
        data={[{ id: "1", name: "Ana" }]}
        columns={columns}
        resizableColumns
      />,
    );

    const sortButton = screen.getByRole("button", { name: "Nome" });
    const header = sortButton.closest("th");
    expect(header).toHaveAttribute("aria-sort", "none");

    await user.click(sortButton);
    expect(header).toHaveAttribute("aria-sort", "ascending");

    const resizeButton = screen.getByRole("button", {
      name: /Redimensionar coluna Nome/,
    });
    // Column widths are now applied via CSS custom properties on the <table>
    // (each cell reads calc(var(--header-<id>-size) * 1px)), so the header's own
    // width is a constant calc() string. Read the size variable instead.
    const tableEl = screen.getByRole("table");
    const sizeBefore = Number.parseFloat(
      tableEl.style.getPropertyValue("--header-name-size"),
    );
    resizeButton.focus();
    await user.keyboard("{ArrowRight}");
    const sizeAfter = Number.parseFloat(
      tableEl.style.getPropertyValue("--header-name-size"),
    );
    expect(sizeAfter).toBeGreaterThan(sizeBefore);
  });
});

describe("DynamicTable sorting", () => {
  type Row = {
    id: string;
    name: string;
    collaborator: { status: string } | null;
  };

  const data: Row[] = [
    { id: "1", name: "Ana", collaborator: { status: "Desligado" } },
    { id: "2", name: "Bruno", collaborator: null },
    { id: "3", name: "Carla", collaborator: { status: "Ativo" } },
  ];

  const rowNames = (container: HTMLElement) =>
    Array.from(container.querySelectorAll("tbody tr[data-index]")).map(
      (row) => row.querySelector("td")?.textContent,
    );

  test("supports controlled manual sorting without reordering a server page", async () => {
    const user = userEvent.setup();
    const onSortingChange = vi.fn();
    const serverPage = [data[1], data[0], data[2]];
    const { container } = render(
      <DynamicTable
        data={serverPage}
        columns={[{ key: "name", label: "Nome" }]}
        rowKey={(row) => row.id}
        sorting={[{ id: "name", desc: true }]}
        onSortingChange={onSortingChange}
        manualSorting
      />,
    );

    expect(screen.getByRole("button", { name: "Nome" }).closest("th"))
      .toHaveAttribute("aria-sort", "descending");
    expect(rowNames(container)).toEqual(["Bruno", "Ana", "Carla"]);

    await user.click(screen.getByRole("button", { name: "Nome" }));
    expect(onSortingChange).toHaveBeenCalledTimes(1);
    expect(rowNames(container)).toEqual(["Bruno", "Ana", "Carla"]);
  });

  test("hides the local count when a server-paginated footer is authoritative", () => {
    render(
      <DynamicTable
        data={[{ id: "1", name: "Ana" }]}
        columns={columns}
        hideResultsCount
        footerRow={<span>Mostrando 1 de 30 usuários</span>}
      />,
    );

    expect(screen.queryByText("Mostrando 1 registro")).not.toBeInTheDocument();
    expect(screen.getByText("Mostrando 1 de 30 usuários")).toBeInTheDocument();
  });

  test("sorts a computed column by its filterAccessor when the raw field is missing", async () => {
    const user = userEvent.setup();
    const columns: ColumnConfig<Row>[] = [
      { key: "name", label: "Nome" },
      {
        key: "situation",
        label: "Situação",
        render: (item) => item.collaborator?.status ?? "Sem vínculo",
        filterAccessor: (item) => item.collaborator?.status ?? "Sem vínculo",
      },
    ];

    const { container } = render(
      <DynamicTable data={data} columns={columns} rowKey={(row) => row.id} />,
    );

    await user.click(screen.getByRole("button", { name: "Situação" }));
    expect(rowNames(container)).toEqual(["Carla", "Ana", "Bruno"]);

    await user.click(screen.getByRole("button", { name: "Situação" }));
    expect(rowNames(container)).toEqual(["Bruno", "Ana", "Carla"]);
  });

  test("prefers sortAccessor over the filterAccessor fallback", async () => {
    const user = userEvent.setup();
    const columns: ColumnConfig<Row>[] = [
      { key: "name", label: "Nome" },
      {
        key: "situation",
        label: "Situação",
        render: (item) => item.collaborator?.status ?? "Sem vínculo",
        sortAccessor: (item) => (item.collaborator ? 0 : 1),
        filterAccessor: (item) => item.collaborator?.status ?? "Sem vínculo",
      },
    ];

    const { container } = render(
      <DynamicTable data={data} columns={columns} rowKey={(row) => row.id} />,
    );

    // Valor numérico: o TanStack ordena descendente no primeiro clique.
    await user.click(screen.getByRole("button", { name: "Situação" }));
    expect(rowNames(container)).toEqual(["Bruno", "Ana", "Carla"]);

    // Ascendente agrupa por vínculo (0 antes de 1) e ignora o rótulo.
    await user.click(screen.getByRole("button", { name: "Situação" }));
    expect(rowNames(container)).toEqual(["Ana", "Carla", "Bruno"]);
  });
});

describe("DynamicTable cell overflow", () => {
  type Row = { id: string; name: string; note: string; tag: string };

  const data: Row[] = [
    {
      id: "1",
      name: "Ana",
      note: "Comentário bem longo que precisa quebrar em mais de uma linha",
      tag: "SO MARCAS - GUARULHOS OUTLET COMERCIAL",
    },
  ];

  function cellFor(label: string) {
    const header = screen.getByRole("columnheader", { name: label });
    const index = Array.from(header.parentElement?.children ?? []).indexOf(
      header,
    );
    const row = screen.getAllByRole("row")[1];
    return row?.children[index] as HTMLElement;
  }

  test("clips every cell by default so a field never overlaps the next column", () => {
    const columns: ColumnConfig<Row>[] = [
      { key: "name", label: "Nome" },
      { key: "tag", label: "BU" },
    ];

    render(<DynamicTable data={data} columns={columns} rowKey={(r) => r.id} />);

    const cell = cellFor("BU");
    expect(cell).toHaveClass("overflow-hidden");
    expect(cell).toHaveClass("text-ellipsis");
    expect(cell).toHaveClass("whitespace-nowrap");
  });

  test('overflow "wrap" releases the single-line clamp for multi-line cells', () => {
    const columns: ColumnConfig<Row>[] = [
      { key: "name", label: "Nome" },
      { key: "note", label: "Comentário", overflow: "wrap" },
    ];

    render(<DynamicTable data={data} columns={columns} rowKey={(r) => r.id} />);

    expect(cellFor("Comentário")).toHaveClass("whitespace-normal");
  });

  test('overflow "visible" opts a cell out of clipping', () => {
    const columns: ColumnConfig<Row>[] = [
      { key: "name", label: "Nome" },
      { key: "tag", label: "BU", overflow: "visible" },
    ];

    render(<DynamicTable data={data} columns={columns} rowKey={(r) => r.id} />);

    expect(cellFor("BU")).toHaveClass("overflow-visible");
  });
});

// Regressão de FPS no scroll (2026-07-28). O virtualizer notifica a cada evento
// de scroll e re-renderiza a DynamicTable inteira; sem o `React.memo` da linha,
// cada frame reconciliava TODAS as linhas montadas — inclusive um DropdownMenu
// do Radix por linha, que medimos como o custo dominante (p50 do frame caía de
// ~43ms para ~17ms ao remover a coluna de ações).
//
// Os dois testes abaixo travam as duas metades do contrato: o memo precisa
// segurar quando só o scroll mudou, e precisa SOLTAR quando as colunas mudam
// (senão a linha memoizada renderizaria células velhas).
describe("DynamicTable row memoization", () => {
  type Row = { id: string; name: string };

  const data: Row[] = [
    { id: "1", name: "Ana" },
    { id: "2", name: "Bruno" },
  ];

  test("re-rendering the table does not re-render unchanged rows", () => {
    const renderCell = vi.fn((item: Row) => <span>{item.name}</span>);
    const columns: ColumnConfig<Row>[] = [
      { key: "name", label: "Nome", render: renderCell },
    ];

    const { rerender } = render(
      <DynamicTable
        data={data}
        columns={columns}
        rowKey={(r) => r.id}
        getRowLabel={(r) => r.name}
        onRowClick={() => {}}
        searchPlaceholder="antes"
      />,
    );

    expect(renderCell).toHaveBeenCalledTimes(data.length);
    renderCell.mockClear();

    // Muda algo do "chrome" da tabela e passa callbacks com identidade NOVA,
    // exatamente como um consumidor que declara arrows inline faria a cada
    // notificação do virtualizer durante o scroll.
    rerender(
      <DynamicTable
        data={data}
        columns={columns}
        rowKey={(r) => r.id}
        getRowLabel={(r) => r.name}
        onRowClick={() => {}}
        searchPlaceholder="depois"
      />,
    );

    expect(renderCell).not.toHaveBeenCalled();
  });

  test("changing columns still refreshes the memoized rows", () => {
    const columns: ColumnConfig<Row>[] = [{ key: "name", label: "Nome" }];

    const { rerender } = render(
      <DynamicTable data={data} columns={columns} rowKey={(r) => r.id} />,
    );

    expect(screen.queryByRole("columnheader", { name: "ID" })).toBeNull();

    rerender(
      <DynamicTable
        data={data}
        columns={[{ key: "id", label: "ID" }, ...columns]}
        rowKey={(r) => r.id}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "ID" })).toBeTruthy();
    const firstRow = screen.getAllByRole("row")[1];
    expect(firstRow?.children).toHaveLength(2);
    expect(firstRow?.children[0]?.textContent).toBe("1");
  });
});
