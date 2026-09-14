import type { StorybookConfig } from "@storybook/nextjs-vite";

/**
 * Storybook 10.3.6 configuration for Design System.
 *
 * Framework: @storybook/nextjs-vite (Vite builder + Next.js parity)
 * Spike 3 (D-spike-02 / Plano A): validated 2026-05-09, see 34-CONTEXT.md
 *
 * Note on `addon-controls`: Storybook 10 bundles controls into core via
 * `@storybook/addon-docs` (controls panel + autodocs). There is no separate
 * `@storybook/addon-controls@^10.x` package — its last published line is 9.x.
 * Controls work out of the box; no explicit addon entry needed.
 */
const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: [
    "../stories/**/*.stories.@(ts|tsx|mdx)",
    "../components/**/*.stories.@(ts|tsx|mdx)",
  ],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-themes",
    "@storybook/addon-a11y",
  ],
  typescript: {
    check: false,
    reactDocgen: "react-docgen-typescript",
    // O docgen roda por padrão em `**/*.tsx` do projeto inteiro. Isso incluía
    // `.storybook/preview.tsx` — que o TypeScript nem enxerga, porque o
    // `include` do tsconfig (`**/*.tsx`) não casa com diretórios iniciados por
    // ponto — e o build gastava tempo só para avisar
    // `Skipping docgen for ".storybook/preview.tsx" because it is not included
    // in the active TypeScript project`. Docgen só faz sentido sobre os
    // componentes publicados: é deles que saem as tabelas de props do autodocs.
    reactDocgenTypescriptOptions: {
      include: ["components/**/*.tsx"],
      exclude: ["**/*.stories.tsx", "**/__tests__/**", "**/*.test.tsx"],
    },
  },
  viteFinal: (config) => {
    config.build = {
      ...config.build,
      // Orçamento de tamanho por chunk. O gate de verdade é
      // `scripts/chunk-budget.mjs` (roda no `verify`), que separa os chunks do
      // próprio Storybook — `iframe` (runtime do preview) e `axe` (motor do
      // addon-a11y), ambos ferramentas de desenvolvimento que nunca chegam ao
      // usuário — dos chunks dos nossos componentes. Aqui o limite fica no teto
      // conhecido dessas ferramentas para o aviso genérico do Vite não repetir
      // o que o gate já cobre com números por chunk.
      chunkSizeWarningLimit: 1_500,
    };
    return config;
  },
};

export default config;
