import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta = {
  title: "Layout/Tabs",
  component: Tabs,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Tabs compound primitive — Radix Tabs wrapper. tabsStyleContext flows variant from TabsList → TabsTrigger; ripple integration on TabsTrigger via composeEventHandlers + useRippleEffect.",
      },
    },
  },
} satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-96">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <p className="text-sm text-muted-foreground">Account settings panel.</p>
      </TabsContent>
      <TabsContent value="password">
        <p className="text-sm text-muted-foreground">
          Password management panel.
        </p>
      </TabsContent>
      <TabsContent value="notifications">
        <p className="text-sm text-muted-foreground">
          Notification preferences panel.
        </p>
      </TabsContent>
    </Tabs>
  ),
};

export const PillVariant: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-full max-w-2xl">
      <TabsList variant="pill">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p className="text-sm text-muted-foreground">Overview content.</p>
      </TabsContent>
      <TabsContent value="analytics">
        <p className="text-sm text-muted-foreground">Analytics content.</p>
      </TabsContent>
      <TabsContent value="reports">
        <p className="text-sm text-muted-foreground">Reports content.</p>
      </TabsContent>
      <TabsContent value="settings">
        <p className="text-sm text-muted-foreground">Settings content.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const DisabledTrigger: Story = {
  render: () => (
    <Tabs defaultValue="active" className="w-96">
      <TabsList>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="disabled" disabled>
          Disabled
        </TabsTrigger>
      </TabsList>
      <TabsContent value="active">
        <p className="text-sm text-muted-foreground">Active tab content.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const VariantInheritance: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-mono text-muted-foreground">
          Default variant — TabsList propagates default to all triggers
        </p>
        <Tabs defaultValue="t1" className="w-96">
          <TabsList>
            <TabsTrigger value="t1">One</TabsTrigger>
            <TabsTrigger value="t2">Two</TabsTrigger>
          </TabsList>
          <TabsContent value="t1">Default content</TabsContent>
        </Tabs>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-mono text-muted-foreground">
          Pill variant — TabsList propagates pill to all triggers via
          tabsStyleContext
        </p>
        <Tabs defaultValue="t1" className="w-96">
          <TabsList variant="pill">
            <TabsTrigger value="t1">One</TabsTrigger>
            <TabsTrigger value="t2">Two</TabsTrigger>
          </TabsList>
          <TabsContent value="t1">Pill content</TabsContent>
        </Tabs>
      </div>
    </div>
  ),
};
