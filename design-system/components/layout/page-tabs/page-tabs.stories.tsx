import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { Activity, BarChart, Users } from "lucide-react";

import {
  PageTabs,
  PageTabsBar,
  PageTabsContent,
} from "./page-tabs";

const meta = {
  title: "Layout/PageTabs",
  component: PageTabs,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "PageTabs — Tabs (Plan 35-4) wrapper for full-width page tabs. Uses `useDeferredValue` to defer slow tab transitions while keeping the trigger immediately responsive.",
      },
    },
  },
} satisfies Meta<typeof PageTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const Demo = () => {
      const [tab, setTab] = React.useState("overview");
      const items = [
        { value: "overview", label: "Overview", icon: <Activity /> },
        { value: "candidates", label: "Candidates", icon: <Users /> },
        { value: "analytics", label: "Analytics", icon: <BarChart /> },
      ];
      return (
        <PageTabs value={tab} onValueChange={setTab}>
          <PageTabsBar items={items} />
          <PageTabsContent value="overview">
            <div className="rounded-lg border ds-border-surface p-6">
              Overview content
            </div>
          </PageTabsContent>
          <PageTabsContent value="candidates">
            <div className="rounded-lg border ds-border-surface p-6">
              Candidates content
            </div>
          </PageTabsContent>
          <PageTabsContent value="analytics">
            <div className="rounded-lg border ds-border-surface p-6">
              Analytics content
            </div>
          </PageTabsContent>
        </PageTabs>
      );
    };
    return <Demo />;
  },
};

export const WithCounts: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`PageTabItem.count` exibe um chip de contagem ao lado do label (ex.: total de registros da aba). O chip da aba ativa ganha o tom da marca; aceita number ou string (\"99+\" para tetos de sondagem).",
      },
    },
  },
  render: () => {
    const Demo = () => {
      const [tab, setTab] = React.useState("my");
      const items = [
        { value: "my", label: "Minhas vagas", count: 24 },
        { value: "all", label: "Todas as vagas", count: "99+" },
        { value: "shared", label: "Compartilhadas", count: 8 },
      ];
      return (
        <PageTabs value={tab} onValueChange={setTab}>
          <PageTabsBar items={items} />
          <PageTabsContent value="my">
            <div className="rounded-lg border ds-border-surface p-6">
              Minhas vagas
            </div>
          </PageTabsContent>
          <PageTabsContent value="all">
            <div className="rounded-lg border ds-border-surface p-6">
              Todas as vagas
            </div>
          </PageTabsContent>
          <PageTabsContent value="shared">
            <div className="rounded-lg border ds-border-surface p-6">
              Compartilhadas
            </div>
          </PageTabsContent>
        </PageTabs>
      );
    };
    return <Demo />;
  },
};
