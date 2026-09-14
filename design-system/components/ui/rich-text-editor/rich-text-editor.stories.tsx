import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { RichTextEditor, type RichTextEditorProps } from "./rich-text-editor";

const meta = {
  title: "UI/RichTextEditor",
  component: RichTextEditor,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-[42rem] max-w-[calc(100vw-2rem)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RichTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

function ControlledEditorStory(props: RichTextEditorProps) {
  const [value, setValue] = useState(props.value);
  return <RichTextEditor {...props} value={value} onChange={setValue} />;
}

export const Default: Story = {
  args: {
    value:
      "## Uma descrição clara\n\nUse **formatação** para organizar o conteúdo.",
    onChange: () => undefined,
    ariaLabel: "Descrição da vaga",
    maxLength: 500,
  },
  render: (args) => <ControlledEditorStory {...args} />,
};

export const Disabled: Story = {
  args: {
    value: "Conteúdo somente para leitura.",
    onChange: () => undefined,
    disabled: true,
    maxLength: 200,
  },
};

export const WithAiAssist: Story = {
  args: {
    value: "Revise esta descrição.",
    onChange: () => undefined,
    maxLength: 500,
    aiAssist: {
      onImprove: async (text) => `${text}\n\nTexto revisado pela IA.`,
    },
  },
};
