# Consumir em outro projeto

## Opção 1: workspace pnpm

Em um monorepo consumidor, adicione este repositório como pacote workspace ou
submodule em:

```text
packages/design-system
```

No app:

```json
{
  "dependencies": {
    "@system-automation/design-system": "workspace:*"
  }
}
```

## Opção 2: registry privado

Se o pacote for publicado em registry privado, o app consumidor instala uma
versão fixa:

```powershell
pnpm add @system-automation/design-system
```

## Configurar Next.js

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@system-automation/design-system"],
};

export default config;
```

## Configurar layout raiz

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

## Checklist do app consumidor

- `@system-automation/design-system` instalado;
- `transpilePackages` inclui `@system-automation/design-system`;
- `@system-automation/design-system/globals.css` importado uma vez;
- `ThemeInitScript` roda no `<head>`;
- `CentralThemeProvider` envolve a aplicação;
- tokens e componentes vêm do pacote, sem copiar cores soltas.

