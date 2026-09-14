---
phase: 260909-gh7
plan: 01
subsystem: ui
tags: [react, typescript, vitest, alertas, priority-alerts-card]

requires:
  - phase: 260909-ek7 (backend, já mesclada em develop/origin)
    provides: "GET /api/v1/alertas passa a devolver linhas kind:'integracao' (banco de dados instável, estoque Databricks indisponível)"
provides:
  - "OrderAlert.kind opcional ('negocio' | 'integracao') em shared/types/models.ts"
  - "Etiqueta comum 'Problemas de integração' para integracao_banco_de_dados e integracao_estoque em CATEGORY_LABELS"
  - "Pílula de filtro 'Integração' em FILTER_OPTIONS, predicado por kind (não por category)"
  - "5º bloco no guia informativo (Dialog) espelhando a pílula nova"
  - "Suíte vitest co-localizada nova para PriorityAlertsCard (7 casos)"
affects: [pedidos, aba-alertas]

tech-stack:
  added: []
  patterns:
    - "Etiquetas agrupadas em CATEGORY_LABELS: múltiplas category cruas mapeando para o mesmo rótulo de exibição, sem esconder a distinção real (que fica no title/message do backend)"
    - "Filtro de pílula por campo estrutural (kind) em vez de lista de category, para aceitar fontes futuras sem editar o componente de novo"

key-files:
  created:
    - features/pedidos/ui/priority-alerts-card.test.tsx
  modified:
    - shared/types/models.ts
    - features/pedidos/ui/priority-alerts-card.tsx

key-decisions:
  - "kind ficou opcional (não obrigatório) para não quebrar nenhum call site existente que monta OrderAlert à mão (fixtures, projeções de orders) — decisão do próprio plano (D-01), confirmada em pnpm typecheck limpo"
  - "Escape hatch do teste do guia informativo NÃO foi necessário: o Dialog do Radix montou normalmente em jsdom com fireEvent.click no gatilho, sem precisar remover a asserção"
  - "backstage_get_coding_standards não estava disponível nesta sessão (ferramenta MCP não exposta no toolset do executor) — prossegui seguindo as convenções observadas no próprio código, como o plano previa"

requirements-completed: [QUICK-260909-gh7]

duration: 12min
completed: 2026-09-09
---

# Quick Task 260909-gh7: Consumir kind de integração de GET /api/v1/alertas Summary

**`OrderAlert.kind?` opcional, etiqueta comum "Problemas de integração" para as duas fontes técnicas e pílula de filtro por `kind` no `PriorityAlertsCard`, com suíte TDD nova cobrindo os 7 casos (RED confirmado antes da implementação).**

## Performance

- **Duration:** ~12 min (commits às 12:04:50 e 12:11:54, -03:00)
- **Tasks:** 2/2 completas
- **Files modified:** 3 (1 tipo, 1 componente, 1 teste novo)

## Accomplishments
- `OrderAlert` ganhou `kind?: 'negocio' | 'integracao'`, aditivo e sem quebrar nenhum call site (`AlertCategory` intocado)
- As duas categorias técnicas (`integracao_banco_de_dados`, `integracao_estoque`) agora exibem "Problemas de integração" no badge, em vez da string crua
- Pílula "Integração" isola as duas fontes pelo predicado `kind === 'integracao'`, nunca por `category` — uma terceira fonte futura entra sozinha
- Guia informativo ganhou o 5º bloco (neutro, sem cor de severidade fixa) espelhando a pílula nova
- Suíte vitest nova (7 casos) para um componente que não tinha teste algum antes

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Campo kind no OrderAlert e suíte RED do PriorityAlertsCard** - `d77dc9d` (test)
2. **Task 2: Etiqueta comum, pílula de filtro por kind e verde geral** - `0f4cbfb` (feat)

_TDD: RED (Task 1, 4/7 casos falhando de propósito) → GREEN (Task 2, 7/7 passando). Sem REFACTOR — não houve limpeza necessária além do que já foi escrito direto no formato final._

## Files Created/Modified
- `shared/types/models.ts` - campo `kind?: 'negocio' | 'integracao'` acrescentado a `OrderAlert`, com comentário de uma linha explicando a distinção; `AlertCategory` byte a byte inalterado
- `features/pedidos/ui/priority-alerts-card.tsx` - 2 entradas novas em `CATEGORY_LABELS`, 6ª pílula em `FILTER_OPTIONS`, branch `kind === 'integracao'` em `visibleAlerts`, 5º bloco no guia informativo (Dialog)
- `features/pedidos/ui/priority-alerts-card.test.tsx` (novo) - 7 casos: etiqueta banco, agrupamento banco+estoque, severidade (guarda de regressão D-04), filtro "Integração", não-regressão "Estoque & Crédito" (guarda de regressão), pílula "Todos", guia informativo

## Decisions Made
- `kind` opcional em vez de obrigatório, exatamente como o plano especificou (D-01) — nenhum call site precisou de migração
- Nenhum type alias `AlertKind` exportado — union inline, porque nada mais no repo referencia esse tipo
- 5º bloco do guia informativo usa o estilo neutro (`bg-muted/15`, `ds-border-divider`, bolinha `bg-foreground`) porque a fonte de integração não tem severidade fixa (banco é error, estoque é warning)

## Deviations from Plan

None - plan executado exatamente como escrito. As duas ressalvas abaixo já estavam previstas no próprio plano como possibilidades, não como desvios:

- **Ferramenta `backstage_get_coding_standards` indisponível:** o servidor MCP `backstage` não estava exposto no toolset desta sessão de execução. Prossegui sem consultá-la, seguindo as convenções já observadas no código (registrado como possibilidade explícita em `<state_of_the_code>` do plano).
- **Escape hatch do teste do guia informativo NÃO foi acionado:** o `Dialog` do Radix montou normalmente em jsdom com `fireEvent.click` no `Pressable` gatilho (`title="Guia Informativo de Alertas"`), e a asserção `screen.getAllByText('Problemas de integração')` funcionou sem ajuste. O comentário no arquivo de teste que menciona o escape hatch foi mantido como documentação do raciocínio, mas nenhuma asserção precisou ser removida.

**Total deviations:** 0
**Impact on plan:** Nenhum.

## Issues Encountered

**Flakiness pré-existente, fora de escopo (não corrigido, per Scope Boundary):** ao rodar `pnpm test` (suíte inteira, 63 arquivos), 1-2 arquivos não relacionados a este quick task falharam de forma não-determinística em corridas diferentes:
- `widgets/pedido-dashboard/ui/orders-list.pagination.test.tsx` (falhou em 2 das 3 corridas completas, em testes/linhas diferentes a cada vez)
- `features/pedidos/ui/modals/new-message-modal.test.tsx` (falhou em 1 das 3 corridas, em teste diferente do de `orders-list`)

Nenhum dos dois importa ou depende de `kind`, `CATEGORY_LABELS` ou `FILTER_OPTIONS`. Ambos passam 100% quando rodados isoladamente (`npx vitest run <arquivo>`). Padrão consistente com contenção de recursos (CPU/memória) sob paralelismo total dos workers do vitest, não com uma regressão introduzida por este diff — nenhum teste relacionado às linhas de integração ou ao `PriorityAlertsCard` falhou em nenhuma das 3 corridas completas. `use-realtime-resource-refresh.test.tsx` e `use-alerts-communications.test.tsx` (as suítes de realtime que o plano exige continuarem verdes sem edição) passaram em todas as 3 corridas. Não investiguei mais fundo nem tentei corrigir, por estar fora do escopo desta task (Scope Boundary das deviation rules).

`priority-alerts-card.test.tsx` isolado: 7/7 verde, de forma estável, em todas as execuções.

## Verificação executada
1. `pnpm typecheck` — 0 erros (Task 1 e Task 2)
2. `npx vitest run priority-alerts-card.test.tsx` — Task 1: 3 passam / 4 falham (RED esperado); Task 2: 7/7 verde
3. `npx vitest run` (suíte inteira, 3 corridas) — sempre 536+/539 passando; falhas isoladas em arquivos não relacionados (ver acima); `priority-alerts-card`, `use-realtime-resource-refresh` e `use-alerts-communications` sempre verdes
4. `pnpm lint` — 0 warnings/erros
5. `git status --porcelain -- design-system features/realtime features/pedidos/api/alertas.api.ts features/pedidos/model/use-alerts-communications.ts` — saída vazia
6. `grep -v '^\s*//' features/pedidos/ui/priority-alerts-card.tsx | grep -c 'Problemas de integra'` — 3 (as 2 entradas do mapa + o título do 5º bloco)
7. `git diff --stat HEAD~2 HEAD` — exatamente 3 arquivos: `shared/types/models.ts`, `features/pedidos/ui/priority-alerts-card.tsx`, `features/pedidos/ui/priority-alerts-card.test.tsx`

## Next Phase Readiness
- Nenhum bloqueio. Mudança é aditiva e autocontida; nada pendente para uma próxima fase.
- Verificação visual opcional (human-check do plano) fica a critério da mantenedora: subir `pnpm dev`, abrir `/alertas` e conferir as 6 pílulas em linha única e os 5 blocos do guia informativo.

## Self-Check: PASSED

Todos os arquivos criados/modificados confirmados no disco (`shared/types/models.ts`, `features/pedidos/ui/priority-alerts-card.tsx`, `features/pedidos/ui/priority-alerts-card.test.tsx`, este SUMMARY). Ambos os hashes de commit (`d77dc9d`, `0f4cbfb`) confirmados em `git log --oneline --all`.

---
*Quick task: 260909-gh7*
*Completed: 2026-09-09*
