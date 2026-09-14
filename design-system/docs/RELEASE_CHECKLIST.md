# Checklist de release

## Antes de publicar ou compartilhar

- conferir se stories novas não usam dados reais;
- conferir se componentes novos estão exportados;
- conferir se `foundation.css` continua importando todos os tokens;
- conferir se `globals.css` exclui stories e se `storybook.css` inclui o
  catálogo completo;
- conferir se peer dependencies continuam corretas;
- conferir se o app destino usa React/Next compatíveis.

## Validação local

```powershell
pnpm install
pnpm lint
pnpm test
pnpm typecheck
pnpm build-storybook
```

## Publicar Storybook

```powershell
pnpm build-storybook
```

Publique:

```text
storybook-static/
```

## Quando criar nova versão

- mudança em tokens;
- novo componente reutilizável;
- alteração de variante visual;
- correção de acessibilidade;
- mudança de contrato de import/export;
- mudança de peer dependency.

