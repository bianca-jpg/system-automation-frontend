---
phase: 260828-fz2
plan: 01
subsystem: ui
tags: [react, hooks, pagination, fsd, refactor]

requires: []
provides:
  - "usePagedResource consolidado em shared/hooks/, superconjunto único de paginação por número de página"
  - "enabled opcional (default true) no hook consolidado"
  - "parametros e usuarios migrados para o hook consolidado com refreshing separado de loading"
affects: [pedidos, parametros, usuarios]

tech-stack:
  added: []
  patterns:
    - "Ajuste de estado durante o render (setState condicional no corpo do componente, sem useEffect) para travas derivadas de dados assíncronos — usado em vez de useRef porque o lint deste projeto (react-hooks/refs) proíbe ler ref.current durante o render"

key-files:
  created:
    - shared/hooks/use-paged-resource.ts
    - shared/hooks/use-paged-resource.test.tsx
  modified:
    - features/pedidos/model/use-pedidos-queues.ts
    - widgets/pedido-dashboard/ui/orders-list.tsx
    - app/(app)/parametros/page.tsx
    - app/(app)/usuarios/page.tsx

key-decisions:
  - "usePagedResource (ex-features/pedidos/model) é a implementação canônica; useNumberedResource foi apagado e suas duas asserções de teste portadas"
  - "loading das tabelas migradas passa a loading || refreshing para não perder o feedback de paginação"
  - "Trava de esqueleto de carga inicial via setState-durante-render (não useRef) para respeitar o lint react-hooks/refs deste projeto"

requirements-completed: [QUICK-260828-fz2]

duration: 25min
completed: 2026-08-28
status: complete
---

# Quick Task 260828-fz2: Consolidar hooks de paginação por número Summary

**Um único `usePagedResource` em `shared/hooks/` substitui `usePagedResource` (features/pedidos) e `useNumberedResource` (shared/hooks), com `enabled` opcional e os 8 call sites (pedidos, parametros, usuarios) migrados.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3/3 completos
- **Files modified:** 6 (2 criados, 4 modificados) + 2 arquivos apagados

## Accomplishments

- `shared/hooks/use-paged-resource.ts` criado como implementação única de paginação por número de página, sem dependência de `features/pedidos` (constante `DEFAULT_PAGE_SIZE = 25` local em vez do import de `DEFAULT_CURSOR_PAGE_SIZE`).
- `enabled` tornado opcional (default `true`) sem alterar nenhum call site existente que já o passava explicitamente.
- Os 8 call sites (2 em `use-pedidos-queues.ts`, 1 em `orders-list.tsx`, 2 em `parametros/page.tsx`, 3 em `usuarios/page.tsx`) migrados para o hook consolidado.
- `shared/hooks/use-numbered-resource.ts` e `.test.tsx` apagados; as duas asserções que continham vivem agora em `shared/hooks/use-paged-resource.test.tsx`.
- `pnpm typecheck`, `pnpm lint` e todas as suítes relacionadas passam.

## Task Commits

Each task was committed atomically:

1. **Task 1: Mover usePagedResource para shared/hooks, tornar enabled opcional e portar os testes** - `fdfe38b` (feat)
2. **Task 2: Migrar parametros e usuarios para o hook consolidado e apagar useNumberedResource** - `13cc4c7` (feat)
3. **Fix (found during Task 3 gates): trocar ref por state na trava de esqueleto inicial** - `46f0690` (fix)
3b. **Task 3: Gates finais e registro da escolha no SUMMARY** - sem alterações de código, só verificação (este arquivo)

**Plan metadata:** commit final feito pelo orquestrador (SUMMARY.md, STATE.md).

## Files Created/Modified

- `shared/hooks/use-paged-resource.ts` - hook consolidado de paginação por número de página (novo)
- `shared/hooks/use-paged-resource.test.tsx` - teste colocado, 2 asserções portadas de `use-numbered-resource.test.tsx` (novo)
- `features/pedidos/model/use-pedidos-queues.ts` - import atualizado para `@/shared/hooks/use-paged-resource`
- `widgets/pedido-dashboard/ui/orders-list.tsx` - import atualizado (call site `historyProducts`)
- `app/(app)/parametros/page.tsx` - migrado para `usePagedResource`; trava de esqueleto inicial via `useState`; `loading` da tabela vira `loading || refreshing`
- `app/(app)/usuarios/page.tsx` - migrado para `usePagedResource` nas 3 chamadas; trava de esqueleto inicial via `useState`; `loading` das 3 tabelas vira `loading || refreshing`
- `features/pedidos/model/use-paged-resource.ts` - apagado (movido para `shared/hooks/`)
- `shared/hooks/use-numbered-resource.ts` - apagado
- `shared/hooks/use-numbered-resource.test.tsx` - apagado

## Decisions Made

- **Prop `loading` das tabelas de parametros/usuarios ficou como `loading || refreshing`.** Com o hook consolidado, trocar de página depois da primeira carga produz `refreshing: true` e `loading: false`. Passar só `loading` apagaria o feedback de carregamento na paginação, que hoje existe nessas telas. `loading || refreshing` preserva exatamente o comportamento visual anterior sem mudar nenhuma outra parte da UI.
- **Foi preciso travar o esqueleto de carga inicial nas duas telas.** O hook consolidado zera `loadedOnce` (`loading: true`) sempre que `queryKey` muda — comportamento deliberado do hook canônico (ver próxima seção). Sem uma trava local, cada tecla na busca (após debounce) e cada clique de ordenação passariam a trocar `parametros`/`usuarios` inteiras pelo esqueleto de carga, desmontando o próprio campo de busca em foco no meio da digitação. A trava (`parametrosJaCarregaram`/`usuariosJaCarregaram`) marca, uma vez, que a tela já teve sua primeira carga bem-sucedida; a partir daí o esqueleto nunca mais reaparece — buscar/ordenar recarrega em cima da tabela existente.
- **Efeito colateral aceito: reset visível de linhas na troca de busca/ordenação.** Como o hook consolidado zera o estado (`rows: []`, `loadedOnce: false`) na troca de `queryKey`, a tabela em si (não a tela inteira, graças à trava acima) mostra brevemente "vazia + carregando" em vez de manter as linhas antigas até a resposta nova chegar. É comportamento deliberado do hook canônico: dados de outro filtro não são "last-good" válido para a chave nova — evita mostrar resultado de um filtro como se fosse de outro. Este plano não alterou essa regra (documentada no `<discovery_notes>` do PLAN.md), só evitou que ela vazasse para a tela inteira nas telas administrativas.
- **O consumidor extra `orders-list.tsx` (`historyProducts`) foi encontrado no planejamento e teve o import migrado junto.** O briefing original de escopo mencionava só `use-pedidos-queues.ts` como consumidor de `usePagedResource`; o levantamento de planejamento (`<discovery_notes>` item 1) identificou um segundo consumidor direto na linha 517 de `orders-list.tsx` (fila `historyProducts`), cujo import também precisou ser atualizado.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Trava de esqueleto inicial trocada de `useRef` para `useState` (violava lint do projeto)**

- **Found during:** Task 3 (gate `pnpm lint`, ao final da Task 2)
- **Issue:** O plano instruía criar a trava com `useRef` (`const parametrosJaCarregaramRef = useRef(false)` / `usuariosJaCarregaramRef`), lida durante o render para derivar `parametersLoading`/`initialLoading`. O ESLint deste projeto tem a regra `react-hooks/refs` (React Compiler), que proíbe ler `ref.current` durante o render — `pnpm lint` falhou com 14 erros nos dois arquivos.
- **Fix:** Trocado `useRef` por `useState` com ajuste de estado durante o render (`if (condição && !estado) setEstado(true)`), o mesmo padrão que o próprio `usePagedResource` já usa internamente para resetar `navigation` na troca de `queryKey`. Semântica idêntica (latch que só vai de `false` para `true` e nunca mais volta), zero mudança de comportamento visível.
- **Files modified:** `app/(app)/parametros/page.tsx`, `app/(app)/usuarios/page.tsx`
- **Verification:** `pnpm lint` limpo (0 erros); `pnpm typecheck` limpo; `npx vitest run parametros/page usuarios/page` — 45/45 testes verdes, incluindo os dois testes de esqueleto (`parametros/page.test.tsx` busca/ordenação, `parametros/page.roles.test.tsx`) que motivaram a trava.
- **Committed in:** `46f0690` (commit de correção separado, após o commit da Task 2, seguindo a regra de nunca fazer `amend`)

---

**Total deviations:** 1 auto-fixed (1 bug — Rule 1)
**Impact on plan:** Correção necessária para passar o gate de lint do próprio projeto; nenhuma mudança de comportamento ou escopo além do que o PLAN.md já pedia.

## Issues Encountered

- `pnpm test` (suíte completa) apresentou 2 falhas em `widgets/pedido-dashboard/ui/orders-list.pagination.test.tsx` (timeout em `waitFor` do rodapé de paginação e timeout de teste em "reutiliza a mesma chave idempotente"). Conforme a interpretação obrigatória do PLAN.md (Task 3): este arquivo tem instabilidade PRÉ-EXISTENTE sob carga da suíte completa, documentada no próprio plano. Critério aplicado: falha nele só conta como regressão se também falhar isolado. Rodando isolado (`npx vitest run orders-list.processing orders-list.pagination`), os 18 testes desse mesmo escopo passaram 100%. Nenhum outro arquivo falhou na suíte completa (57/58 arquivos, 488/490 testes). Classificado como flakiness pré-existente, não regressão desta tarefa.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Existe agora exatamente uma implementação de paginação por número de página no repositório (`shared/hooks/use-paged-resource.ts`), consumida por pedidos (filas + histórico) e pelas telas administrativas (parametros, usuarios).
- Nenhum arquivo em `shared/` importa de um diretório de `features/`.
- Nenhum blocker identificado para trabalho futuro nessas telas.

---

_Quick task: 260828-fz2_
_Completed: 2026-08-28_

## Self-Check: PASSED

All created/modified files confirmed present on disk (`shared/hooks/use-paged-resource.ts`, `shared/hooks/use-paged-resource.test.tsx`, `app/(app)/parametros/page.tsx`, `app/(app)/usuarios/page.tsx`, `features/pedidos/model/use-pedidos-queues.ts`, `widgets/pedido-dashboard/ui/orders-list.tsx`). All deleted files confirmed absent (`features/pedidos/model/use-paged-resource.ts`, `shared/hooks/use-numbered-resource.ts`, `shared/hooks/use-numbered-resource.test.tsx`). All 3 code commits confirmed in `git log` (`fdfe38b`, `13cc4c7`, `46f0690`).
