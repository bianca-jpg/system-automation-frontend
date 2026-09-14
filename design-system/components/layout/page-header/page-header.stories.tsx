import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PageHeader } from "./page-header";
import { Button } from "../../ui/button";

const meta = {
  title: "Layout/PageHeader",
  component: PageHeader,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "PageHeader — composes Typography + slots for navigation, breadcrumb, supporting content, and actions. Used at the top of every authenticated page.",
      },
    },
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Vagas",
    subtitle: "Gerencie todas as vagas publicadas no portal.",
  },
};

export const WithActions: Story = {
  args: {
    title: "Candidatos",
    subtitle: "Acompanhe inscrições recentes em tempo real.",
    actions: (
      <>
        <Button variant="outline">Exportar</Button>
        <Button>Adicionar candidato</Button>
      </>
    ),
  },
};

export const TitleTruncate: Story = {
  args: {
    title:
      "Um título extremamente longo para demonstrar o comportamento de truncate quando habilitado",
    titleOverflow: "truncate",
    actions: <Button>Ação</Button>,
  },
};
