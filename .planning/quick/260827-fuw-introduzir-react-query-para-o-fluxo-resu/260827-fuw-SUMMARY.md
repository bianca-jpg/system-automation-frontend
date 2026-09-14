---
status: complete
---

# Quick Task 260827-fuw — Summary

**Nota de reconstrução:** este SUMMARY.md foi reescrito pelo orquestrador a partir do relatório final do executor, porque o arquivo original (não commitado por instrução do próprio workflow) foi perdido junto com o diretório do worktree antes de ser copiado para o checkout principal. O conteúdo abaixo é fiel ao relatório retornado pelo agente executor, não uma nova análise.

## O que foi feito

Todas as 4 tasks do plano (`260827-fuw-PLAN.md`) executadas com sucesso num worktree isolado, depois mesclado em `develop` via merge commit (`merge(260827-fuw): React Query + typed errors + evolucaoFaturamento migration`).

**Task 1a (checkpoint, pré-aprovado):** nenhum arquivo alterado. Aprovação de `@tanstack/react-query` (major 5.x, organização TanStack, github.com/TanStack/query, milhões de downloads semanais) concedida na sessão orquestradora em 2026-08-27, e reconfirmada de forma independente pelo executor via `pnpm view @tanstack/react-query version` → `5.102.7` antes de instalar.

**Task 1b — `5a7a586`:** Instalado `@tanstack/react-query`; criado `shared/providers/QueryProvider.tsx` (client-side, `QueryClient` criado por montagem via `useState` preguiçoso, defaults comentados para espelhar o comportamento atual: sem retry, sem refetch em foco/reconexão, `staleTime` de 30s); montado acima de `RealtimeProvider`/`AppDataProvider` em `app/(app)/layout.tsx`.

**Task 2 (TDD) — `d3c53e4` (RED) → `ebd6fea` (GREEN):** `lib/api/http-client.ts` passa a exportar `ApiRequestError` (status + corpo desserializado), com parsing tolerante em respostas não-ok (nunca mascara o status HTTP em corpo vazio/malformado); callback de 401 continua disparando antes do throw; interface `ApiError` e seus 4 call sites de cast permanecem intocados. Adicionado `lib/api/api-error-message.ts` (`apiErrorMessage`), reaproveitando `parseApiErrorMessage` (mitigação T-QUICK-01) para que nenhum texto técnico/sensível chegue à UI.

**Task 3 (TDD, migração) — `df8caaa`:** Criado `features/pedidos/model/use-evolucao-faturamento.ts`; `AppDataProvider` migrado para usá-lo. `apiClientReady` passou a ser calculado antes dos hooks de dado (necessário para gatear o `enabled` da query no mesmo render). `loadedOnce` deriva de `dataUpdatedAt > 0` (sticky), não de `isSuccess` (que vira `false` num refetch com erro) — este foi o ponto de correção-chave que distingue `overviewError` de `overviewRefreshError`. Troca de token agora descarta o cache da evolução via `queryClient.removeQueries()`. `app-data-provider.test.tsx` (o oráculo comportamental) passa com as 10 asserções originais **literalmente inalteradas** — só o `render`/`rerender` foi envolvido em `QueryClientProvider`, e o mock de `http-client` foi atualizado para usar `importOriginal` (necessário porque `apiErrorMessage` importa `ApiRequestError` desse módulo).

## Verificação

- `pnpm typecheck` e `pnpm lint` limpos durante toda a execução.
- Suíte direcionada (`features/pedidos/model`, `visao-geral`, `pedidos`, `widgets/pedido-dashboard`): 132/132 passando.
- `pnpm test` completo: 1 arquivo instável pré-existente (`widgets/pedido-dashboard/ui/orders-list.pagination.test.tsx`, sem relação — não importa nenhum módulo tocado, passa 100% isolado em duas execuções separadas), confirmado como instabilidade de baseline conhecida, não regressão.
- `git diff --stat` confirma que nenhum dos caminhos proibidos (`widgets/`, `visao-geral/page.tsx`, `pedidos/page.tsx`, `use-latest-resource.ts`, `entities/usuario/`, `design-system/`) foi tocado.

## Nota de formato de commit

Por correção explícita durante a sessão, todos os commits usam mensagens descritivas simples, sem o prefixo `feat(...)`/`test(...)` de Conventional Commits. Isso significa que um scanner automatizado de gate RED→GREEN que procure literalmente por `test(...)`/`feat(...)` não vai detectar o gate, mesmo a ordem RED-depois-GREEN tendo sido seguida de verdade na Task 2.

## Commits (na branch `develop`, após merge)

- `5a7a586` — Instala react-query e monta QueryProvider no grupo (app)
- `d3c53e4` — Testes: erro estruturado do apiFetch e apiErrorMessage (RED)
- `ebd6fea` — Tipa o erro do apiFetch com status + corpo estruturado do backend (GREEN)
- `df8caaa` — Migra evolucaoFaturamento do AppDataProvider para React Query
- merge commit — mescla do worktree em `develop`

## Escopo não tocado (conforme planejado)

`resumo` (segunda migração, não feita aqui), `AppDataProvider` como Context ainda existe, `entities/usuario/api/` intocado, docs de arquitetura do backend intocados — todos itens de tarefas separadas.
