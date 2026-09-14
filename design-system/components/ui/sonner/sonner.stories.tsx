import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { toast } from "sonner";

import { Toaster } from "./sonner";
import { Button } from "../button";

const meta = {
  title: "Feedback/Sonner",
  component: Toaster,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Sonner Toaster — themed toast container with branded success/info/warning/error/loading variants. Mounts dynamically via `import('sonner')` to keep the SSR bundle small.",
      },
    },
  },
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <>
      <Toaster />
      <div className="flex w-fit flex-col gap-2">
        <Button onClick={() => toast("Default toast")}>Default</Button>
        <Button onClick={() => toast.success("Saved successfully!")}>
          Success
        </Button>
        <Button onClick={() => toast.error("Something went wrong")}>
          Error
        </Button>
        <Button onClick={() => toast.warning("Heads up — review changes")}>
          Warning
        </Button>
        <Button onClick={() => toast.info("New version available")}>Info</Button>
      </div>
    </>
  ),
};
