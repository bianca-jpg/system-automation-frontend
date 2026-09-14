import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "./index";

const meta = {
  title: "Form/Form",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "shadcn-style RHF + zod form wrapper. Composes Form (FormProvider) + FormField (Controller) + FormItem (id context) + FormLabel/FormControl/FormMessage/FormDescription. Replaces deprecated FormInput Frankenstein (deletion deferred to Phase 38 / FE-QUAL-21).",
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
} satisfies Meta;

export default meta;
type Story = StoryObj;

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

type Values = z.input<typeof schema>;

function DefaultDemo() {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((v) => alert(JSON.stringify(v)))}
        className="flex flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormDescription>Used to log in. Never shared.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

function ErrorsDemo() {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "not-an-email", password: "short" },
    mode: "onChange",
  });
  React.useEffect(() => {
    void form.trigger();
  }, [form]);
  return (
    <Form {...form}>
      <form className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

export const WithErrors: Story = {
  render: () => <ErrorsDemo />,
};
