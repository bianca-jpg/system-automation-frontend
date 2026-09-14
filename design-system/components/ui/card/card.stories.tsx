import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "../button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

const meta = {
  title: "Layout/Card",
  component: Card,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Card compound primitive — multi-slot (card, card-header, card-title, card-description, card-action, card-content, card-footer). 4 surface variants (default, elevated, panel, soft).",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card title</CardTitle>
        <CardDescription>Default surface, default density.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Body content goes here.</p>
      </CardContent>
      <CardFooter className="border-t">
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
};

export const Elevated: Story = {
  render: () => (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>Elevated</CardTitle>
        <CardDescription>Background elevated + shadow-card.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Body content with a soft drop shadow.
        </p>
      </CardContent>
    </Card>
  ),
};

export const Panel: Story = {
  render: () => (
    <Card variant="panel">
      <CardHeader>
        <CardTitle>Panel</CardTitle>
        <CardDescription>Seam border, no shadow.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Content sits on a flat panel surface.
        </p>
      </CardContent>
    </Card>
  ),
};

export const Soft: Story = {
  render: () => (
    <Card variant="soft">
      <CardHeader>
        <CardTitle>Soft</CardTitle>
        <CardDescription>Surface tone background.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Soft variant body.</p>
      </CardContent>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>With action</CardTitle>
        <CardDescription>
          Action sits in the header right side via grid track 2.
        </CardDescription>
        <CardAction>
          <Button size="sm" variant="ghost" className="w-auto">
            ...
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          The action slot uses col-start-2.
        </p>
      </CardContent>
    </Card>
  ),
};

export const HeaderOnly: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Header only</CardTitle>
        <CardDescription>No body, no footer.</CardDescription>
      </CardHeader>
    </Card>
  ),
};

// FE-STORY-04 — Variant matrix: 4 surface variants × 3 content shapes.
const VARIANTS = ["default", "elevated", "panel", "soft"] as const;
const CONTENT_SHAPES = ["minimal", "with-action", "full"] as const;

export const VariantMatrix: Story = {
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "FE-STORY-04 variant matrix — 4 surface variants × 3 content shapes (minimal, with-action, full). Demonstrates the cva variant axis paired with multi-slot composition shapes.",
      },
    },
  },
  decorators: [(Story) => <Story />],
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {VARIANTS.flatMap((variant) =>
        CONTENT_SHAPES.map((shape) => (
          <Card key={`${variant}-${shape}`} variant={variant}>
            <CardHeader>
              <CardTitle className="text-sm capitalize">
                {variant} / {shape}
              </CardTitle>
              {shape !== "minimal" ? (
                <CardDescription className="text-xs">
                  Description text.
                </CardDescription>
              ) : null}
              {shape === "with-action" ? (
                <CardAction>
                  <Button size="sm" variant="ghost" className="w-auto">
                    ...
                  </Button>
                </CardAction>
              ) : null}
            </CardHeader>
            {shape === "full" ? (
              <>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Body content.</p>
                </CardContent>
                <CardFooter className="border-t pt-3">
                  <Button size="sm" className="w-auto">
                    OK
                  </Button>
                </CardFooter>
              </>
            ) : null}
          </Card>
        )),
      )}
    </div>
  ),
};
