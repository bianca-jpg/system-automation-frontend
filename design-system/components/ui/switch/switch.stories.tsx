import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Switch } from "./switch";
import { Button } from "../button";
import { Label } from "../label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../form";

const meta = {
  title: "Form/Switch",
  component: Switch,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Switch toggle primitive — custom button with role=switch. Ref-as-prop converted from React.forwardRef. Supports `size` axis (sm/md) via cva. Checked thumbs use `primary-foreground` so light and dark themes preserve contrast.",
      },
    },
  },
} satisfies Meta<typeof Switch>;
export default meta;
type Story = StoryObj<typeof meta>;

function ControlledDemo({
  size = "md",
  initial = false,
}: {
  size?: "sm" | "md";
  initial?: boolean;
}) {
  const [checked, setChecked] = React.useState(initial);
  return (
    <div className="flex items-center gap-3">
      <Switch
        checked={checked}
        onCheckedChange={setChecked}
        size={size}
        id={`s-${size}-${initial}`}
      />
      <Label htmlFor={`s-${size}-${initial}`}>{checked ? "On" : "Off"}</Label>
    </div>
  );
}

export const Default: Story = { render: () => <ControlledDemo size="md" /> };
export const Small: Story = { render: () => <ControlledDemo size="sm" /> };
export const InitiallyOn: Story = {
  render: () => <ControlledDemo size="md" initial={true} />,
};
export const DisabledOff: Story = {
  render: () => <Switch disabled aria-label="disabled-off" />,
};
export const DisabledOn: Story = {
  render: () => <Switch disabled checked aria-label="disabled-on" />,
};

export const ThemeContrast: Story = {
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "Theme contrast matrix for checked/unchecked states. The checked light state keeps a light thumb on a dark primary track; dark theme inverts through `primary-foreground`.",
      },
    },
  },
  render: () => (
    <div className="grid gap-4 md:grid-cols-2">
      {[
        { theme: "ds-theme-light", label: "Light" },
        { theme: "dark", label: "Dark" },
      ].map(({ theme, label }) => (
        <section
          key={theme}
          className={`${theme} rounded-xl border ds-border-surface bg-background p-4 text-foreground`}
        >
          <h3 className="mb-3 text-sm font-bold">{label}</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Switch checked aria-label={`${label} checked`} />
              <span className="text-sm">Checked</span>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={false} aria-label={`${label} unchecked`} />
              <span className="text-sm">Unchecked</span>
            </div>
          </div>
        </section>
      ))}
    </div>
  ),
};

const schema = z.object({
  notifications: z.boolean(),
});
type Values = z.input<typeof schema>;

export const WithFormField: Story = {
  render: () => {
    const form = useForm<Values>({
      resolver: zodResolver(schema),
      defaultValues: { notifications: false },
    });
    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) => alert(JSON.stringify(v)))}
          className="flex flex-col gap-3"
        >
          <FormField
            control={form.control}
            name="notifications"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-3">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Enable notifications</FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Submit</Button>
        </form>
      </Form>
    );
  },
};
