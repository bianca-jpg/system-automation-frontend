import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Badge, type BadgeVariant } from "../../ui/badge";
import { Button } from "../../ui/button";
import { DynamicTable, type ColumnConfig, type FilterConfig } from "./table";

interface Person {
  id: string;
  name: string;
  email: string;
  role: string;
  joined: string;
}

const SAMPLE: Person[] = [
  {
    id: "1",
    name: "Ana Silva",
    email: "ana@example.com",
    role: "Engineer",
    joined: "2024-01-12",
  },
  {
    id: "2",
    name: "Bruno Souza",
    email: "bruno@example.com",
    role: "Designer",
    joined: "2024-03-04",
  },
  {
    id: "3",
    name: "Carla Lima",
    email: "carla@example.com",
    role: "PM",
    joined: "2023-11-22",
  },
];

const COLUMNS: ColumnConfig<Person>[] = [
  { key: "name", label: "Name", sortable: true },
  { key: "email", label: "Email" },
  { key: "role", label: "Role", sortable: true },
  { key: "joined", label: "Joined", sortable: true },
];
const FILTERS: FilterConfig[] = [
  {
    key: "role",
    label: "Filtrar por função",
    options: [
      { value: "Engineer", label: "Engineer", variant: "info" },
      { value: "Designer", label: "Designer", variant: "warning" },
      { value: "PM", label: "PM", variant: "success" },
    ],
  },
];
// Storybook 10 narrows the meta's generic to `Record<string, any>` regardless of the
// `typeof DynamicTable<Person>` specialization, so we cast the columns once at the
// args boundary to avoid widening every column individually.
const COLUMNS_AS_GENERIC =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO(@dudxs 2026-05-10): Storybook 10 forces `Record<string, any>` shape on the meta's args generic; until Storybook ships a typed generic resolution this any is the boundary cast for stories only (FE-QUAL-04 documents zero `any` in source — this is story scaffolding, not runtime code).
  COLUMNS as unknown as ColumnConfig<Record<string, any>>[];

const meta = {
  title: "DataDisplay/Table",
  component: DynamicTable,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "DynamicTable — TanStack Table wrapper with search, filtering, sorting, virtualization, and persisted state. The composite renders inside a Card surface.",
      },
    },
  },
} satisfies Meta<typeof DynamicTable<Person>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: SAMPLE,
    columns: COLUMNS_AS_GENERIC,
    rowKey: (item) => item.id,
  },
};

export const Empty: Story = {
  args: {
    data: [],
    columns: COLUMNS_AS_GENERIC,
    rowKey: (item) => item.id,
    emptyMessage: "Nenhum colaborador encontrado",
  },
};

export const Loading: Story = {
  args: {
    data: [],
    columns: COLUMNS_AS_GENERIC,
    rowKey: (item) => item.id,
    searchValue: "",
    loading: true,
  },
};

export const WithFilters: Story = {
  args: {
    data: SAMPLE,
    columns: COLUMNS_AS_GENERIC,
    rowKey: (item) => item.id,
    searchKeys: ["name", "email", "role"],
    searchPlaceholder: "Buscar colaborador...",
    toolbarActions: (
      <Button type="button" variant="outline" className="h-12 rounded-xl">
        Período
      </Button>
    ),
    filters: FILTERS,
  },
};

// Padrão de coluna recomendado pós-redesign: status como pill (size="label" +
// dot) e numéricos com tabular-nums — tudo alinhado à esquerda, como o resto
// das colunas. Com resizableColumns, cada header exibe o risquinho de
// redimensionar (clique duplo restaura a largura padrão).
interface Vacancy {
  id: string;
  title: string;
  status: "approved" | "pending" | "rejected";
  candidates: number;
}

const VACANCY_SAMPLE: Vacancy[] = [
  {
    id: "1",
    title: "Analista de Dados II",
    status: "approved",
    candidates: 48,
  },
  { id: "2", title: "Vendedor de Moda", status: "pending", candidates: 12 },
  { id: "3", title: "Gerente de Loja", status: "rejected", candidates: 31 },
];

const VACANCY_STATUS: Record<
  Vacancy["status"],
  { label: string; variant: BadgeVariant }
> = {
  approved: { label: "Aprovada", variant: "success" },
  pending: { label: "Em análise", variant: "warning" },
  rejected: { label: "Negada", variant: "destructive" },
};

const VACANCY_COLUMNS: ColumnConfig<Vacancy>[] = [
  { key: "title", label: "Título", sortable: true, minWidth: "200px" },
  {
    key: "status",
    label: "Status",
    width: "150px",
    render: (item) => (
      <Badge size="label" variant={VACANCY_STATUS[item.status].variant} dot>
        {VACANCY_STATUS[item.status].label}
      </Badge>
    ),
  },
  {
    key: "candidates",
    label: "Candidatos",
    width: "120px",
    sortable: true,
    render: (item) => (
      <span className="font-medium tabular-nums text-foreground">
        {item.candidates}
      </span>
    ),
  },
];

export const StatusPillColumns: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Coluna de status com o pill `size="label" dot` e coluna numérica com `tabular-nums`, ambas alinhadas à esquerda como as demais — o padrão das tabelas após o redesign de 2026-06. Com `resizableColumns`, o risquinho no header indica onde arrastar (clique duplo restaura a largura padrão).',
      },
    },
  },
  args: {
    data: VACANCY_SAMPLE as unknown as Record<string, unknown>[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mesmo boundary cast das demais stories (Storybook 10 força Record<string, any> no generic do meta).
    columns: VACANCY_COLUMNS as unknown as ColumnConfig<Record<string, any>>[],
    rowKey: (item) => String(item.id),
    resizableColumns: true,
  },
};

// Regressão de overflow: antes do recorte na raiz, a BU larga (um Badge, que
// se dimensiona por max-content) vazava da coluna e pintava por cima do
// "Solicitante". A tabela é table-fixed — a coluna nunca cresce —, então a
// única saída é recortar na célula.
interface OverflowRow {
  id: string;
  business_unit: string;
  requested_by: string;
  note: string;
}

const OVERFLOW_SAMPLE: OverflowRow[] = [
  {
    id: "1",
    business_unit: "SO MARCAS - GUARULHOS OUTLET COMERCIAL",
    requested_by: "MAISON NOBREGA DO NASCIMENTO JUNIOR",
    note: "Comentário longo o suficiente para ocupar mais de uma linha inteira dentro da célula e provar o wrap.",
  },
  {
    id: "2",
    business_unit: "LOJAS",
    requested_by: "Luiz Gustavo Guimarães",
    note: "Curto.",
  },
];

const OVERFLOW_COLUMNS: ColumnConfig<OverflowRow>[] = [
  {
    key: "business_unit",
    label: "BU",
    width: "120px",
    render: (item) => (
      <Badge variant="outline" size="content" title={item.business_unit}>
        <span className="truncate">{item.business_unit}</span>
      </Badge>
    ),
  },
  {
    key: "requested_by",
    label: "Solicitante",
    width: "190px",
  },
  {
    key: "note",
    label: "Comentário",
    width: "220px",
    overflow: "wrap",
    render: (item) => (
      <span className="line-clamp-2 text-xs text-muted-foreground">
        {item.note}
      </span>
    ),
  },
];

// Cenário de estresse de SCROLL: muitas linhas, colunas resizáveis, ações
// sticky e renderers ricos (Badge/progresso) — a combinação que as tabelas do
// manager usam de verdade. Existe para medir custo por frame ao rolar, não
// para documentar API.
interface StressRow {
  id: string;
  title: string;
  owner: string;
  unit: string;
  status: "approved" | "pending" | "rejected";
  candidates: number;
  updated: string;
}

const STRESS_STATUS: StressRow["status"][] = [
  "approved",
  "pending",
  "rejected",
];

const STRESS_SAMPLE: StressRow[] = Array.from({ length: 300 }, (_, index) => ({
  id: String(index + 1),
  title: `Analista de Operações ${index + 1}`,
  owner: `Gestor Responsável ${(index % 37) + 1}`,
  unit: `SO MARCAS - UNIDADE ${(index % 11) + 1}`,
  status: STRESS_STATUS[index % 3] as StressRow["status"],
  candidates: (index * 7) % 120,
  updated: `2026-0${(index % 9) + 1}-1${index % 10}`,
}));

const STRESS_COLUMNS: ColumnConfig<StressRow>[] = [
  { key: "title", label: "Título", sortable: true, minWidth: "220px" },
  { key: "owner", label: "Gestor", sortable: true, width: "200px" },
  {
    key: "unit",
    label: "Unidade",
    width: "200px",
    render: (item) => (
      <Badge variant="outline" size="content" title={item.unit}>
        <span className="truncate">{item.unit}</span>
      </Badge>
    ),
  },
  {
    key: "status",
    label: "Status",
    width: "150px",
    render: (item) => (
      <Badge size="label" variant={VACANCY_STATUS[item.status].variant} dot>
        {VACANCY_STATUS[item.status].label}
      </Badge>
    ),
  },
  {
    key: "candidates",
    label: "Candidatos",
    width: "130px",
    sortable: true,
    render: (item) => (
      <span className="font-medium tabular-nums text-foreground">
        {item.candidates}
      </span>
    ),
  },
  { key: "updated", label: "Atualizada em", width: "160px", sortable: true },
];

export const ScrollStress: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "300 linhas com colunas resizáveis, coluna de ações sticky e renderers ricos. Cenário de medição de FPS ao rolar — a virtualização mantém ~30 linhas no DOM, então o custo por frame precisa ser constante.",
      },
    },
  },
  args: {
    data: STRESS_SAMPLE as unknown as Record<string, unknown>[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mesmo boundary cast das demais stories.
    columns: STRESS_COLUMNS as unknown as ColumnConfig<Record<string, any>>[],
    rowKey: (item) => String(item.id),
    resizableColumns: true,
    stickyActions: true,
    searchKeys: ["title", "owner", "unit"],
    searchPlaceholder: "Buscar vaga...",
    actions: [
      { label: "Ver detalhes", onClick: () => {} },
      { label: "Compartilhar", onClick: () => {} },
      { label: "Encerrar", variant: "destructive", onClick: () => {} },
    ],
    onRowClick: () => {},
  },
};

export const LongContent: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Conteúdo maior que a coluna. Default (`overflow: "ellipsis"`) recorta com reticências e nunca invade a coluna vizinha; `overflow: "wrap"` libera múltiplas linhas para células com `line-clamp`.',
      },
    },
  },
  args: {
    data: OVERFLOW_SAMPLE as unknown as Record<string, unknown>[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mesmo boundary cast das demais stories.
    columns: OVERFLOW_COLUMNS as unknown as ColumnConfig<Record<string, any>>[],
    rowKey: (item) => String(item.id),
    searchKeys: ["business_unit", "requested_by"],
    searchPlaceholder: "Buscar por BU ou solicitante...",
  },
};
