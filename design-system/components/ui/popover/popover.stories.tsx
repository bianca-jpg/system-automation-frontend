import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "../button";
import { Input } from "../input";
import { Label } from "../label";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const meta = {
  title: "Content/Popover",
  component: Popover,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Popover primitive — Radix Popover wrapper with ref-as-prop signature. Use `asChild` on Trigger to propagate Button styling. Content portals to body with side+align positioning.",
      },
    },
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Open Popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <p className="text-sm">Popover content with default alignment.</p>
      </PopoverContent>
    </Popover>
  ),
};

export const WithForm: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Edit name</Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <form className="flex flex-col gap-3">
          <Label htmlFor="popover-name">Name</Label>
          <Input id="popover-name" defaultValue="System Automation" />
          <Button size="sm">Save</Button>
        </form>
      </PopoverContent>
    </Popover>
  ),
};

export const AlignedStart: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">align=start</Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <p className="text-sm">Aligned to trigger start.</p>
      </PopoverContent>
    </Popover>
  ),
};
