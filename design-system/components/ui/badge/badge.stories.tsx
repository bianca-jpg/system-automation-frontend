import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Badge } from "./badge";
import type { BadgeSize, BadgeVariant } from "./variants";

const meta = {
  title: "DataDisplay/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Badge primitive — 9 variants × 5 sizes. State tones use semantic subtle-surface text tokens with AA contrast in light/dark instead of raw palette classes.",
      },
    },
  },
  args: { children: "Badge" },
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Success: Story = { args: { variant: "success" } };
export const Warning: Story = { args: { variant: "warning" } };
export const Destructive: Story = { args: { variant: "destructive" } };
export const Info: Story = { args: { variant: "info" } };
export const Outline: Story = { args: { variant: "outline" } };

export const RoseSemantic: Story = {
  args: { variant: "rose", children: "Rose (destructive family)" },
  parameters: {
    docs: {
      description: {
        story:
          "Drift-cleaned variant — old palette defaults (bg-rose-50/75 text-rose-700) replaced with semantic destructive token family. Visual diff is intentional per D-color-01.",
      },
    },
  },
};
export const SkySemantic: Story = {
  args: { variant: "sky", children: "Sky (info family)" },
  parameters: {
    docs: {
      description: {
        story:
          "Drift-cleaned variant — old palette defaults (bg-sky-50/75 text-sky-700) replaced with semantic info token family.",
      },
    },
  },
};
export const NeutralSemantic: Story = {
  args: { variant: "neutral", children: "Neutral (muted)" },
  parameters: {
    docs: {
      description: {
        story:
          "Drift-cleaned variant — old palette defaults (bg-slate-50/80 text-slate-700) replaced with semantic muted/foreground token family.",
      },
    },
  },
};

export const SizeCompact: Story = {
  args: { size: "compact", children: "Compact" },
};
export const SizeContent: Story = {
  args: { size: "content", children: "Content" },
};
export const SizeIndicator: Story = {
  args: { size: "indicator", children: "9" },
};
export const SizeStatus: Story = {
  args: { size: "status", children: "Status badge" },
};
export const SizeLabel: Story = {
  args: { size: "label", variant: "success", children: "Aprovada" },
  parameters: {
    docs: {
      description: {
        story:
          "Pill de célula/header — caixa normal (sentence case), h-6, sem largura mínima. É o tamanho canônico para status e categorias em tabelas; alinhado à esquerda na coluna, o texto inicia sempre no mesmo x.",
      },
    },
  },
};
export const StatusPill: Story = {
  args: {
    size: "label",
    variant: "warning",
    dot: true,
    children: "Em análise",
  },
  parameters: {
    docs: {
      description: {
        story:
          '`size="label"` + `dot` — padrão para badges de ESTADO (aprovada/em análise/negada). Categóricos (papéis, tags, Sim/Não) usam o mesmo tamanho SEM dot. Com `asChild` o dot é ignorado (Slot exige filho único).',
      },
    },
  },
};
export const StatusPillRow: Story = {
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "Fila de pills de status como aparecem numa coluna de tabela — todos iniciando no mesmo x, sem o vão irregular dos tamanhos com min-width.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col items-start gap-2">
      <Badge size="label" variant="success" dot>
        Aprovada
      </Badge>
      <Badge size="label" variant="warning" dot>
        Em análise
      </Badge>
      <Badge size="label" variant="destructive" dot>
        Negada
      </Badge>
      <Badge size="label" variant="info" dot>
        Em andamento
      </Badge>
      <Badge size="label" variant="outline">
        Categoria sem dot
      </Badge>
    </div>
  ),
};

export const AsChildLink: Story = {
  args: {
    asChild: true,
    variant: "info",
    children: <a href="#">Linked badge</a>,
  },
  parameters: {
    docs: {
      description: {
        story:
          "asChild composition — Badge styles are applied to the rendered child element (anchor here) via @radix-ui/react-slot.",
      },
    },
  },
};

// FE-STORY-04 — Variant matrix: 9 variants × 5 sizes (representative grid).
const VARIANTS: readonly BadgeVariant[] = [
  "default",
  "success",
  "warning",
  "destructive",
  "info",
  "outline",
  "rose",
  "sky",
  "neutral",
] as const;
const SIZES: readonly BadgeSize[] = [
  "compact",
  "content",
  "indicator",
  "status",
  "label",
] as const;

export const VariantMatrix: Story = {
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "FE-STORY-04 variant matrix (9 variants × 5 sizes = 45 cells). Renders every variant grouped by tone; indicator size uses numeric content.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-6">
      {VARIANTS.map((variant) => (
        <section key={variant} className="flex flex-col gap-2">
          <h3 className="font-heading text-sm capitalize text-foreground">
            {variant}
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            {SIZES.map((size) => (
              <Badge key={size} variant={variant} size={size}>
                {size === "indicator" ? "9" : variant}
              </Badge>
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
};
