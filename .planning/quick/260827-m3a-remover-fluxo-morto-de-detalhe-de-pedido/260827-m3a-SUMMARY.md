---
phase: 260827-m3a
status: completed
requirements: [QUICK-260827-M3A]
commits:
  - 0dfccc3: "refactor(pedidos): remover prop morta onViewOrder de OrdersList"
  - 46e4d20: "refactor(pedidos): apagar OrderDetailModal e estado de contexto órfão"
---

## O que foi feito

Removido o fluxo morto de detalhe de pedido (`OrderDetailModal`), nunca acionado desde
que `ProductGradeDetailModal` virou o caminho vivo de detalhe (aberto por
`onRowClick` em `orders-list.tsx`).

**Task 1** (`0dfccc3`) — removeu a prop `onViewOrder` de `OrdersList`, o
`eslint-disable` associado, o bloco de comentário "PENDÊNCIA CONHECIDA" e todos
os call sites em `pedidos`, `historico`, `alertas` e nos testes da `OrdersList`.

**Task 2** (`46e4d20`) — apagou `order-detail-modal.tsx` e seu teste, e limpou
o par `selectedOrderDetails`/`setSelectedOrderDetails` do `AppDataProvider`
(interface, estado, effect de reset por token, `contextValue` e deps), além do
import órfão de `Order`. Removeu também o import/render do modal e o mock em
`app/(app)/pedidos/page.tsx`, `app/(app)/historico/page.tsx` e
`app/(app)/pedidos/page.test.tsx`.

## Nota de execução

A Task 1 tinha sido feita numa sessão anterior num worktree isolado
(`.claude/worktrees/agent-a8ec28f5cf0684a3c`), que ficou travado sem commit.
Nesta sessão o diff foi revisado arquivo a arquivo contra o plano, validado
(`pnpm typecheck`/`pnpm lint`/busca de referências), trazido para `develop` e
commitado; o worktree órfão e a branch associada foram removidos.

## Verificação

- `pnpm typecheck` — limpo.
- `pnpm lint` — limpo.
- Busca por `onViewOrder`, `OrderDetailModal`, `selectedOrderDetails` em
  `app/`, `features/`, `widgets/`, `shared/`, `entities/`, `lib/` — zero
  ocorrências (fora de `ProductGradeDetailModal`, que é o fluxo vivo e não foi
  tocado).
- `pnpm test` — 2 falhas em `orders-list.pagination.test.tsx` na suíte
  completa, ambas por timeout de `waitFor`/teste sob carga total. Comparado
  contra o baseline (arquivo isolado, código do commit anterior a este plano):
  a mesma suspeita de timeout já falha isoladamente lá também. Rodando o
  arquivo pós-mudança isolado, as 10 passam. Confirma flakiness pré-existente
  da suíte sob paralelismo, não regressão desta mudança.

## Fora de escopo (não fizemos)

O refactor maior de `OrdersList` (extrair estado de mutação/filtro/ordenação
para hooks) e qualquer alteração no `ProductGradeDetailModal` — como o plano
determinava.

## Push

Não foi feito push para `develop` — regra do projeto exige pedir permissão
explícita antes.
