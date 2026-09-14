---
phase: 260904-fr5
plan: 01
subsystem: frontend-layout
tags: [layout, css, design-system-consumer, cleanup]
dependency-graph:
  requires: []
  provides:
    - "Espaçamento cabeçalho→conteúdo com fonte única (gap-6 do PageShell) nas seis telas reais e nos quatro esqueletos de moldura de página"
  affects:
    - "app/(app)/visao-geral/page.tsx"
    - "app/(app)/pedidos/page.tsx"
    - "app/(app)/historico/page.tsx"
    - "app/(app)/alertas/page.tsx"
    - "app/(app)/parametros/page.tsx"
    - "app/(app)/usuarios/page.tsx"
    - "app/(app)/loading.tsx"
    - "widgets/pedido-dashboard/ui/orders-list-skeleton.tsx"
    - "widgets/pedido-dashboard/ui/dashboard-overview-skeleton.tsx"
    - "features/usuarios/ui/usuarios-page-skeleton.tsx"
tech-stack:
  added: []
  patterns:
    - "Espaçamento vertical entre cabeçalho e primeiro filho vem só do gap-6 do container flex (PageShell ou equivalente), nunca de margin-top no filho"
key-files:
  created: []
  modified:
    - "app/(app)/visao-geral/page.tsx"
    - "app/(app)/pedidos/page.tsx"
    - "app/(app)/historico/page.tsx"
    - "app/(app)/alertas/page.tsx"
    - "app/(app)/parametros/page.tsx"
    - "app/(app)/usuarios/page.tsx"
    - "app/(app)/loading.tsx"
    - "widgets/pedido-dashboard/ui/orders-list-skeleton.tsx"
    - "widgets/pedido-dashboard/ui/dashboard-overview-skeleton.tsx"
    - "features/usuarios/ui/usuarios-page-skeleton.tsx"
decisions:
  - "Task 2 (destino da l. 62 de usuarios-page-skeleton.tsx e do comentário l. 59-61): a desenvolvedora escolheu option-manter — nenhuma edição nesse segundo sítio nem no comentário."
metrics:
  duration: "~15min"
  completed: "2026-09-04"
status: complete
---

# Phase 260904-fr5 Plan 01: Remover mt-8 redundante do espaçamento cabeçalho→conteúdo Summary

Removida a margem superior de 32px duplicada (`mt-8`) em dez sítios que são o primeiro irmão logo após o cabeçalho de página, deixando o `gap-6` do `PageShell` (24px) como única fonte do respiro cabeçalho→conteúdo.

## O que foi feito

O `PageShell` do design system é `flex flex-col gap-6` (24px entre filhos diretos). Em dez arquivos, o call site cancelava a margem inferior própria do cabeçalho (`className="mb-0"`) e acrescentava `mt-8` (32px) no irmão seguinte. Como `gap` de flex e `margin-top` de filho não colapsam, o respiro real era 24+32 = 56px em vez de 24px.

Task 1 (única task auto deste plano) removeu o token `mt-8` (ou, nos dois sítios combinados com outras classes de flex, só o token de margem) nos dez sítios abaixo, localizados por busca de conteúdo (Grep) antes de cada edição — os números de linha do plano bateram exatamente com o estado atual do código, sem drift:

| # | Arquivo | Sítio | Resultado |
|---|---|---|---|
| 1 | `app/(app)/visao-geral/page.tsx` | `<div className="mt-8">` (l. 45) | `<div>` |
| 2 | `app/(app)/pedidos/page.tsx` | `<div className="mt-8">` (l. 41) | `<div>` |
| 3 | `app/(app)/historico/page.tsx` | `<div className="mt-8">` (l. 41) | `<div>` |
| 4 | `app/(app)/alertas/page.tsx` | `<div className="mt-8">` (l. 41) | `<div>` |
| 5 | `app/(app)/parametros/page.tsx` | `<div className="mt-8 flex flex-col gap-6">` (l. 249) | `<div className="flex flex-col gap-6">` |
| 6 | `app/(app)/usuarios/page.tsx` | `<div className="mt-8 flex flex-col gap-6">` (l. 250) | `<div className="flex flex-col gap-6">` |
| 7 | `app/(app)/loading.tsx` | `<div className="mt-8">` (l. 40) | `<div>` |
| 8 | `widgets/pedido-dashboard/ui/orders-list-skeleton.tsx` | `<div className="mt-8">` (l. 358) | `<div>` |
| 9 | `widgets/pedido-dashboard/ui/dashboard-overview-skeleton.tsx` | `<div className="mt-8">` (l. 137) | `<div>` |
| 10 | `features/usuarios/ui/usuarios-page-skeleton.tsx` | `<div className="mt-8">` dentro de `UsuariosPageSkeleton`, após `<StandardPageHeader page="usuarios" className="mb-0" />` (l. 85) | `<div>` |

Em nenhum caso o elemento wrapper foi removido — só o atributo de classe. Os dez `className="mb-0"` dos cabeçalhos permaneceram intocados. `features/parametros/ui/parameter-history-table.tsx` e `design-system/` terminaram com blob inalterado.

## Task 2 — decisão do desenvolvedor (checkpoint já resolvido, sem edição)

`features/usuarios/ui/usuarios-page-skeleton.tsx` tem um **segundo** sítio de `mt-8` (l. 62, dentro de `UsuariosDataSkeleton`, entre os dois blocos de tabela) que **não** é espaçamento cabeçalho→conteúdo — é espelho deliberado da margem própria da `ParameterHistoryTable` (`w-full mt-8`), para o esqueleto não pular quando os dados entram.

A desenvolvedora escolheu **option-manter**: nenhuma edição nesse segundo sítio nem no comentário explicativo das linhas 59-61, que segue factualmente correto (ele descreve a l. 62, não a l. 85, que foi a única alterada pela Task 1). A paridade esqueleto↔carregado das duas tabelas de Usuários (56px de respiro entre elas) permanece intencional e inalterada.

## Task 3 — pendente, fora do escopo deste executor

A revisão visual das seis telas e dos quatro esqueletos (`checkpoint:human-verify`) **não foi realizada por este executor** — é responsabilidade do orquestrador (sessão principal), que conduzirá a desenvolvedora pelo roteiro descrito no plano (subir `pnpm dev`, percorrer as seis rotas, checar throttling de rede para os esqueletos, e validar especificamente o comportamento de `/usuarios` e `/parametros`).

## Verificação automatizada (Task 1) — todas passaram

- `grep -rn 'mt-8' --include='*.tsx' app widgets` → zero ocorrências (exit 1, sem match)
- `grep -rn 'mb-0' --include='*.tsx' app features widgets` → 10 ocorrências
- `grep -c 'w-full mt-8' features/parametros/ui/parameter-history-table.tsx` → 1 (inalterado)
- `git diff -U0 -- app widgets features | grep -cE '^[-+][^-+]'` → 20 (dez linhas trocadas, uma por arquivo)
- `pnpm typecheck` → limpo
- `pnpm lint` → limpo, sem warning novo

## Follow-up registrado (fora do escopo deste plano)

`app/(app)/parametros/page.tsx` linha 243 tem `<div className="mt-6">` no bloco condicional de erro de carga, que também é irmão logo após o cabeçalho. Depois deste plano, a tela de Parâmetros em estado de erro fica com 24+24 = 48px de respiro, enquanto o estado normal tem 24px — mesma classe de problema deste plano, mas fora da lista de dez sítios autorizada e explicitamente fora de escopo por instrução ("não tocar em mais nada"). Sugestão: tratar em quick task separada.

## Deviations from Plan

None - Task 1 executada exatamente como escrita no plano. Nenhuma correção Rule 1-3 foi necessária; typecheck e lint já vieram limpos na primeira tentativa.

## Known Stubs

Nenhum.

## Self-Check: PASSED

- FOUND: app/(app)/visao-geral/page.tsx
- FOUND: app/(app)/pedidos/page.tsx
- FOUND: app/(app)/historico/page.tsx
- FOUND: app/(app)/alertas/page.tsx
- FOUND: app/(app)/parametros/page.tsx
- FOUND: app/(app)/usuarios/page.tsx
- FOUND: app/(app)/loading.tsx
- FOUND: widgets/pedido-dashboard/ui/orders-list-skeleton.tsx
- FOUND: widgets/pedido-dashboard/ui/dashboard-overview-skeleton.tsx
- FOUND: features/usuarios/ui/usuarios-page-skeleton.tsx
- FOUND commit: c493614 (git log --oneline -1 confirms it is HEAD on `develop`)
