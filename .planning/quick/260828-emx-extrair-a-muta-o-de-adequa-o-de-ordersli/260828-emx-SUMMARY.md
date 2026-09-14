---
phase: 260828-emx
plan: 01
subsystem: ui
tags: [react, hooks, refactor, testing, vitest, adequacao]

# Dependency graph
requires: []
provides:
  - "widgets/pedido-dashboard/model/use-adequacao-processing.ts — hook único do ciclo submissão → polling → retry da adequação de OR"
  - "widgets/pedido-dashboard/model/ criado como irmão de lib/ e ui/, espelhando features/pedidos/model/"
affects: [orders-list-refactor, pedido-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Widget hooks vivem em widgets/<widget>/model/use-*.ts, mesmo padrão de features/pedidos/model/"
    - "Estado/refs de mutação isolados em hook próprio, com setConfirmModal injetado como opção para manter o modal compartilhado no componente"

key-files:
  created:
    - widgets/pedido-dashboard/model/use-adequacao-processing.ts
    - widgets/pedido-dashboard/model/use-adequacao-processing.test.tsx
  modified:
    - widgets/pedido-dashboard/ui/orders-list.tsx

key-decisions:
  - "Hook não chama useRealtime() diretamente — recebe ordersRevision por parâmetro, preservando uma única assinatura de realtime na árvore e o mock existente do teste de integração"
  - "refetchSummary recebe a prop crua refetchOrders (não o callback memoizado de orders-list.tsx), preservando a semântica de retorno booleano usada para decidir sucesso vs aviso"

patterns-established:
  - "Refactor estrutural puro: corpos de função copiados sem reescrita; único ponto de mudança é a origem das dependências de closure"

requirements-completed: [QUICK-260828-emx]

# Metrics
duration: ~35min
completed: 2026-08-28
status: complete
---

# Quick Task 260828-emx: Extrair hook useAdequacaoProcessing de orders-list.tsx Summary

**Hook `useAdequacaoProcessing` isolado em `widgets/pedido-dashboard/model/`, cobrindo submissão/polling/retry/idempotência da adequação de OR, com `orders-list.tsx` reduzido de 2069 para 1701 linhas e teste unitário novo do hook isolado (6 casos).**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3/3 completos
- **Files modified:** 3 (1 criado + 1 criado + 1 modificado)

## Accomplishments

- `use-adequacao-processing.ts` criado como única definição do ciclo submissão → polling → retry da OR (idempotência, reentrância, guarda de montagem, wake por realtime)
- `orders-list.tsx` religado ao hook, sem sobrar nenhum símbolo da fatia de mutação no componente; `orders-list.processing.test.tsx` passa sem uma linha alterada (8/8)
- Teste unitário novo (`use-adequacao-processing.test.tsx`) exercitando o hook isolado via `renderHook`, cobrindo submissão feliz, reentrância, falha de polling, rotação de chave idempotente, terminal divergente e abort na desmontagem

## Task Commits

Each task was committed atomically directly em `develop`:

1. **Task 1: Criar o hook useAdequacaoProcessing com a fatia movida** - `bf2fca7` (feat)
2. **Task 2: Religar orders-list.tsx ao hook e remover o código movido** - `72fe9b6` (refactor)
3. **Task 3: Teste unitário do hook isolado e gates completos** - `9369a2c` (test)

_Note: Task 3 foi test-after — a implementação já existia da Task 1; o `tdd="true"` cobriu a escrita do teste isolado contra o comportamento já movido, não um ciclo RED→GREEN clássico._

## Files Created/Modified

- `widgets/pedido-dashboard/model/use-adequacao-processing.ts` - Hook `useAdequacaoProcessing`: submissão, polling, retry, estado de progresso da OR (420 linhas)
- `widgets/pedido-dashboard/model/use-adequacao-processing.test.tsx` - Teste unitário isolado do hook via `renderHook` (271 linhas, 6 casos)
- `widgets/pedido-dashboard/ui/orders-list.tsx` - Removida a fatia de mutação; componente consome o hook e mantém `confirmModal` compartilhado (2069 → 1701 linhas)

## Decisions Made

- `useAdequacaoProcessing` não chama `useRealtime()` — recebe `ordersRevision` como opção, preservando uma única assinatura de realtime na árvore de componentes e o mock do teste de integração existente.
- `refetchSummary` é a prop crua `refetchOrders` de `OrdersList` (`injectedRefetchOrders`), não o `refetchOrders` memoizado do componente — o fluxo depende do valor booleano de retorno para decidir sucesso vs aviso; o memoizado devolve `void` e dispararia `reloadAllOrders` de novo.
- `setConfirmModal` entra como opção injetada, incluída nos arrays de dependência dos `useCallback` internos — identidade estável por garantia do React, sem necessidade de desligar `exhaustive-deps`.

## Deviations from Plan

None - plan executado exatamente como escrito. Todos os blocos da tabela "Move para o hook" foram copiados byte-equivalentes (invariantes de idempotência, guarda de reentrância, `finally` condicional ao `AbortController` corrente, checagens de `mounted || signal.aborted`, ordem de declaração dos três efeitos preservada).

## Issues Encountered

None.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness

- `widgets/pedido-dashboard/model/` está criado e estabelecido como padrão para as próximas fatias do refactor de `orders-list.tsx` (aprovação por produto, ações por linha, busca/filtro/ordenação, rascunho de comunicação seguem no componente, aguardando fatias futuras).
- `orders-list.tsx` ainda tem 1701 linhas — a extração desta fatia (a mais crítica: idempotência/polling/retry) reduz o risco das próximas fatias, que devem ser mais simples de isolar.
- `pnpm test` completo: 525/527, únicas falhas em `orders-list.pagination.test.tsx` (2 timeouts) — instabilidade pré-existente já documentada no baseline do projeto, não uma regressão desta mudança.

---

_Task: 260828-emx_
_Completed: 2026-08-28_

## Self-Check: PASSED

- FOUND: widgets/pedido-dashboard/model/use-adequacao-processing.ts
- FOUND: widgets/pedido-dashboard/model/use-adequacao-processing.test.tsx
- FOUND: widgets/pedido-dashboard/ui/orders-list.tsx
- FOUND commit: bf2fca7
- FOUND commit: 72fe9b6
- FOUND commit: 9369a2c
