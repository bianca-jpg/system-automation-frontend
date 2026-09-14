# Design System

Pacote:

```text
@system-automation/design-system
```

Este repositório mantém o design system na própria raiz: componentes, tokens,
hooks, helpers, configuração do Storybook e documentação.

## Estrutura

```text
components/
hooks/
lib/
stories/
tokens/
types/
.storybook/
foundation.css
globals.css
storybook.css
package.json
```

## Stack

- React 19
- Next 16
- Tailwind CSS 4
- Radix UI
- shadcn-style components
- class-variance-authority
- tailwind-merge
- lucide-react
- Storybook 10
- Vitest

## Tokens

```text
tokens/colors.css
tokens/spacing.css
tokens/radius.css
tokens/shadows.css
tokens/typography.css
tokens/motion.css
```

O arquivo `foundation.css` importa Tailwind com `source(none)`,
`tw-animate-css` e todos os tokens. Ele também define utilitários `ds-*`,
estilos de base, tema claro/escuro e
classes auxiliares usadas pelos componentes. `globals.css` é o entry público de
produção e exclui `*.stories.*` do scan de classes; `storybook.css` acrescenta
as fontes do catálogo e é importado somente pelo preview do Storybook.

## Entry points

```ts
import "@system-automation/design-system/globals.css";
import { Button } from "@system-automation/design-system/components/ui";
import { PageShell } from "@system-automation/design-system/components";
import { CentralThemeProvider } from "@system-automation/design-system/components/providers";
import { useDebounce } from "@system-automation/design-system/hooks";
import { cn, toast } from "@system-automation/design-system/lib";
```

## Tema

O tema usa classes no documento:

```text
light
dark
```

No app consumidor, use `ThemeInitScript` no `<head>` e
`CentralThemeProvider` envolvendo a aplicação.

## Evolução

Fluxo recomendado:

```powershell
pnpm lint
pnpm test
pnpm typecheck
pnpm build-storybook
```

Ao criar componente reutilizável, inclua a story e, quando houver comportamento,
teste unitário.

