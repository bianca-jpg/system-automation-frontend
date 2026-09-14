---
slug: 260908-cfp
status: incomplete
date: 2026-09-08
repo: frontend
branch: develop
commit: null
---

# Summary — 260908-cfp — Aba "Config. de Parâmetros"

**Status: implementado e verificado, NÃO commitado.** Aguardando a usuária escrever/
aprovar a mensagem de commit.

## O que mudou

Nova rota `/configuracoes-parametros` recebe os dois quadros de parâmetros que moravam
em `/usuarios`. Gestão de Usuários ficou só com usuários e permissões.

| Arquivo | Mudança |
|---|---|
| `shared/config/routes.ts` | `AppSectionId` + `routes.configuracoesParametros`; `pathToSection` testa a rota nova antes de `parametros` |
| `shared/config/auth/automation-roles.ts` | `canAccessPath` exige nível 40 na rota nova (trava de URL direta) |
| `shared/config/page-metadata.ts` | chave `configuracoesParametros`, título "Configurações de Parâmetros" |
| `widgets/app-shell/ui/app-sidebar.tsx` | `SidebarNavItem` com ícone `Settings`, entre Parâmetros e Gestão de Usuários, dentro do `Can` de administrador |
| `app/(app)/configuracoes-parametros/page.tsx` | **novo** — solicitações pendentes + histórico + `ParameterRequestModal` |
| `features/parametros/ui/configuracoes-parametros-page-skeleton.tsx` | **novo** — esqueleto das duas tabelas |
| `app/(app)/usuarios/page.tsx` | −197 linhas: só a tabela de usuários; saíram os dois quadros, o modal, os helpers e os estados órfãos |
| `features/usuarios/ui/usuarios-page-skeleton.tsx` | reserva uma tabela em vez de duas |
| testes | cobertura de parâmetros migrou para `configuracoes-parametros/page.test.tsx` + `page.roles.test.tsx` (novos); `usuarios/*` ficou com a de usuário; `automation-roles.test.ts` ganhou o gate da rota nova |

Saldo: **121 inserções, 450 remoções** em 9 arquivos modificados + 4 novos.

## Decisões da usuária (2026-09-08)

- Visibilidade: `administrador` (40) e `admin_tecnico` (50) — mesmo gate de antes
- Label: `Config. de Parâmetros` (abreviado, para caber em uma linha no sidebar)
- Ícone: `Settings`
- Posição: grupo Administração, logo abaixo de Parâmetros

## Verificação executada

- `pnpm typecheck` — limpo
- `pnpm lint` — limpo
- `pnpm vitest run` nos 8 arquivos afetados — **85 testes passando**
- `pnpm build` — compila; `/configuracoes-parametros` listada nas rotas do App Router
- Navegador: `/configuracoes-parametros` sem sessão redireciona para o login (gate do
  `proxy.ts` ativo)

## Não verificado

A tela **logada** não foi aberta: a autenticação é via Microsoft e a sessão é da
usuária. Falta conferir visualmente a posição do item no sidebar (incluindo o modo
recolhido, só ícones) e o render dos dois quadros na página nova.

Independente disso, as tabelas vão aparecer vazias enquanto o `DATABRICKS_TOKEN`
estiver vencido — diagnóstico separado, feito na mesma sessão.

## Fora de escopo

- Backend: nada mudou; `fetchChangeRequests`/`reviewChangeRequest` seguem iguais
- `design-system/`: não tocado (é vendor)
