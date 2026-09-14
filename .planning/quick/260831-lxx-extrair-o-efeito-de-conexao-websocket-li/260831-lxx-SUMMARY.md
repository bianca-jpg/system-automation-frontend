---
phase: 260831-lxx
plan: 01
subsystem: realtime
tags: [websocket, react, refactor, realtime, typescript]

requires:
  - phase: 260831-kpx
    provides: features/realtime/model/protocol.ts (parsers/validadores puros do protocolo realtime)
  - phase: 260831-lb9
    provides: features/realtime/model/storage.ts (camada de persistência localStorage do cursor realtime)
provides:
  - features/realtime/model/connection.ts com a máquina de conexão completa do socket realtime (ticket, handshake, heartbeat, backoff, poll de status, resync, desmontagem)
  - realtime-provider.tsx reduzido a contexto + estado derivado + callbacks públicos (1010 -> 384 linhas)
affects: [realtime, features/realtime]

tech-stack:
  added: []
  patterns:
    - "Máquina de conexão como função de arranque (startRealtimeConnection) que devolve a desmontagem, em vez de hook — mantém o módulo livre de React"
    - "Fronteira de dependências como objeto único (RealtimeConnectionDeps) com slots imperativos tipados estruturalmente (RealtimeCommandSlot), evitando importar tipos de ref do React em módulo não-React"

key-files:
  created:
    - features/realtime/model/connection.ts
  modified:
    - features/realtime/model/realtime-provider.tsx

key-decisions:
  - "connection.ts é uma função de arranque simples, não um hook — a região extraída já era livre de React e mantê-la assim preserva a posição e a lista de dependências do efeito original, que é o que a suíte sensível a timing mede"
  - "As dependências entram por um objeto de onze campos, e os três slots imperativos atravessam a fronteira com um tipo estrutural próprio (RealtimeCommandSlot) em vez do tipo de ref do React, para o módulo continuar sem importar React"
  - "A ref de sequência entra marcada como somente leitura, documentando no tipo que a máquina de conexão só a consulta"
  - "O conjunto de controllers de leitura foi passado como o próprio Set e não atrás de um callback novo, porque a captura local que o provider já fazia é exatamente a semântica que a desmontagem consome — envolvê-la seria mudança não pedida"
  - "As sete constantes de tempo/tamanho ficaram privadas no módulo novo (nenhuma tem consumidor fora dele), diferente do critério de protocol.ts/storage.ts, onde constantes compartilhadas foram exportadas"

patterns-established:
  - "Terceira e última fatia do refactor protocolo/storage/conexão de realtime-provider.tsx: o provider volta a ser só contexto + estado derivado + callbacks públicos"

requirements-completed: [QUICK-260831-lxx]

duration: 20min
completed: 2026-09-01
status: complete
---

# Quick Task 260831-lxx: Extrair máquina de conexão websocket para connection.ts Summary

**Terceira e última fatia do refactor de `realtime-provider.tsx`: o efeito de ~600 linhas que abre e governa o socket realtime foi movido byte a byte para `features/realtime/model/connection.ts`, atrás de uma função de arranque `startRealtimeConnection`, deixando o provider em 384 linhas (era 1010).**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-01T09:28:00-03:00 (aprox.)
- **Completed:** 2026-09-01T09:38:22-03:00
- **Tasks:** 3/3
- **Files modified:** 2 (1 criado, 1 modificado)

## Accomplishments

- `features/realtime/model/connection.ts` criado com o ciclo de vida completo do socket realtime — emissão de ticket, handshake de hello/replay, heartbeat com watchdog, backoff de reconexão, poll de status como fallback, resync autoritativo e desmontagem — livre de React e sem diretiva de client
- `realtime-provider.tsx` religado: o efeito de conexão termina numa única chamada a `startRealtimeConnection`, devolvendo a desmontagem como antes
- Ordem de hooks, lista de dez dependências e bloco `eslint-disable` preservados sem alteração
- Zero alteração em `realtime-provider.test.tsx` — a suíte sensível a timing (14 blocos com timers falsos) passou sem nenhuma adaptação
- Refactor de três passos concluído: o provider saiu de ~1240 linhas (antes de 260831-kpx) para 384

## Task Commits

1. **Task 1: Criar features/realtime/model/connection.ts com a máquina de conexão copiada verbatim atrás de uma função de arranque** - `6544af9` (feat)
2. **Task 2: Esvaziar o efeito de conexão do provider e religá-lo à função de arranque** - `951723c` (refactor)
3. **Task 3: Gates finais do projeto, verificação de fidelidade do movimento e registro no SUMMARY** - sem commit de código (task de verificação)

**Plan metadata:** commit separado será feito pelo orquestrador (SUMMARY.md, STATE.md)

## Files Created/Modified

- `features/realtime/model/connection.ts` - Novo módulo (690 linhas) com o tipo privado `ConnectionRuntime`, as sete constantes privadas de tempo/tamanho, os tipos públicos `RealtimeCommandSlot`/`RealtimeConnectionDeps` e a função exportada `startRealtimeConnection`
- `features/realtime/model/realtime-provider.tsx` - Reduzido de 1010 para 384 linhas; efeito de conexão agora termina em `return startRealtimeConnection({...})`; imports de `../api/realtime-api` e `./protocol` enxugados dos nove símbolos que migraram

## Decisions Made

Ver `key-decisions` no frontmatter — cinco decisões de projeto registradas conforme pedido pela Task 3 do plano (função de arranque vs. hook, objeto de onze campos com slot estrutural, ref de sequência somente-leitura, Set de controllers passado direto, constantes privadas).

## Deviations from Plan

None - plan executado exatamente como escrito. A extração usou `sed` para copiar a região de linhas 357-957 do provider byte a byte (verificado com `diff` contra o conteúdo colado em `connection.ts` antes do commit da Task 1), evitando risco de transcrição manual em um bloco de 600 linhas — mas o conteúdo final é idêntico ao que o plano especificou como cópia verbatim.

## Issues Encountered

- `pnpm test` (suíte completa) reportou 2 falhas em `widgets/pedido-dashboard/ui/orders-list.pagination.test.tsx` (timeouts de `waitFor`/`toHaveTextContent`), fora de `features/realtime/`. Re-executado isolado com `npx vitest run widgets/pedido-dashboard/ui/orders-list.pagination.test.tsx` — passou 10/10. Confirma a instabilidade pré-existente sob carga já documentada nas duas tasks anteriores (260831-kpx, 260831-lb9); não é regressão desta tarefa, nenhum arquivo fora de `features/realtime/model/` foi tocado por este plano.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Refactor protocolo/storage/conexão de `realtime-provider.tsx` está completo (três fatias: `protocol.ts`, `storage.ts`, `connection.ts`)
- Follow-up fora deste plano: `connection.ts` ainda não tem teste próprio (cobertura vem indiretamente pela suíte do provider), mas agora é testável sem montar React — candidatos naturais: poll de status, backoff, validação do handshake
- Nenhum push feito; os dois commits ficam em `develop` aguardando aprovação explícita da desenvolvedora

## Self-Check: PASSED

- FOUND: features/realtime/model/connection.ts
- FOUND: features/realtime/model/realtime-provider.tsx
- FOUND: .planning/quick/260831-lxx-extrair-o-efeito-de-conexao-websocket-li/260831-lxx-SUMMARY.md
- FOUND: commit 6544af9 (Task 1)
- FOUND: commit 951723c (Task 2)

---

_Phase: 260831-lxx_
_Completed: 2026-09-01_
