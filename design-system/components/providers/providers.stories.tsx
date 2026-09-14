import type { Meta, StoryObj } from "@storybook/nextjs-vite";

/**
 * Synthetic "Providers" composition story for documentation only.
 *
 * Stories under this entry render an annotated tree showing how the leaves
 * compose. Children are not the real app — Storybook already mounts CentralThemeProvider
 * via .storybook/preview.tsx — but the composition is documented for downstream
 * maintainers.
 */
function ProvidersComposition() {
  return (
    <div className="rounded-lg border ds-border-surface bg-card p-4 text-sm">
      <p className="mb-2 font-bold">Providers — canonical composition</p>
      <pre className="whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
        {`<ThemeInitScript nonce={...} />          // <head>: pre-hydration class flip
<CentralThemeProvider>
  {children}
</CentralThemeProvider>`}
      </pre>
      <p className="mt-3 text-xs text-muted-foreground">
        ThemeInitScript runs before React hydrates so the document already has
        the right class (no flash). CentralThemeProvider mounts ThemeProvider +
        Toaster + the chromium scrollbar repaint workaround.
      </p>
    </div>
  );
}

const meta = {
  title: "Layout/Providers",
  component: ProvidersComposition,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Providers — 3-leaf folder (CentralThemeProvider + ThemeInitScript + ThemeProvider via theme-context). Composition story documents how to wire them in an app's root layout.",
      },
    },
  },
} satisfies Meta<typeof ProvidersComposition>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Composition: Story = {};
