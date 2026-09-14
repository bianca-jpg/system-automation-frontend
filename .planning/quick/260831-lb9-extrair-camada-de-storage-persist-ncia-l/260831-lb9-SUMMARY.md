---
phase: 260831-lb9
plan: 01
subsystem: frontend
tags: [realtime, refactor, storage, localstorage, react]

# Dependency graph
requires:
  - phase: 260831-kpx
    provides: features/realtime/model/protocol.ts (parsers/validadores puros do protocolo realtime, sem I/O)
provides:
  - features/realtime/model/storage.ts com a camada de persistência do cursor realtime (chave versionada, parser tolerante, três wrappers de I/O)
  - realtime-provider.tsx sem nenhum acesso direto a window.localStorage
affects: [realtime, features/realtime/model]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Módulo de persistência sem diretiva de client: toque em window.localStorage só dentro de corpo de função chamada a partir de efeito, nunca na avaliação do módulo (mesmo padrão de protocol.ts e realtime-api.ts)"
    - "Constantes/tetos compartilhados entre parser e chamador exportados de um único lugar em vez de duplicados (mesmo critério já usado para MAX_EVENT_ID_LENGTH/DEFAULT_HEARTBEAT_SECONDS em protocol.ts)"

key-files:
  created:
    - features/realtime/model/storage.ts
  modified:
    - features/realtime/model/realtime-provider.tsx

key-decisions:
  - "A montagem da chave (storageKey) ficou privada e o parser (parsePersistedState) ficou exportado — os dois são puros, mas expor a montagem reabriria o acoplamento que a tarefa fecha, enquanto o parser é o ponto natural de teste isolado futuro"
  - "MAX_SEEN_EVENT_IDS virou export compartilhado de storage.ts (mesmo padrão dos valores compartilhados de protocol.ts na task 260831-kpx), porque parser e provider precisam do mesmo teto"
  - "O guard de ambiente (typeof window !== 'undefined') ficou no provider, no único ponto onde já existia (callback clearPersistedState), em vez de ser absorvido pelos wrappers — decisão de 'nenhuma mudança não pedida', não de necessidade técnica"
  - "Os quatro comentários de justificativa da falha tolerada foram preservados nos call sites, um a um, porque cada um explica um contexto diferente; o contrato genérico de engolir falha por storage indisponível ficou documentado uma vez no módulo novo"

patterns-established:
  - "Wrappers de I/O de storage (load/save/clear) recebem a identificação do usuário e resolvem a chave internamente, sem expor a montagem de chave para fora do módulo"

requirements-completed: [QUICK-260831-lb9]

# Metrics
duration: 6min
completed: 2026-08-31
status: complete
---

# Quick Task 260831-lb9: Extrair camada de storage/persistência realtime Summary

**Extraída a persistência do cursor realtime (chave versionada + parser tolerante + 3 wrappers de I/O) de `realtime-provider.tsx` para `features/realtime/model/storage.ts`, consolidando cinco acessos diretos a `window.localStorage` que hoje estavam espalhados pelo provider.**

## Performance

- **Duration:** ~6 min (commits 15:34:35 → 15:37:03, mais gates finais)
- **Started:** 2026-08-31T15:34:00-03:00 (aprox.)
- **Completed:** 2026-08-31T15:40:00-03:00 (aprox.)
- **Tasks:** 3 (2 de código + 1 de verificação)
- **Files modified:** 2 (1 criado, 1 modificado)

## Accomplishments

- Novo módulo `features/realtime/model/storage.ts` (91 linhas) concentrando chave por usuário, formato versionado do payload, parser tolerante e os três wrappers de I/O (`loadPersistedState`, `savePersistedState`, `clearPersistedStateStorage`)
- `realtime-provider.tsx` caiu de 1070 para 1010 linhas e não tem mais nenhuma referência a `window.localStorage` — os cinco pontos de acesso (callback de logout, efeito de persistência, e os três ramos do efeito de conexão) agora chamam os wrappers do módulo novo, preservando gatilho, ordem e os quatro comentários de justificativa de cada tolerância a falha
- Chave gravada no navegador, formato do payload e comportamento observável idênticos — confirmado por `realtime-provider.test.tsx` passando sem nenhuma alteração no próprio arquivo

## Task Commits

1. **Task 1: Criar features/realtime/model/storage.ts com o bloco puro copiado verbatim e os três wrappers de I/O** - `06a5bad` (feat)
2. **Task 2: Religar realtime-provider.tsx ao novo módulo e trocar os cinco acessos diretos por chamadas aos wrappers** - `0eafd5b` (refactor)
3. **Task 3: Gates finais do projeto e registro das decisões no SUMMARY** - sem commit de código (task de verificação; ver `<verification>` abaixo)

## Files Created/Modified

- `features/realtime/model/storage.ts` (novo, 91 linhas) - chave versionada, parser tolerante, `PersistedRealtimeState`, `MAX_SEEN_EVENT_IDS`, `loadPersistedState`, `savePersistedState`, `clearPersistedStateStorage`
- `features/realtime/model/realtime-provider.tsx` (1070 → 1010 linhas) - remove chave/parser/tipo locais, enxuga import de `./protocol` (remove `MAX_EVENT_ID_LENGTH` e `parseTopicMap`, que ficaram sem consumidor local), passa a importar e chamar os wrappers de `./storage` nos cinco pontos de acesso a storage

## Decisions Made

Ver `key-decisions` no frontmatter — quatro decisões de projeto registradas explicitamente para a próxima fatia herdar o critério (montagem de chave privada vs. parser exportado, teto de ids compartilhado, guard de ambiente só onde já existia, comentários de justificativa preservados um a um).

## Deviations from Plan

None - plan executado exatamente como escrito. Todos os gates automatizados de cada task (typecheck, lint, suíte de realtime, hashes de blob dos arquivos que não podiam mudar, contagens de grep para símbolos órfãos) passaram sem necessidade de ajuste.

## Issues Encountered

Nenhuma no código tocado por este plano. A suíte completa (`pnpm test`) apresentou 2 falhas por timeout em `widgets/pedido-dashboard/ui/orders-list.pagination.test.tsx`, fora de `features/realtime/`. Re-executado isoladamente (`npx vitest run widgets/pedido-dashboard/ui/orders-list.pagination.test.tsx`), o arquivo passou 10/10 — confirma a instabilidade pré-existente sob carga já documentada na task 260831-kpx (Armadilha de ferramenta 3), não uma regressão desta mudança. Nenhum arquivo fora de `features/realtime/model/` foi tocado por este plano.

## User Setup Required

None - nenhuma configuração externa necessária.

## Next Phase Readiness

- `realtime-provider.tsx` segue como candidato a novas fatias de extração; a máquina de estado da conexão (efeito de conexão com WebSocket, polling, reconexão) é a candidata natural apontada pelo plano para a próxima tarefa
- `storage.ts` ainda não tem teste próprio — a cobertura hoje vem indiretamente pela suíte do provider (`realtime-provider.test.tsx`); registrado como follow-up fora deste plano
- Nenhum push realizado; os dois commits ficam em `develop` aguardando aprovação explícita da desenvolvedora

---

_Quick task: 260831-lb9_
_Completed: 2026-08-31_

## Self-Check: PASSED

- FOUND: features/realtime/model/storage.ts
- FOUND: features/realtime/model/realtime-provider.tsx
- FOUND: .planning/quick/260831-lb9-extrair-camada-de-storage-persist-ncia-l/260831-lb9-SUMMARY.md
- FOUND: commit 06a5bad
- FOUND: commit 0eafd5b
