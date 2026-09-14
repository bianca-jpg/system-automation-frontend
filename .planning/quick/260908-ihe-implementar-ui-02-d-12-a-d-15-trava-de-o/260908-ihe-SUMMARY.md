---
phase: 260908-ihe
plan: 01
subsystem: ui
tags: [react, next.js, vitest, design-system, orcamento, pedidos]

requires:
  - phase: 20 (backend)
    provides: "GET /produtos/clientes embute orcamentoPedido por linha 'sem adequação' (plano 20-04); PUT /produtos/grades recusa com 409 estruturado orcamento_pedido_excedido quando a edição estoura (plano 20-03)"
provides:
  - "Medidores permanentes de orçamento ±5% (adição/corte) por linha 'sem adequação', visíveis antes de qualquer edição (D-12/D-13)"
  - "Liberação da variação de total no modal e no cliente HTTP, restrita a linha 'sem adequação' (PD-04)"
  - "Trava com banner role=alert quando o delta pretendido estoura o restante do pedido (D-15)"
  - "Confirmação 'Salvar e Aprovar OR' antes de salvar um lote inteiramente 'sem adequação' dentro do limite (D-14)"
  - "Tratamento gracioso do 409 orcamento_pedido_excedido, exibindo a mensagem literal do backend sem invalidar o rascunho (D-16)"
affects: [pedidos, product-grade-detail-modal, confirm-alert-modal]

tech-stack:
  added: []
  patterns:
    - "Funções puras de domínio de UI em features/pedidos/lib/*.ts (sem React, sem fetch), mesmo estilo de order-lifecycle.ts"
    - "Narrowing estrutural de erro HTTP sobre status/body sem importar a classe de erro, para a função de negócio continuar testável com objetos literais"
    - "ConfirmAlertModal com tipo de diálogo extensível e callbacks opcionais por tipo, reaproveitado por um segundo fluxo sem tocar o fluxo original"

key-files:
  created:
    - features/pedidos/lib/orcamento-pedido.ts
    - features/pedidos/lib/orcamento-pedido.test.ts
  modified:
    - shared/types/models.ts
    - features/pedidos/api/pedidos.api.ts
    - features/pedidos/api/pedidos.api.test.ts
    - features/pedidos/ui/modals/confirm-alert-modal.tsx
    - features/pedidos/ui/modals/product-grade-detail-modal.tsx
    - features/pedidos/ui/modals/product-grade-detail-modal.test.tsx

key-decisions:
  - "PD-01/PD-02/PD-03 resolvidos conforme divergências apontadas no próprio PLAN.md entre a tabela de copy/typography e o snippet do 20-UI-SPEC.md (aria-labelledby aponta para span com rótulo curto verbatim + sr-only do restante; text-xs em vez de text-[10px]; rótulo do CTA depende só da composição do lote, nunca do estouro)"
  - "PD-04: hasInvalidClientTotals/invalidTotalRows e expectedTotalQty passam a valer só para adequacaoAplicada=true — pré-requisito para os estados 3/4 da States Matrix ficarem alcançáveis"
  - "PD-05: branch de 409 de orçamento não recarrega clientes nem marca requiresDraftDiscard — clientGrids não seria reescrito por um reload mesmo que rodasse, e a message do 409 já traz os restantes frescos"

requirements-completed: [QUICK-260908-ihe]

duration: ~20min (commits 13:32–13:44 -03:00)
completed: 2026-09-08
status: complete
---

# Quick Task 260908-ihe: Trava de orçamento ±5% na edição manual de Sem Adequação (frontend) Summary

**Medidores de orçamento por linha, trava com alerta, confirmação de salvar-e-aprovar e 409 gracioso no modal de edição de grade — fecha a metade de frontend da Fase 20 do backend.**

## Performance

- **Duration:** ~20 min (do primeiro ao último commit de task)
- **Started:** 2026-09-08T13:2x (leitura de contexto) / primeiro commit 2026-09-08T13:32:32-03:00
- **Completed:** 2026-09-08T13:44:04-03:00
- **Tasks:** 3/3
- **Files modified:** 8 (2 criados, 6 modificados)

## Accomplishments

- Contrato `OrcamentoPedido` espelhado em `shared/types/models.ts`, com `Order.orcamentoPedido` opcional e anulável (o backend serializa `null` em vez de omitir a chave em linha "com adequação").
- Três funções puras testadas em `features/pedidos/lib/orcamento-pedido.ts`: `toneOrcamento` (tom do medidor, sem divisão por zero em limite 0), `avaliarDeltaOrcamento` (adição/corte nunca se compensam, D-08), `orcamentoExcedidoDetail` (narrowing estrutural do 409 de orçamento, sem importar `ApiRequestError`).
- Dois medidores permanentes (`Progress`, `role="progressbar"`) por linha "sem adequação", visíveis antes de qualquer edição, dentro da célula "Loja / Cliente" — sem coluna nova, sem alterar linha "com adequação".
- Trava de total redistributivo (D-01/D-11) relaxada só para "sem adequação" — pré-requisito (PD-04) sem o qual os estados de orçamento seriam inalcançáveis.
- Banner `role="alert"` de estouro (D-15), rótulo/confirmação "Salvar e Aprovar OR" (D-14) e branch de 409 `orcamento_pedido_excedido` (D-16) tratado antes do 409 de conflito de versão já existente.

## Task Commits

Each task was committed atomically:

1. **Task 1: Contrato do orçamento, lógica pura e liberação da variação de total no cliente HTTP** - `968a48d` (feat)
2. **Task 2: Medidores permanentes por linha "sem adequação" e liberação da mudança de total no modal** - `0d6bf3d` (feat)
3. **Task 3: Trava com alerta, confirmação de finalização da OR e 409 gracioso** - `eba20d8` (feat)

_Nenhuma task usou TDD em ciclo RED/GREEN separado — testes foram escritos junto com a implementação de cada task, cobrindo o bloco `<behavior>` antes do commit._

## Files Created/Modified

- `shared/types/models.ts` - Interface `OrcamentoPedido` (7 campos camelCase) + `Order.orcamentoPedido?: OrcamentoPedido | null`
- `features/pedidos/lib/orcamento-pedido.ts` - `toneOrcamento`, `avaliarDeltaOrcamento`, `orcamentoExcedidoDetail` (funções puras)
- `features/pedidos/lib/orcamento-pedido.test.ts` - 17 casos cobrindo os três limiares/regras
- `features/pedidos/api/pedidos.api.ts` - `ProductGradeChange.expectedTotalQty: number | null`; `null` libera variação de total em `normalizeGradeChanges`
- `features/pedidos/api/pedidos.api.test.ts` - caso novo de `expectedTotalQty: null` liberando total, mantendo grade zerada barrada
- `features/pedidos/ui/modals/confirm-alert-modal.tsx` - tipo `'salvar-aprovar'` em `ConfirmModalState`, callbacks das três decisões agora opcionais
- `features/pedidos/ui/modals/product-grade-detail-modal.tsx` - `OrcamentoMeters`, banner de estouro, CTA condicional, `ConfirmAlertModal` embutido, branch de 409 de orçamento no `save()`
- `features/pedidos/ui/modals/product-grade-detail-modal.test.tsx` - `makeOrderSemAdequacao()` + 7 casos novos (18 → 23 testes, mais o ajuste de rótulo em 1 teste pré-existente da Task 2)

## Decisions Made

- **PD-01 (nome acessível do medidor):** o `aria-labelledby` aponta para um span com o rótulo curto **visível verbatim** mais um `<span className="sr-only">` com a cláusula do restante — não a frase longa completa do UI-SPEC.
- **PD-02 (tamanho de fonte):** `text-xs` (não `text-[10px]` do snippet), com `normal-case font-medium` porque a `TableCell` pai é `uppercase font-bold`.
- **PD-03 (rótulo do CTA):** depende só da composição do lote (todas as linhas sujas "sem adequação"), nunca do estouro — o estouro só desabilita, evitando o rótulo piscar entre dois textos durante a digitação.
- **PD-04 (relaxar a trava de total é pré-requisito):** `hasInvalidClientTotals`/`invalidTotalRows` e `expectedTotalQty` passam a valer só para `adequacaoAplicada === true`. Sem isso, nenhum dos estados 3/4 da States Matrix seria alcançável.
- **PD-05 (medidores refletem o payload do carregamento):** o branch de 409 de orçamento não chama `clients.reload()` nem marca `requiresDraftDiscard` — `clientGrids` não seria reescrito por um reload mesmo que rodasse, e a `message` do 409 já carrega os restantes frescos.

## Deviations from Plan

None - plan executado exatamente como escrito, incluindo as cinco decisões PD-01..PD-05 já resolvidas no próprio PLAN.md.

## Issues Encountered

- Um teste pré-existente da Task 2 (`'permite mudar o total de uma linha sem adequação sem acionar o banner de redistribuição'`) quebrou depois que a Task 3 introduziu o rótulo condicional do CTA — o botão passou de "Salvar Alterações" para "Salvar e Aprovar OR" no mesmo cenário (lote inteiramente "sem adequação"). Ajustada a asserção do teste para o novo rótulo esperado; comportamento é o States Matrix descrito no `20-UI-SPEC.md`, não um bug.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness

- Fase 20 do backend (D-12..D-16) fechada dos dois lados (backend já estava pronto e no ar antes deste quick task).
- `pnpm typecheck`, `pnpm lint` e `pnpm exec vitest run features/pedidos` (145 testes, 18 arquivos) verdes.
- `git status` do diretório `design-system/` sem arquivo novo desta tarefa.
- Verificação humana pendente (checkpoint `human-check` do PLAN.md): abrir um produto em edição com cliente "sem adequação" e confirmar visualmente os dois medidores, a trava com alerta no estouro, e a confirmação antes de salvar. Não foi executada nesta sessão (execução autônoma, sem browser disponível) — recomendado antes de considerar a fase encerrada para o time de automation.

---

_Phase: 260908-ihe_
_Completed: 2026-09-08_

## Self-Check: PASSED

Todos os 8 arquivos-chave (2 criados, 6 modificados) e os 3 commits de task (`968a48d`, `0d6bf3d`, `eba20d8`) confirmados presentes em disco/git log.
