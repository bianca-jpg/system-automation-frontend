---
phase: 260831-kpx
plan: 01
subsystem: realtime
tags: [react, websocket, typescript, refactor, testing]

# Dependency graph
requires: []
provides:
  - "features/realtime/model/protocol.ts — módulo puro com parsing/validação do protocolo realtime (normalização de tópico, coerção de sequência, parsers de status/envelope, classificação de falha de autorização, backoff, watchdog de heartbeat)"
  - "realtime-provider.tsx ~180 linhas menor, importando as funções puras em vez de declará-las"
affects: [realtime, pedidos, testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Módulo de protocolo puro (sem React/DOM/WebSocket) separado do provider React que o consome, permitindo testar parsing/validação sem montar componentes"

key-files:
  created:
    - features/realtime/model/protocol.ts
  modified:
    - features/realtime/model/realtime-provider.tsx

key-decisions:
  - "TopicStatusSnapshot foi para protocol.ts (junto do parser que o produz), não para types.ts, para não inflar o vocabulário público do módulo com um tipo interno"
  - "MAX_EVENT_ID_LENGTH e DEFAULT_HEARTBEAT_SECONDS viraram exports (compartilhadas entre protocol.ts e o que ficou no provider); as outras nove constantes migradas (MAX_EVENT_TYPE_LENGTH, as seis do watchdog de heartbeat, e as duas de backoff) ficaram privadas em protocol.ts"
  - "normalizeTopic foi exportada mesmo sem consumidor atual no provider, por ser vocabulário do protocolo"
  - "Consolidação do isRecord duplicado em features/realtime/api/realtime-api.ts foi deliberadamente NÃO feita nesta tarefa — protocol.ts importa RealtimeRequestError desse mesmo módulo, e fazer o caminho inverso fecharia um ciclo de imports entre os dois arquivos. Existe ainda uma terceira cópia já exportada em features/pedidos/api/pagination.ts; a consolidação real seria um utilitário em shared/, registrada aqui como sugestão de follow-up, não como parte deste plano"

patterns-established:
  - "Separar bloco de parsing/validação determinística de um provider React grande em um módulo puro irmão (protocol.ts ao lado de realtime-provider.tsx), reexportando via import nomeado — replicável para as próximas fatias do mesmo arquivo"

requirements-completed: [QUICK-260831-kpx]

# Metrics
duration: 25min
completed: 2026-08-31
status: complete
---

# Quick Task 260831-kpx: Extrair funções puras de parsing/validação do protocolo realtime Summary

**Extraiu as 10 funções puras de parsing/validação/backoff do protocolo realtime (mais o tipo `TopicStatusSnapshot`) de `realtime-provider.tsx` para um novo módulo `features/realtime/model/protocol.ts`, sem nenhuma mudança de comportamento — reorganização pura de código.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-31T17:47:00Z
- **Completed:** 2026-08-31T18:12:06Z
- **Tasks:** 3/3
- **Files modified:** 2 (1 criado, 1 modificado)

## Accomplishments

- `features/realtime/model/protocol.ts` criado como módulo puro (sem React/Next/next-auth, sem DOM/WebSocket), exportando `isRecord`, `normalizeTopic`, `toSequence`, `parseTopicMap`, `parseStatusSnapshot`, `parseEventEnvelope`, `isAuthorizationFailure`, `isAuthorizationCloseCode`, `reconnectDelay`, `heartbeatWatchdog`, o tipo `TopicStatusSnapshot` e as constantes compartilhadas `MAX_EVENT_ID_LENGTH`/`DEFAULT_HEARTBEAT_SECONDS`
- `realtime-provider.tsx` religado ao novo módulo via um único `import ... from "./protocol"`, caindo de 1249 para 1070 linhas (179 linhas a menos)
- Superfície pública de `features/realtime` (`RealtimeProvider`, `useRealtime`, `RealtimeTopic`) e os arquivos `types.ts`, `realtime-api.ts` e `realtime-provider.test.tsx` permaneceram com diff vazio — confirmado por comando `git diff` no gate final
- `realtime-provider.test.tsx` (a régua de comportamento desta tarefa) não foi tocado em nenhuma linha e continua passando — evidência direta de que o comportamento é idêntico

## Task Commits

Cada task foi commitada atomicamente em `develop`:

1. **Task 1: Criar features/realtime/model/protocol.ts com as funções puras copiadas verbatim** - `6119db3` (refactor)
2. **Task 2: Religar realtime-provider.tsx ao novo módulo e remover as declarações duplicadas** - `c362ee5` (refactor)
3. **Task 3: Gates finais do projeto e registro das decisões no SUMMARY** - sem commit de código (task de verificação)

**Plan metadata:** não commitado (commit_docs desabilitado para artefatos de planejamento neste fluxo — SUMMARY/STATE ficam fora do controle de versão por enquanto)

## Files Created/Modified

- `features/realtime/model/protocol.ts` - Módulo puro do protocolo realtime: normalização de tópico, coerção de sequência, parsers de status/envelope, classificação de falha de autorização, backoff de reconexão e watchdog de heartbeat
- `features/realtime/model/realtime-provider.tsx` - Removidas as 10 declarações locais e as constantes que migraram; adicionado import de `./protocol`

## Decisions Made

Ver `key-decisions` no frontmatter acima — todas seguiram exatamente o que o plano já havia decidido durante o discovery (nenhuma decisão nova precisou ser tomada em tempo de execução).

## Deviations from Plan

None - plan executado exatamente como escrito. Nenhuma das regras de auto-fix (bug, funcionalidade crítica faltante, blocker) foi acionada — o código já compilava e passava lint/testes a cada task, exatamente como o discovery do plano previu.

## Issues Encountered

- `pnpm test` (suíte completa) apresentou 2 falhas em `widgets/pedido-dashboard/ui/orders-list.pagination.test.tsx` (timeouts em `waitFor`/teste completo) durante a execução sob carga da suíte inteira. Nenhuma das duas está em `features/realtime/`. Re-executei esse arquivo isoladamente (`npx vitest run widgets/pedido-dashboard/ui/orders-list.pagination.test.tsx`) e os 10 testes passaram limpos — confirma que é a instabilidade pré-existente sob carga já documentada no plano (`<discovery_notes>` e nas notas de sessão do projeto), não uma regressão desta mudança. Nenhum arquivo fora de `features/realtime/model/` foi tocado nesta tarefa.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness

- `features/realtime/model/protocol.ts` está pronto para ser testado isoladamente em uma tarefa futura (hoje a cobertura vem apenas indiretamente via `realtime-provider.test.tsx`)
- Segue disponível como follow-up (fora deste plano, de propósito): consolidar as três cópias de `isRecord` (`protocol.ts`, `realtime-api.ts`, `features/pedidos/api/pagination.ts`) em um utilitário de `shared/`
- `realtime-provider.tsx` ainda tem ~1070 linhas — próximas fatias do mesmo arquivo (máquina de estado de conexão) continuam como oportunidade futura de refactor incremental

---

_Quick task: 260831-kpx_
_Completed: 2026-08-31_

## Self-Check: PASSED

- FOUND: features/realtime/model/protocol.ts
- FOUND: features/realtime/model/realtime-provider.tsx
- FOUND: commit 6119db3
- FOUND: commit c362ee5
