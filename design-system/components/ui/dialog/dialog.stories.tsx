import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ActionButton } from "../action-button";
import { Button } from "../button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanelBody,
  DialogPanelFooter,
  DialogPanelHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

const meta = {
  title: "Content/Dialog",
  component: Dialog,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Dialog primitive — Radix Dialog wrapper with closeWithDelay context. Supports size variants (sm/md/lg/xl/2xl/3xl/4xl/fit/full) and surface variants (default scrollable, panel layout). Triggers compose with Button via `asChild` per Convention 0.C.",
      },
    },
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent size="md" surface="default">
        <DialogHeader>
          <DialogTitle>Dialog title</DialogTitle>
          <DialogDescription>
            Default size + surface — scrollable layout.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm">
          Content body. Use <code>size</code> + <code>surface</code> props to
          switch layouts.
        </p>
        <DialogFooter>
          <Button>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const SmallSize: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open small</Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Small (sm:max-w-md)</DialogTitle>
          <DialogDescription>
            For confirmations and compact prompts.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
};

export const LargeSize: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open large</Button>
      </DialogTrigger>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Large (sm:max-w-xl)</DialogTitle>
          <DialogDescription>For complex forms.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
};

export const PanelSurface: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open panel</Button>
      </DialogTrigger>
      <DialogContent size="lg" surface="panel">
        <DialogPanelHeader>
          <DialogTitle>Panel surface</DialogTitle>
          <DialogDescription>
            Header/body/footer with no internal padding.
          </DialogDescription>
        </DialogPanelHeader>
        <DialogPanelBody>
          <p className="p-6 text-sm">Body content with its own padding.</p>
        </DialogPanelBody>
        <DialogPanelFooter>
          <Button>Confirm</Button>
        </DialogPanelFooter>
      </DialogContent>
    </Dialog>
  ),
};

// Visual regression guard for the DialogFooter + ActionButton interaction.
// ActionButton defaults to `width: full` and emits `data-slot=action-button`
// (not `data-slot=button`). DialogFooter must reset that width at the sm+
// breakpoint so cancel/save line up small on the right — see DialogFooter
// className in dialog.tsx and dialog-footer.test.tsx.
export const FooterWithActionButtons: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open panel with action buttons</Button>
      </DialogTrigger>
      <DialogContent size="4xl" surface="panel">
        <DialogPanelHeader>
          <DialogTitle>Form footer regression</DialogTitle>
          <DialogDescription>
            ActionButton (Cancelar/Salvar) should sit right-aligned at auto
            width — not stretched to full width.
          </DialogDescription>
        </DialogPanelHeader>
        <DialogPanelBody>
          <p className="p-6 text-sm">
            Triggers the failure mode reported on the ADP admission modal.
          </p>
        </DialogPanelBody>
        <DialogPanelFooter>
          <ActionButton variant="secondary">Cancelar</ActionButton>
          <ActionButton variant="primary">Salvar</ActionButton>
        </DialogPanelFooter>
      </DialogContent>
    </Dialog>
  ),
};
