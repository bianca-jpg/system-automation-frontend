# Design System

Repositório do Design System da T&T, incluindo componentes, padrões visuais,
tokens e documentação via Storybook.

## Stack

- React 19
- Next 16
- Tailwind CSS 4
- Radix UI
- TipTap 3
- Storybook 10
- Vitest

O conteúdo deste repositório acompanha
`frontend/packages/design-system` do projeto ARA. As adaptações locais ficam
restritas à execução standalone (dependências, configuração de lint/testes e
assets públicos usados pelo Storybook).

O pacote do monorepo é a fonte de verdade. Mudanças compartilhadas em
componentes, tokens, temas, stories, testes e assets devem chegar a este
espelho na mesma entrega. Para manter o repositório consumível de forma
independente:

- `MessageReceiptStatus` permanece declarado localmente com o mesmo contrato
  literal, sem depender do pacote workspace-only `@system-automation/messaging`;
- subpaths públicos mais amplos são preservados enquanto não houver evidência
  de que consumidores externos deixaram de usá-los;
- dependências e configurações de lint, testes e Storybook são resolvidas na
  própria raiz deste repositório.

## CSS de produção e do catálogo

- `globals.css` é o entry point público de produção. Ele carrega
  `foundation.css`, componentes e helpers, excluindo arquivos `*.stories.*` do
  scan do Tailwind.
- `storybook.css` é interno ao catálogo e acrescenta stories colocalizadas e a
  pasta `stories/` ao scan.
- `foundation.css` concentra Tailwind 4 com auto-detecção desativada, tokens,
  temas, utilities `ds-*` e estilos globais. Cada entry declara explicitamente
  suas fontes. Compatibilidades públicas como `ds-border-focus` e
  `--auth-seam` fazem parte desse contrato e não devem ser removidas.

## Rodar localmente

```powershell
pnpm install
pnpm storybook
```

Storybook:

```text
http://localhost:6006
```

## Build do Storybook

```powershell
pnpm build-storybook
```

Saída:

```text
storybook-static/
```

## Validação

```powershell
pnpm verify
```

O gate agregado executa lint, typecheck, testes unitários, testes do runner de
acessibilidade e o build estático do Storybook.

Para executar a auditoria WCAG 2.2 AA em todas as stories:

```powershell
pnpm a11y:audit
```

Os resultados ficam em `storybook-static/a11y-results/`.

## Temas

O Storybook permite combinar modo claro/escuro com as paletas do projeto,
Blue Ocean, Purple Rain e Sweet Pie. Os tokens e o registro das paletas vivem
em `tokens/` e `lib/theme-registry.ts`.

## Consumo em apps Next.js

No `next.config.ts` do app consumidor:

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@system-automation/design-system"],
};

export default config;
```

No layout raiz:

```tsx
import "@system-automation/design-system/globals.css";
import { CentralThemeProvider } from "@system-automation/design-system/components/providers";
import { ThemeInitScript } from "@system-automation/design-system/components/providers/theme-init-script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <ThemeInitScript />
      </head>
      <body>
        <CentralThemeProvider>{children}</CentralThemeProvider>
      </body>
    </html>
  );
}
```

Guias complementares ficam em [`docs/`](./docs).

