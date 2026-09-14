import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { RadioGroup, RadioGroupItem } from "./radio-group";
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
  title: "Form/RadioGroup",
  component: RadioGroup,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "RadioGroup compound primitive — Radix RadioGroup wrapper. Already function-based (no codemod needed). Pair RadioGroupItem with `<Label htmlFor>` for accessible label binding.",
      },
    },
  },
} satisfies Meta<typeof RadioGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="opt-1" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="opt-1" id="o1" />
        <Label htmlFor="o1">Option 1</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="opt-2" id="o2" />
        <Label htmlFor="o2">Option 2</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="opt-3" id="o3" />
        <Label htmlFor="o3">Option 3</Label>
      </div>
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="a" disabled className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="a" id="da" />
        <Label htmlFor="da">A (disabled group)</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="b" id="db" />
        <Label htmlFor="db">B (disabled group)</Label>
      </div>
    </RadioGroup>
  ),
};

const schema = z.object({
  choice: z.enum(["yes", "no"], { message: "Required" }),
});
type Values = z.input<typeof schema>;

export const WithFormField: Story = {
  render: () => {
    const form = useForm<Values>({
      resolver: zodResolver(schema),
      defaultValues: { choice: undefined as unknown as "yes" },
    });
    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) => alert(JSON.stringify(v)))}
          className="flex flex-col gap-4"
        >
          <FormField
            control={form.control}
            name="choice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm?</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="yes" id="y" />
                      <Label htmlFor="y">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="no" id="n" />
                      <Label htmlFor="n">No</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
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
