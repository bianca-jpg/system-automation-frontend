---
slug: 260908-cfp
description: Nova aba "Config. de Parâmetros" no sidebar; move os quadros de solicitações e histórico de parâmetros para fora de Gestão de Usuários
date: 2026-09-08
repo: frontend
branch: develop
---

# Quick Task 260908-cfp — Aba "Config. de Parâmetros"

## Objetivo

Separar as duas responsabilidades que hoje convivem em `/usuarios`:

- **Config. de Parâmetros** (nova rota) — solicitações pendentes de parâmetros + histórico de decisões
- **Gestão de Usuários** (`/usuarios`) — apenas usuários e permissões

Motivação da usuária: decisão de parâmetro é assunto de parâmetro, então deve ficar
colada em Parâmetros no menu; e Gestão de Usuários passa a ter um escopo próprio,
que numa aplicação pequena é o que faz a área ganhar sentido.

## Decisões travadas (respondidas pela usuária em 2026-09-08)

| Questão | Decisão |
|---|---|
| Quem enxerga a aba | `administrador` (40) e `admin_tecnico` (50) — mesmo gate de hoje |
| Label no sidebar | `Config. de Parâmetros` |
| Ícone | `Settings` (já exportado por `shared/ui/icons.ts`) |
| Posição | Grupo **Administração**, logo abaixo de Parâmetros |

Rota escolhida: `/configuracoes-parametros`.

## Estado atual (verificado no código)

`app/(app)/usuarios/page.tsx` renderiza três quadros nesta ordem:

1. `UserManagementTable` — "Solicitações pendentes de parâmetros" (`pending`) → **move**
2. `ParameterHistoryTable` — histórico de decisões (`history`) → **move**
3. `UserManagementTable` — "Usuários e permissões" (`users`) → **fica**

Mais o `ParameterRequestModal` (decisão aprovar/rejeitar), que acompanha o quadro 1.

## Tarefas

### T1 — Rota, gate e metadados (commit 1)

- `shared/config/routes.ts`: `AppSectionId` ganha `"configuracoes-parametros"`;
  `routes.configuracoesParametros = "/configuracoes-parametros"`; `pathToSection`
  testa a rota nova **antes** de `parametros` (defesa contra substring, mesmo que
  hoje `/configuracoes-parametros` não contenha `/parametros`).
- `shared/config/auth/automation-roles.ts`: `canAccessPath` passa a exigir nível
  `administrador` para a rota nova, no mesmo formato do bloco de `routes.usuarios`.
  **Sem isso a rota fica acessível por URL direta** — o sidebar só esconde o link.
- `shared/config/page-metadata.ts`: nova chave `configuracoesParametros`, título
  "Configurações de Parâmetros", volta para a Visão Geral.
- `widgets/app-shell/ui/app-sidebar.tsx`: `SidebarNavItem` novo dentro do mesmo
  `<Can minLevel={ROLE_LEVEL.administrador}>`, entre Parâmetros e Gestão de Usuários.
- `shared/config/auth/automation-roles.test.ts`: cobre o gate da rota nova.

### T2 — Página nova (commit 2)

- `features/parametros/ui/configuracoes-parametros-page-skeleton.tsx`: esqueleto com
  as duas tabelas reais (solicitações 6 colunas, histórico 7 colunas), espelhando o
  molde de `usuarios-page-skeleton.tsx`.
- `app/(app)/configuracoes-parametros/page.tsx`: recebe os quadros 1 e 2 e o
  `ParameterRequestModal`, com os helpers `toRequestRow`/`toHistoryItem`/`formatUsuario`/
  `CHANGE_TYPE_LABEL` que hoje moram em `usuarios/page.tsx`. Mantém `Can`,
  `FeatureBoundary`, `PageShell`, `StandardPageHeader` e `usePagedResource` iguais.

### T3 — Enxugar Gestão de Usuários (commit 3)

- `app/(app)/usuarios/page.tsx`: remove os dois quadros, o modal, os helpers que
  migraram e os três estados de busca/ordenação que viraram órfãos (`pending*`,
  `history*`). Sobra um único recurso paginado (`users`).
- `features/usuarios/ui/usuarios-page-skeleton.tsx`: passa a reservar uma tabela só.
- `app/(app)/usuarios/page.test.tsx` e `page.roles.test.tsx`: os casos que exercitam
  solicitação/histórico/modal migram para um teste da página nova; ficam os de usuário.

## Fora de escopo

- Backend: nenhuma mudança. Os endpoints (`fetchChangeRequests`, `reviewChangeRequest`)
  continuam iguais, só mudou quem os chama.
- Design system: nada editado em `design-system/` (é vendor).
- As telas nascem sem dados enquanto o token do Databricks estiver vencido — problema
  independente, diagnosticado na mesma sessão.

## Verificação

- `pnpm typecheck`
- `pnpm lint`
- `pnpm vitest run` nos arquivos tocados
- Conferir no navegador: aba aparece abaixo de Parâmetros, os dois quadros abrem lá,
  `/usuarios` fica só com a tabela de usuários.
