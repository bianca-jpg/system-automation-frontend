# Storybook

O Storybook deste repositório documenta os componentes, tokens e padrões do
Design System da T&T.

## Subir localmente

```powershell
pnpm install
pnpm storybook
```

URL:

```text
http://localhost:6006
```

## Gerar build estático

```powershell
pnpm build-storybook
```

Saída:

```text
storybook-static/
```

Essa pasta pode ser publicada em S3 + CloudFront, Vercel, Netlify, GitHub Pages
ou em um servidor interno.

## Configuração

```text
.storybook/main.ts
.storybook/preview.tsx
```

O Storybook usa:

- `@storybook/nextjs-vite`
- `@storybook/addon-docs`
- `@storybook/addon-themes`
- `@storybook/addon-a11y`

## Onde ficam as stories

```text
stories/**/*.stories.@(ts|tsx|mdx)
components/**/*.stories.@(ts|tsx|mdx)
```

## Checklist para novas stories

- mostrar estados principais;
- cobrir tema claro e escuro quando cor/contraste importam;
- incluir loading, erro, disabled e empty quando fizer sentido;
- não usar dados reais de candidatos, gestores ou colaboradores;
- manter examples sem dependência de backend.

