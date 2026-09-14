import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useForm } from "react-hook-form";

import { SelectSearch } from "./select-with-search";

const meta = {
  title: "Content/SelectWithSearch",
  component: SelectSearch,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "SelectSearch — Select primitive with an inline filter input inside the popover content. RHF-compatible via Controller; preserves error styling on the trigger when `error` prop is provided.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SelectSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

const STATES = [
  { label: "São Paulo", value: "SP" },
  { label: "Rio de Janeiro", value: "RJ" },
  { label: "Minas Gerais", value: "MG" },
  { label: "Bahia", value: "BA" },
  { label: "Paraná", value: "PR" },
  { label: "Santa Catarina", value: "SC" },
  { label: "Rio Grande do Sul", value: "RS" },
  { label: "Pernambuco", value: "PE" },
  { label: "Ceará", value: "CE" },
  { label: "Goiás", value: "GO" },
];

type FormShape = { state: string };

// SelectSearch requires a runtime RHF Control, so args are provided in render.
// We loosen Story typing here to satisfy Storybook 10's stricter required-args check.
export const Default = {
  render: () => {
    const Demo = () => {
      const form = useForm<FormShape>({ defaultValues: { state: "" } });
      return (
        <SelectSearch
          name="state"
          control={form.control}
          label="Estado"
          options={STATES}
          placeholder="Selecione um estado"
          searchPlaceholder="Filtrar estados..."
        />
      );
    };
    return <Demo />;
  },
} satisfies Pick<Story, "render">;
