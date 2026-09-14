import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "../button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

const meta = {
  title: "Feedback/Tooltip",
  component: Tooltip,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Tooltip primitive — Radix Tooltip wrapper. Variants: `default` (foreground/background inverted via semantic tokens), `info` (elevated surface with border). Trigger composes with Button via `asChild`.",
      },
    },
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover me</Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Default tooltip</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const InfoVariant: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Info hover</Button>
      </TooltipTrigger>
      <TooltipContent variant="info">
        <p>Info-toned tooltip with elevated surface and border.</p>
      </TooltipContent>
    </Tooltip>
  ),
};
