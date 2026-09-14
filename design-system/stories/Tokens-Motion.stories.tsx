import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  title: "Tokens/Motion",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Semantic duration/easing scale plus keyframes in `tokens/motion.css`. All token-driven motion collapses under `prefers-reduced-motion: reduce`.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const Durations = [
  {
    name: "Instant",
    varName: "--motion-duration-instant",
    utility: "duration-instant",
    value: "0ms",
  },
  {
    name: "Fast",
    varName: "--motion-duration-fast",
    utility: "duration-fast",
    value: "120ms",
  },
  {
    name: "Standard",
    varName: "--motion-duration-standard",
    utility: "duration-standard",
    value: "200ms",
  },
  {
    name: "Slow",
    varName: "--motion-duration-slow",
    utility: "duration-slow",
    value: "500ms",
  },
  {
    name: "Deliberate",
    varName: "--motion-duration-deliberate",
    utility: "duration-deliberate",
    value: "780ms",
  },
  {
    name: "Ambient",
    varName: "--motion-duration-ambient",
    utility: "duration-ambient",
    value: "1600ms",
  },
] as const;

const Easings = [
  {
    name: "Standard",
    varName: "--motion-ease-standard",
    utility: "ease-standard",
  },
  {
    name: "Emphasized",
    varName: "--motion-ease-emphasized",
    utility: "ease-emphasized",
  },
  {
    name: "Linear",
    varName: "--motion-ease-linear",
    utility: "ease-linear",
  },
] as const;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-heading font-bold text-foreground">
          Duration and easing contracts
        </h3>
        <div className="grid gap-content-gap rounded-surface border ds-border-control p-4 md:grid-cols-2">
          <div className="flex flex-col gap-control-gap">
            {Durations.map(({ name, varName, utility, value }) => (
              <div
                key={varName}
                className="flex items-center justify-between gap-4"
              >
                <span className="text-sm font-medium text-foreground">
                  {name}
                </span>
                <code className="text-xs font-mono text-muted-foreground">
                  {utility} · {varName} · {value}
                </code>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-control-gap">
            {Easings.map(({ name, varName, utility }) => (
              <div
                key={varName}
                className="flex items-center justify-between gap-4"
              >
                <span className="text-sm font-medium text-foreground">
                  {name}
                </span>
                <code className="text-xs font-mono text-muted-foreground">
                  {utility} · {varName}
                </code>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-control-gap">
          <button
            type="button"
            className="rounded-interactive bg-primary px-3 py-2 text-sm font-medium text-primary-foreground outline-none transition-transform duration-fast ease-standard motion-safe:hover:-translate-y-0.5 focus-visible:ds-focus-ring "
          >
            Fast + standard
          </button>
          <button
            type="button"
            className="rounded-interactive bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground-strong outline-none transition-transform duration-standard ease-emphasized motion-safe:hover:-translate-y-0.5 focus-visible:ds-focus-ring "
          >
            Standard + emphasized
          </button>
          <button
            type="button"
            className="rounded-interactive border ds-border-control bg-card px-3 py-2 text-sm font-medium text-foreground outline-none transition-transform duration-slow ease-standard motion-safe:hover:-translate-y-0.5 focus-visible:ds-focus-ring "
          >
            Slow + standard
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-heading font-bold text-foreground">
          Shimmer text (`shimmer-slide` keyframe)
        </h3>
        <p className="text-sm text-muted-foreground">
          Loading-state effect for text. Gradient overlay clipped to the text
          glyphs, animated with `--motion-duration-ambient` and linear easing.
        </p>
        <div className="rounded-md border ds-border-control p-6">
          <span
            className="shimmer-text text-xl font-heading"
            data-text="Carregando dados…"
          >
            Carregando dados…
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-heading font-bold text-foreground">
          Ripple effect (`ds-ripple` keyframe + `.animate-ds-ripple`)
        </h3>
        <p className="text-sm text-muted-foreground">
          Touch/click feedback via `--motion-duration-deliberate` and
          `--motion-ease-emphasized`.
        </p>
        <div className="flex items-center gap-6 rounded-md border ds-border-control p-6">
          <div className="relative h-20 w-20 overflow-hidden rounded-pill bg-primary">
            <span
              className="absolute inset-0 animate-ds-ripple bg-primary-foreground/30"
              style={{ animationIterationCount: "infinite" }}
            />
          </div>
          <code className="text-xs font-mono text-muted-foreground">
            @keyframes ds-ripple
          </code>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-heading font-bold text-foreground">
          Spinner (`ds-spinner-rotate` + `ds-spinner-dash` keyframes)
        </h3>
        <p className="text-sm text-muted-foreground">
          Indeterminate progress indicator. Combined rotate + dash-array
          animation matching the spinner primitive.
        </p>
        <div className="flex items-center gap-6 rounded-md border ds-border-control p-6">
          <svg
            className="ds-spinner h-12 w-12 text-secondary"
            viewBox="0 0 50 50"
            role="img"
            aria-label="Loading"
          >
            <circle
              className="ds-spinner__circle"
              cx="25"
              cy="25"
              r="20"
              strokeWidth="5"
            />
          </svg>
          <code className="text-xs font-mono text-muted-foreground">
            @keyframes ds-spinner-rotate / ds-spinner-dash
          </code>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-heading font-bold text-foreground">
          Reduced motion
        </h3>
        <div className="rounded-md border ds-border-control p-4">
          <p className="text-sm text-foreground">
            Animations respect{" "}
            <code className="font-mono text-xs text-muted-foreground">
              prefers-reduced-motion: reduce
            </code>
            . When the OS setting is enabled, shimmer / ripple / spinner pause
            (or freeze on a static frame) instead of looping. Toggle in OS
            accessibility settings and reload to verify.
          </p>
        </div>
      </section>
    </div>
  ),
};
