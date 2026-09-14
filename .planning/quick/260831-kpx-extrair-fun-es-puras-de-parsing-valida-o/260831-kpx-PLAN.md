---
phase: 260831-kpx
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - features/realtime/model/protocol.ts
  - features/realtime/model/realtime-provider.tsx
autonomous: true
requirements: [QUICK-260831-kpx]

must_haves:
  truths:
    - "As funções puras de parsing/validação do protocolo realtime vivem em features/realtime/model/protocol.ts e não estão mais declaradas dentro do provider"
    - "realtime-provider.tsx importa essas funções do novo módulo e não tem nenhuma cópia local delas"
    - "protocol.ts não importa React, next, next-auth nem toca DOM/WebSocket — é um módulo puro, importável fora de componente"
    - "A superfície pública de features/realtime/index.ts continua exatamente RealtimeProvider, useRealtime e o tipo RealtimeTopic"
    - "realtime-provider.test.tsx passa sem nenhuma alteração no arquivo de teste — comportamento idêntico"
    - "Nenhum limite de validação (tamanho de id/tipo de evento, watchdog de heartbeat, backoff) mudou de valor durante a mudança"
  artifacts:
    - path: "features/realtime/model/protocol.ts"
      provides: "Módulo puro do protocolo realtime — normalização de tópico, coerção de sequência, parsers de status/envelope, classificação de falha de autorização, backoff de reconexão e watchdog de heartbeat"
      exports:
        - "isRecord"
        - "normalizeTopic"
        - "toSequence"
        - "parseTopicMap"
        - "parseStatusSnapshot"
        - "parseEventEnvelope"
        - "isAuthorizationFailure"
        - "isAuthorizationCloseCode"
        - "reconnectDelay"
        - "heartbeatWatchdog"
        - "TopicStatusSnapshot"
        - "MAX_EVENT_ID_LENGTH"
        - "DEFAULT_HEARTBEAT_SECONDS"
      min_lines: 180
  key_links:
    - from: "features/realtime/model/realtime-provider.tsx"
      to: "features/realtime/model/protocol.ts"
      via: "import das funções puras extraídas"
      pattern: "from \"./protocol\""
    - from: "features/realtime/model/protocol.ts"
      to: "features/realtime/model/types.ts"
      via: "REALTIME_TOPICS, createTopicMap e os tipos de tópico/envelope"
      pattern: "from \"./types\""
    - from: "features/realtime/model/protocol.ts"
      to: "features/realtime/api/realtime-api.ts"
      via: "RealtimeRequestError usado no instanceof de isAuthorizationFailure"
      pattern: "RealtimeRequestError"
---

<objective>
Fatiar `features/realtime/model/realtime-provider.tsx` (1249 linhas) extraindo o
bloco de funções puras de protocolo para um módulo novo,
`features/realtime/model/protocol.ts`.

É reorganização PURA de código: as funções são copiadas sem uma vírgula de
diferença na lógica, e o único arquivo que muda além do novo módulo é o provider,
que passa a importá-las em vez de declará-las.

Purpose: hoje o provider mistura ~210 linhas de parsing/validação determinística
com ~950 linhas de máquina de estado React/WebSocket. Separando as duas coisas, a
parte determinística fica testável isoladamente (sem `render`, sem
`FakeWebSocket`, sem sessão falsa) e o provider fica legível de uma sentada — que
é o que viabiliza as próximas fatias desse arquivo.
Output: `features/realtime/model/protocol.ts` novo; `realtime-provider.tsx`
reduzido para ~1050 linhas com as declarações locais substituídas por um import.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@features/realtime/model/realtime-provider.tsx
@features/realtime/model/types.ts
@features/realtime/api/realtime-api.ts
@features/realtime/index.ts
</context>

<discovery_notes>
Levantamento feito durante o planejamento contra o código atual — o executor pode
confiar nestes fatos sem re-verificar.

1. **Nada fora do provider consome essas funções.** Todas as 11 são declaradas
   sem `export` e não aparecem em nenhum outro arquivo. Os 14 consumidores de
   realtime no repositório importam exclusivamente de `@/features/realtime`
   (`RealtimeProvider`, `useRealtime`, tipo `RealtimeTopic`). A extração é
   invisível para eles.

2. **`realtime-provider.test.tsx` NÃO importa nada de privado.** Ele importa
   `RealtimeProvider`/`useRealtime` de `./realtime-provider`, o tipo
   `RealtimeContextValue` de `./types`, e o namespace `* as realtimeApi` de
   `../api/realtime-api`. Portanto o arquivo de teste **não deve ser tocado** —
   ele é o instrumento de medição desta tarefa, não o objeto dela.

3. **Os testes espionam o namespace de `realtime-api` e constroem
   `new realtimeApi.RealtimeRequestError(...)`.** Como `protocol.ts` vai importar
   `RealtimeRequestError` do mesmo módulo (mesma instância em runtime), o
   `instanceof` dentro de `isAuthorizationFailure` continua verdadeiro para os
   erros fabricados nos testes. Não há armadilha aqui, mas não substitua o
   `instanceof` por checagem estrutural — isso seria mudança de comportamento.

4. **Os testes travam `Math.random` em 0.5** justamente para tornar
   `reconnectDelay` determinístico. `Math` é global; mover a função de módulo não
   afeta o spy. Mas preserve `Math.random()` literalmente na fórmula.

5. **`TopicStatusSnapshot` (hoje `type` local do provider, linhas ~63-67) precisa
   viajar junto**: é o tipo de retorno de `parseStatusSnapshot`. Ele volta como
   import de tipo no provider, que ainda o usa em `applyStatusSnapshot`,
   `applyAuthoritativeStatusSnapshot`, `applyRuntimeSnapshot` e `runStatusPoll`.
   Ele fica em `protocol.ts` (colado no parser que o produz), não em `types.ts` —
   `types.ts` é o vocabulário público do módulo e este tipo é interno.

6. **Duas constantes são compartilhadas e por isso precisam ser exportadas**, não
   apenas movidas:
   - `MAX_EVENT_ID_LENGTH` — usada por `parseEventEnvelope` (vai) e por
     `parsePersistedState` (fica no provider);
   - `DEFAULT_HEARTBEAT_SECONDS` — usada por `heartbeatWatchdog` (vai) e pelo
     valor inicial de `negotiatedHeartbeatSeconds` dentro de `connect()` (fica).
   Todas as outras constantes do bloco de heartbeat/reconexão são privadas das
   funções movidas e ficam sem `export` em `protocol.ts`.

7. **`RECONNECT_STABLE_MS` NÃO se move.** Apesar do prefixo, ela é usada só por
   `scheduleAttemptReset` dentro do efeito, não por `reconnectDelay`. Mover por
   engano quebraria o provider.

8. **`normalizeTopic` fica sem consumidor no provider.** Depois da extração ela é
   usada apenas por `parseTopicMap` e `parseStatusSnapshot`, que também se mudam.
   Exporte-a mesmo assim (faz parte do vocabulário do protocolo e o briefing pede
   que ela vá); o ESLint deste projeto (next core-web-vitals + typescript, sem
   lint com tipos) não reclama de export sem consumidor. Já `TOPIC_ALIASES` é
   detalhe de implementação de `normalizeTopic` — vai como const privada, sem
   `export`.

9. **O bônus opcional de consolidar o `isRecord` de
   `features/realtime/api/realtime-api.ts` fica FORA deste plano — de propósito.**
   `protocol.ts` importa `RealtimeRequestError` de `../api/realtime-api` (item 3),
   então fazer `realtime-api.ts` importar `isRecord` de `../model/protocol`
   fecharia um ciclo `protocol → realtime-api → protocol`. O ciclo até resolveria
   em runtime (a classe só é referenciada em tempo de chamada, não de avaliação do
   módulo), mas é fragilidade gratuita para deduplicar um predicado de 3 linhas.
   Nota de contexto: existe uma terceira cópia de `isRecord` já exportada em
   `features/pedidos/api/pagination.ts` — consolidar as três exigiria um utilitário
   em `shared/`, o que é outra tarefa. Registre isso no SUMMARY.

10. **`protocol.ts` não leva `"use client"`.** É módulo puro; a diretiva vive no
    componente que o consome. `realtime-api.ts` já é precedente disso no mesmo
    feature — também não tem a diretiva e é importado pelo provider.

**Armadilha de ferramenta 1 (herdada da task 260828-fz2):** `pnpm test -- <arquivo>`
NÃO filtra, roda a suíte inteira. Use `npx vitest run <filtro>` direto, e lembre
que o filtro é REGEX contra o caminho. `npx vitest run realtime` casa com os dois
arquivos de teste do feature (`realtime-provider.test.tsx` e `realtime-api.test.ts`).

**Armadilha de ferramenta 2 (CORRIGE um erro do plano 260828-fz2):**
`frontend` é um **repositório git próprio** (toplevel aponta para ele
mesmo, branch atual `develop`), aninhado dentro da pasta de trabalho que contém o
backend. Logo, o padrão `cd "$(git rev-parse --show-toplevel)/frontend"`
usado em planos anteriores resolve para um caminho inexistente quando o cwd já é o
frontend, e derruba a cadeia `&&` inteira antes de qualquer gate rodar. Os
comandos deste plano usam `cd "$(git rev-parse --show-toplevel)"` puro, que
aterrissa na raiz do frontend a partir de qualquer subdiretório dele. Commits vão
para `develop` (nunca `main`) e nenhum push acontece sem aprovação explícita.
</discovery_notes>

<tasks>

<task type="auto">
  <name>Task 1: Criar features/realtime/model/protocol.ts com as funções puras copiadas verbatim</name>
  <files>features/realtime/model/protocol.ts (novo)</files>
  <action>
Crie `features/realtime/model/protocol.ts` como módulo puro (sem diretiva de
client, sem import de react/next/next-auth, sem acesso a `window`, `document`,
`navigator`, `localStorage` ou `WebSocket`).

Abra com um comentário de cabeçalho curto em português, no tom dos comentários já
existentes no feature, dizendo que o módulo concentra a parte determinística do
protocolo realtime — normalizar/validar o que chega do backend e derivar tempos de
backoff — e que ele é deliberadamente livre de React e de I/O para poder ser
exercitado sem montar o provider.

Imports do módulo, e nenhum outro:
- de `./types`: `REALTIME_TOPICS`, `createTopicMap`, e os tipos
  `RealtimeEventEnvelope`, `RealtimeTopic`, `RealtimeTopicMap`;
- de `../api/realtime-api`: `RealtimeRequestError` (import de valor, não de tipo —
  é usado num `instanceof`).

Declare as constantes abaixo, com exatamente os mesmos valores que têm hoje no
topo de `realtime-provider.tsx`. Duas delas são `export` porque o provider
continua precisando; as demais são privadas:
- `MAX_EVENT_ID_LENGTH` = 256 — **exportada**
- `DEFAULT_HEARTBEAT_SECONDS` = 20 — **exportada**
- `MAX_EVENT_TYPE_LENGTH` = 128 — privada
- `HEARTBEAT_WATCHDOG_FACTOR` = 2.25 — privada
- `HEARTBEAT_JITTER_ALLOWANCE_MS` = 5_000 — privada
- `HEARTBEAT_CHECK_MIN_MS` = 1_000 — privada
- `HEARTBEAT_CHECK_MAX_MS` = 15_000 — privada
- `HEARTBEAT_TIMEOUT_MIN_MS` = 30_000 — privada
- `HEARTBEAT_TIMEOUT_MAX_MS` = 5 * 60_000 — privada
- `RECONNECT_BASE_MS` = 1_000 — privada
- `RECONNECT_MAX_MS` = 30_000 — privada

Não traga nenhuma outra constante do provider. Em particular, a constante de
janela de estabilidade da reconexão permanece lá (ver `<discovery_notes>` item 7),
assim como as de storage, tamanho máximo de mensagem, intervalo de poll, timeouts
de socket/replay e orçamento de TTL de ticket.

Traga também o tipo hoje local do provider que descreve o instantâneo de status
por tópico (`sequence`, `revisions`, `readRevisions`) — mesmo nome
`TopicStatusSnapshot`, agora **exportado**, porque o provider volta a importá-lo.

Copie então, **verbatim, sem refatorar nada**, as declarações abaixo do provider,
todas passando a ser `export function` (a const de aliases é a única exceção:
continua privada, sem export). Mantenha a ordem, os corpos, os comentários
internos e as assinaturas idênticos:
- a const de mapa de aliases de tópico (as 8 chaves em inglês/português)
- `isRecord`
- `normalizeTopic`
- `toSequence`
- `parseTopicMap`
- `parseStatusSnapshot`
- `parseEventEnvelope`
- `isAuthorizationFailure`
- `isAuthorizationCloseCode`
- `reconnectDelay`
- `heartbeatWatchdog`

Regras que valem para todas: nenhuma mudança de nome, de ordem de parâmetro, de
tipo de retorno, de operador de comparação, de limite numérico ou de mensagem. Em
`reconnectDelay`, preserve `Math.random()` na fórmula do jitter (os testes travam
esse global — ver `<discovery_notes>` item 4). Em `isAuthorizationFailure`,
preserve o `instanceof` com a classe importada (item 3). Nenhuma função deste
módulo pode ficar `async`, lançar exceção nova ou ler estado externo.

NÃO toque em `realtime-provider.tsx` nesta task — ele continua com as cópias
locais e segue compilando normalmente. A duplicação temporária é esperada e some
na Task 2.

NÃO toque em `features/realtime/api/realtime-api.ts` (ver `<discovery_notes>`
item 9) nem em `features/realtime/index.ts` (a superfície pública não muda).
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && test -f package.json && test -f features/realtime/model/protocol.ts && npx tsc --noEmit && test "$(grep -cE '^import .*(react|next|next-auth)' features/realtime/model/protocol.ts)" = "0" && test "$(grep -cE '^(export )?function (isRecord|normalizeTopic|toSequence|parseTopicMap|parseStatusSnapshot|parseEventEnvelope|isAuthorizationFailure|isAuthorizationCloseCode|reconnectDelay|heartbeatWatchdog)' features/realtime/model/protocol.ts)" = "10"</automated>
  </verify>
  <done>
`features/realtime/model/protocol.ts` existe com as 10 funções declaradas e a
const de aliases; `MAX_EVENT_ID_LENGTH`, `DEFAULT_HEARTBEAT_SECONDS` e
`TopicStatusSnapshot` estão exportados; o módulo não importa react/next/next-auth
e não referencia DOM nem WebSocket; `npx tsc --noEmit` limpo (o provider ainda tem
as cópias locais neste ponto — é esperado); `realtime-provider.tsx`,
`realtime-api.ts`, `types.ts` e `index.ts` inalterados.
  </done>
</task>

<!-- planner-discipline-allow: react -->
<!-- planner-discipline-allow: next -->
<!-- planner-discipline-allow: next-auth -->

<task type="auto">
  <name>Task 2: Religar realtime-provider.tsx ao novo módulo e remover as declarações duplicadas</name>
  <files>features/realtime/model/realtime-provider.tsx</files>
  <action>
Em `features/realtime/model/realtime-provider.tsx`, apague as declarações que
foram para `protocol.ts` na Task 1 e substitua por um import. Nada mais no arquivo
pode mudar: mesma ordem de hooks, mesmas dependências de `useEffect`/`useCallback`,
mesmos comentários explicativos que restam, mesmo corpo do efeito.

Remova do arquivo:
- as 11 declarações movidas (a const de aliases de tópico, `isRecord`,
  `normalizeTopic`, `toSequence`, `parseTopicMap`, `parseStatusSnapshot`,
  `parseEventEnvelope`, `isAuthorizationFailure`, `isAuthorizationCloseCode`,
  `reconnectDelay`, `heartbeatWatchdog`);
- o tipo local do instantâneo de status por tópico;
- as constantes que migraram: as duas de limite de tamanho de id/tipo de evento,
  a de heartbeat padrão, as seis do watchdog de heartbeat (fator, folga de jitter,
  mínimo/máximo de intervalo de checagem, mínimo/máximo de timeout) e as duas de
  backoff (base e teto).

Mantenha no arquivo, intocadas, as constantes de storage (prefixo e versão), a de
teto de ids de evento memorizados, a de tamanho máximo de mensagem, a de intervalo
de poll de status, os timeouts de abertura de socket e de handshake de replay, as
duas de orçamento/TTL de ticket e a janela de estabilidade da reconexão. Se apagar
essa última por engano, `scheduleAttemptReset` quebra — confira antes de fechar.

Acrescente um import de `./protocol` (relativo, ao lado dos imports de `./types` e
`../api/realtime-api` já existentes, seguindo a mesma formatação multi-linha do
arquivo) trazendo exatamente o que o provider ainda usa:
- valores: `DEFAULT_HEARTBEAT_SECONDS`, `MAX_EVENT_ID_LENGTH`, `heartbeatWatchdog`,
  `isAuthorizationCloseCode`, `isAuthorizationFailure`, `isRecord`,
  `parseEventEnvelope`, `parseStatusSnapshot`, `parseTopicMap`, `reconnectDelay`,
  `toSequence`;
- tipo: `TopicStatusSnapshot`.

Não importe `normalizeTopic` — depois da extração o provider não a usa mais
(ver `<discovery_notes>` item 8), e importá-la só criaria símbolo morto.

O import de `../api/realtime-api` continua trazendo `RealtimeRequestError` além
das quatro funções de request: o provider ainda faz `instanceof` com essa classe
dentro do `catch` de `markTopicRead` para tratar 409/422. Não substitua essa
checagem por `isAuthorizationFailure` — são condições diferentes.

O import de `./types` continua trazendo `REALTIME_TOPICS`, `createTopicMap` e os
cinco tipos: todos seguem em uso no que restou do provider.

Confirme, sem alterar nada além do descrito, que estes pontos de uso continuam
resolvendo: `parsePersistedState` (usa o predicado de record, a coerção de
sequência, o parser de mapa de tópicos e o limite de tamanho de id),
`runStatusPoll` e `connect` (parser de status e classificador de falha de
autorização), o `onmessage` do socket (predicado de record, coerção de sequência,
parser de status no `hello`, parser de envelope), `scheduleReconnect` (backoff),
`startHeartbeat` (watchdog e heartbeat padrão) e o `onclose` (classificador de
código de fechamento).

Não altere `realtime-provider.test.tsx` — nenhuma linha. Ele é a régua desta
tarefa (ver `<discovery_notes>` item 2). Se algum teste falhar, o defeito está na
extração, não no teste.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && test -f package.json && npx tsc --noEmit && npx vitest run realtime && test "$(grep -c 'from "./protocol"' features/realtime/model/realtime-provider.tsx)" = "1" && test "$(grep -vE '^\s*(//|\*|/\*)' features/realtime/model/realtime-provider.tsx | grep -cE '^(export )?function (isRecord|normalizeTopic|toSequence|parseTopicMap|parseStatusSnapshot|parseEventEnvelope|isAuthorizationFailure|isAuthorizationCloseCode|reconnectDelay|heartbeatWatchdog)')" = "0" && test -z "$(git diff HEAD --name-only -- features/realtime/model/realtime-provider.test.tsx features/realtime/index.ts features/realtime/model/types.ts features/realtime/api/realtime-api.ts)"</automated>
  </verify>
  <done>
`realtime-provider.tsx` tem exatamente um import de `./protocol` e zero
declarações das 10 funções movidas; a janela de estabilidade da reconexão e as
demais constantes que ficam continuam no arquivo; `npx tsc --noEmit` limpo;
`npx vitest run realtime` verde nos dois arquivos de teste do feature; o diff de
`realtime-provider.test.tsx`, `index.ts`, `types.ts` e `realtime-api.ts` está
vazio.
  </done>
</task>

<!-- planner-discipline-allow: isRecord -->
<!-- planner-discipline-allow: normalizeTopic -->
<!-- planner-discipline-allow: toSequence -->
<!-- planner-discipline-allow: parseTopicMap -->
<!-- planner-discipline-allow: parseStatusSnapshot -->
<!-- planner-discipline-allow: parseEventEnvelope -->
<!-- planner-discipline-allow: isAuthorizationFailure -->
<!-- planner-discipline-allow: isAuthorizationCloseCode -->
<!-- planner-discipline-allow: reconnectDelay -->
<!-- planner-discipline-allow: heartbeatWatchdog -->
<!-- planner-discipline-allow: from "./protocol" -->

<task type="auto">
  <name>Task 3: Gates finais do projeto e registro das decisões no SUMMARY</name>
  <files>(nenhum arquivo de código — verificação)</files>
  <action>
Rode os gates do projeto a partir de `frontend`, nesta ordem:
`pnpm typecheck`, `pnpm lint`, `npx vitest run realtime` (isolado) e por fim a
suíte completa `pnpm test`.

Interpretação obrigatória da suíte completa: ela tem instabilidade PRÉ-EXISTENTE
neste repositório — cerca de meia dúzia de testes falham de forma intermitente sob
carga, principalmente em `widgets/pedido-dashboard/ui/orders-list*.test.tsx`. Isso
não é regressão desta tarefa. Critério de decisão:
(a) qualquer falha dentro de `features/realtime/` é regressão real desta mudança e
    precisa ser corrigida antes de fechar — a extração é comportamento-zero, então
    não existe falha "aceitável" ali;
(b) falha fora de `features/realtime/` só conta como regressão se persistir com o
    arquivo isolado; compare com o baseline via `git stash` antes de atribuir a
    culpa à mudança. Esta tarefa não toca nada fora de `features/realtime/model/`,
    então uma regressão externa seria surpreendente.

Se `pnpm lint` reclamar de import não utilizado no provider, é sinal de que algo
foi importado de `./protocol` sem consumidor — remova o símbolo do import em vez
de silenciar a regra.

Registre no SUMMARY.md, obrigatoriamente:
- que o bônus opcional de consolidar o predicado de record duplicado em
  `features/realtime/api/realtime-api.ts` foi **deliberadamente não feito**, porque
  `protocol.ts` importa a classe de erro de request desse mesmo módulo e a
  consolidação fecharia um ciclo de imports entre os dois arquivos; e que existe
  ainda uma terceira cópia já exportada em `features/pedidos/api/pagination.ts`,
  de modo que a consolidação real seria um utilitário em `shared/` — outra tarefa,
  registrada como sugestão de follow-up;
- que `TopicStatusSnapshot` foi para `protocol.ts` (junto do parser que o produz) e
  não para `types.ts`, para não inflar o vocabulário público do módulo com um tipo
  interno;
- que `MAX_EVENT_ID_LENGTH` e `DEFAULT_HEARTBEAT_SECONDS` precisaram virar
  exports (são compartilhadas entre o módulo novo e o que ficou no provider),
  enquanto as outras nove constantes migradas ficaram privadas;
- que `normalizeTopic` foi exportada mesmo sem consumidor atual, por ser
  vocabulário do protocolo;
- a contagem de linhas de `realtime-provider.tsx` antes (1249) e depois, como
  medida da fatia;
- que `realtime-provider.test.tsx` não foi alterado em nenhuma linha — é a
  evidência de que o comportamento é idêntico.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && test -f package.json && pnpm typecheck && pnpm lint && npx vitest run realtime</automated>
  </verify>
  <done>
`pnpm typecheck` e `pnpm lint` limpos; `npx vitest run realtime` verde em execução
isolada; `pnpm test` rodado e qualquer falha classificada explicitamente como
pré-existente (com evidência de baseline) ou corrigida, com zero falhas em
`features/realtime/`; SUMMARY.md contém os seis registros exigidos acima.
  </done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
| --- | --- |
| backend → cliente (frames WebSocket e respostas REST de status/ticket) | Entrada não confiável atravessa aqui; as funções sendo movidas SÃO a validação dessa fronteira |
| `localStorage` do navegador → cliente | Cursor persistido é reidratado por `parsePersistedState`, que depende de três das funções movidas |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
| --- | --- | --- | --- | --- |
| T-260831kpx-01 | Tampering | `parseEventEnvelope`, `parsePersistedState` | mitigate | Copiar `MAX_EVENT_ID_LENGTH` (256) e `MAX_EVENT_TYPE_LENGTH` (128) com valores idênticos e manter o limite de id exportado para o provider; a Task 1 lista os valores explicitamente e a Task 2 exige que `parsePersistedState` continue resolvendo o símbolo |
| T-260831kpx-02 | Elevation of Privilege | `isAuthorizationFailure`, `isAuthorizationCloseCode` | mitigate | Preservar o `instanceof` com a classe de erro importada de `../api/realtime-api` e os cinco códigos de close verbatim; enfraquecer essa classificação faria o provider seguir reconectando com token revogado. Coberto pelos testes de auth já existentes em `realtime-provider.test.tsx`, que não podem ser alterados |
| T-260831kpx-03 | Denial of Service | `reconnectDelay`, `heartbeatWatchdog` | mitigate | Preservar teto de backoff (30s), jitter via `Math.random()` e os clamps de checagem/timeout do watchdog; alterar qualquer um desses limites viraria hot-loop de tickets contra o backend |
| T-260831kpx-04 | Spoofing | `normalizeTopic` / mapa de aliases | mitigate | Copiar as 8 chaves de alias sem adicionar nem remover nenhuma; a normalização é o que impede um tópico arbitrário do backend virar chave de estado no cliente |
| T-260831kpx-SC | Tampering | instalação de pacotes | accept | Nenhum pacote é instalado nesta tarefa — só movimentação de código entre dois arquivos do próprio repositório |

</threat_model>

<verification>
- `features/realtime/model/protocol.ts` existe, é puro (sem React/DOM/WebSocket) e
  exporta as 10 funções, o tipo de instantâneo de status e as 2 constantes
  compartilhadas.
- `realtime-provider.tsx` não declara mais nenhuma das 10 funções e importa todas
  as que ainda usa de `./protocol`.
- `features/realtime/index.ts`, `types.ts`, `realtime-api.ts` e
  `realtime-provider.test.tsx` têm diff vazio ao fim do plano.
- Nenhum limite numérico de validação, backoff ou watchdog mudou de valor.
- `npx vitest run realtime` verde; `pnpm typecheck` e `pnpm lint` limpos.
</verification>

<success_criteria>
`pnpm typecheck` e `pnpm lint` limpos; `npx vitest run realtime` verde com
`realtime-provider.test.tsx` inalterado; `pnpm test` sem nenhuma falha em
`features/realtime/` (falhas conhecidas fora dele classificadas como
pré-existentes com evidência); `realtime-provider.tsx` ~200 linhas menor e sem
cópias locais das funções extraídas; superfície pública de `features/realtime`
idêntica à de antes.
</success_criteria>

<output>
Create `.planning/quick/260831-kpx-extrair-fun-es-puras-de-parsing-valida-o/260831-kpx-SUMMARY.md` when done
</output>
