import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Checkbox } from "./checkbox";
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
  title: "Form/Checkbox",
  component: Checkbox,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Checkbox primitive — Radix Checkbox wrapper. Already function-based (no codemod needed). Pair with `<Label htmlFor>` for accessible label binding.",
      },
    },
  },
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { id: "demo", "aria-label": "Example checkbox" },
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
};

export const Checked: Story = {
  args: { defaultChecked: true, "aria-label": "Checked checkbox" },
};
export const Disabled: Story = {
  args: { disabled: true, "aria-label": "Disabled checkbox" },
};
export const DisabledChecked: Story = {
  args: {
    disabled: true,
    defaultChecked: true,
    "aria-label": "Disabled checked checkbox",
  },
};

const schema = z.object({
  accepted: z.literal(true, { message: "Required" }),
});
type Values = z.input<typeof schema>;

export const WithFormField: Story = {
  render: () => {
    const form = useForm<Values>({
      resolver: zodResolver(schema),
      defaultValues: { accepted: false as unknown as true },
    });
    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) => alert(JSON.stringify(v)))}
          className="flex flex-col gap-3"
        >
          <FormField
            control={form.control}
            name="accepted"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Accept terms</FormLabel>
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
