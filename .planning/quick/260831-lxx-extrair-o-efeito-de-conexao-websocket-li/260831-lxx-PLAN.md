---
phase: 260831-lxx
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - features/realtime/model/connection.ts
  - features/realtime/model/realtime-provider.tsx
autonomous: true
requirements: [QUICK-260831-lxx]

must_haves:
  truths:
    - "Todo o ciclo de vida do socket realtime — runtime mutável, emissão de ticket, handshake de hello/replay, heartbeat com watchdog, backoff de reconexão, poll de status como fallback, resync autoritativo e desmontagem — vive em features/realtime/model/connection.ts"
    - "realtime-provider.tsx não referencia mais a API de socket do navegador, nem registra listeners de janela/documento, nem carrega qualquer uma das sete constantes de tempo/tamanho da conexão"
    - "O efeito de conexão do provider continua na mesma posição da ordem de hooks, com a mesma lista de dez dependências e dentro do mesmo bloco eslint-disable de hoje"
    - "A ordem de execução dentro do efeito é idêntica à de hoje: gate de autenticação, bookkeeping de usuário/token ativos, restauração do estado persistido, registro dos três listeners, primeira tentativa de conexão, devolução da função de desmontagem"
    - "A desmontagem continua executando as mesmas operações na mesma ordem, incluindo o aborto dos controllers de leitura compartilhados com o provider e a devolução dos três slots imperativos ao no-op"
    - "A superfície pública de features/realtime/index.ts continua exatamente RealtimeProvider, useRealtime e o tipo RealtimeTopic"
    - "realtime-provider.test.tsx passa sem nenhuma alteração no arquivo de teste — comportamento e timing idênticos"
    - "connection.ts não importa react, next ou next-auth e não leva diretiva de client, mantendo o padrão dos dois módulos extraídos antes"
  artifacts:
    - path: "features/realtime/model/connection.ts"
      provides: "Máquina de conexão realtime completa: tipo do runtime mutável, as sete constantes de tempo/tamanho da conexão, e a função de arranque que registra listeners, dispara a primeira conexão e devolve a desmontagem"
      exports:
        - "startRealtimeConnection"
        - "RealtimeConnectionDeps"
        - "RealtimeCommandSlot"
      min_lines: 600
  key_links:
    - from: "features/realtime/model/realtime-provider.tsx"
      to: "features/realtime/model/connection.ts"
      via: "efeito de conexão devolve o resultado da função de arranque como sua desmontagem"
      pattern: "from \"./connection\""
    - from: "features/realtime/model/connection.ts"
      to: "features/realtime/model/protocol.ts"
      via: "parsers de frame, classificadores de autorização, backoff e watchdog de heartbeat"
      pattern: "from \"./protocol\""
    - from: "features/realtime/model/connection.ts"
      to: "features/realtime/api/realtime-api.ts"
      via: "emissão de ticket, consulta de status e montagem da URL do socket"
      pattern: "from \"../api/realtime-api\""
    - from: "features/realtime/model/connection.ts"
      to: "features/realtime/model/types.ts"
      via: "tipos do estado de conexão e do envelope de evento usados na assinatura das dependências"
      pattern: "from \"./types\""
---

<objective>
Terceira e última fatia do refactor de `features/realtime/model/realtime-provider.tsx`
(hoje 1010 linhas, depois de `protocol.ts` na task 260831-kpx e `storage.ts` na
260831-lb9): extrair a máquina de conexão — o efeito de ~600 linhas que abre e
governa o socket — para um módulo novo, `features/realtime/model/connection.ts`.

É reorganização PURA. Diferente das duas fatias anteriores, aqui não se move um
conjunto de funções independentes: move-se **um bloco contíguo de escopo único**, com
estado mutável compartilhado (o runtime), quatro declarações de função mutuamente
recursivas que dependem de hoisting, e uma desmontagem que precisa continuar sendo
devolvida pelo mesmo `useEffect`, no mesmo instante. A estratégia é copiar o bloco
**byte a byte** para dentro de uma função de arranque e injetar por parâmetro as onze
coisas que ele hoje enxerga pelo closure do provider.

Purpose: o provider é hoje um arquivo onde 60% das linhas são uma máquina de estado
de rede embutida num `useEffect`. Depois desta fatia ele volta a ser o que o nome diz
— contexto, estado derivado e os callbacks públicos — em ~390 linhas, e a máquina de
conexão passa a ser um módulo que pode ser lido (e um dia testado) sem montar React.
Output: `features/realtime/model/connection.ts` novo com ~670 linhas;
`realtime-provider.tsx` reduzido para ~390 linhas.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@features/realtime/model/realtime-provider.tsx
@features/realtime/model/protocol.ts
@features/realtime/model/storage.ts
@features/realtime/model/types.ts
@features/realtime/index.ts
</context>

<discovery_notes>
Levantamento feito durante o planejamento contra o código atual (HEAD `64c378a`,
branch `develop`, árvore limpa). O executor pode confiar nestes fatos sem
re-verificar. As referências de linha são do arquivo como está agora.

1. **A costura é exata e contígua: linhas 357 a 957.** O que se move começa em
   `const runtime: ConnectionRuntime = {` (l. 357) e termina no `};` que fecha a
   função de desmontagem devolvida pelo efeito (l. 957). Nada antes, nada depois.
   Após a extração o corpo do efeito é: as linhas 318-355 exatamente como estão, uma
   única instrução `return` chamando a função de arranque, e o fecho `}, [ ... ]`.

2. **Correção importante ao levantamento original da sessão.** A preocupação
   registrada era que o efeito escrevesse direto nas refs de dedupe de eventos, o que
   obrigaria a atravessá-las para o módulo novo. Isso **não vale mais**: no arquivo de
   hoje as únicas escritas nessas duas refs dentro do efeito estão nas linhas 348-349,
   que pertencem ao bloco de restauração do estado persistido e **ficam no provider**.
   Dentro da região 357-957 elas não aparecem em nenhuma linha. A superfície que
   realmente atravessa a fronteira é menor do que se temia — ver item 3.

3. **Inventário completo do que a região 357-957 enxerga pelo closure.** São onze
   itens, e este é o inventário fechado — não existe um décimo segundo:

   | # | O que | Uso na região | Como injetar |
   |---|---|---|---|
   | 1 | token de acesso do runtime (l. 331) | 3 chamadas REST (l. 463, 589, 610) | valor `string` |
   | 2 | ref da sequência (l. 97) | leitura única em l. 649 | objeto com `current` **somente leitura** |
   | 3 | conjunto de controllers de leitura capturado em l. 332 | aborto + limpeza na desmontagem (l. 952-953) | o próprio `Set` |
   | 4 | slot de reconexão manual (l. 105) | escrita l. 901, reset l. 954 | slot `{ current }` |
   | 5 | slot de resync (l. 106) | escrita l. 896, reset l. 955 | slot `{ current }` |
   | 6 | slot de parada por autorização (l. 107) | escrita l. 424, reset l. 956 | slot `{ current }` |
   | 7 | setter do estado de conexão | 9 chamadas | função |
   | 8 | aplicação de snapshot mesclado | l. 437, 620, 736 | função |
   | 9 | aplicação de snapshot autoritativo | l. 431 | função |
   | 10 | aplicação de evento | l. 780, 784 | função |
   | 11 | substituição da sequência | l. 757 | função |

   Os itens 4-6 devem ser tipados **estruturalmente** (`{ current: () => void }`), não
   com o tipo de ref do React: os objetos de ref do React satisfazem essa forma, e
   assim o módulo novo continua livre de React (item 9).

4. **As sete constantes do topo do provider vão todas juntas, e nenhuma outra fica.**
   Teto de tamanho de mensagem, intervalo do poll de status, timeout de abertura do
   socket, timeout do handshake de replay, margem de abertura de ticket, TTL de
   fallback de ticket e a janela de estabilidade da reconexão — verifiquei uma a uma:
   **todos os usos das sete estão dentro da região 357-957**. Depois desta task o
   provider fica sem nenhuma constante de módulo. O tipo do runtime mutável (l. 60-78)
   também é usado só na região e vai junto, permanecendo **privado** no módulo novo.

5. **Quatro declarações de função dependem de hoisting — não as converta.** Na região,
   `connect`, `reconnectImmediately`, `disconnectForResync` e `reconcileAfterResync`
   são declarações `function` (l. 551, 829, 855, 876), enquanto tudo antes delas são
   `const` de arrow. E as arrows **chamam as declarações**: o agendador de reconexão
   (l. 517) chama `connect` estando definido antes dele; o fechamento do socket
   (l. 810) chama a reconciliação de resync. Isso só compila e roda porque declarações
   `function` sobem no escopo. Converter qualquer uma delas para `const` arrow durante
   a cópia produz erro de zona morta temporal em runtime — falha que a suíte pega, mas
   depois de tempo perdido. **Copie a região preservando `const` vs `function` e a
   ordem original de cada declaração.**

6. **A ordem das três últimas instruções do efeito é comportamento observável.** Hoje:
   registrar os três listeners (l. 925-927), disparar a primeira conexão sem aguardar
   (l. 928), devolver a desmontagem (l. 930). A suíte usa timers falsos e um socket
   falso que registra instâncias na ordem de construção; inverter listener e primeira
   conexão, ou mover a primeira conexão para depois do `return`, muda a ordem de
   efeitos observada. Preserve as três instruções na mesma sequência, e mantenha o
   descarte explícito da promessa como está.

7. **Nove imports do provider ficam órfãos.** De `../api/realtime-api`: montagem da
   URL do socket, consulta de status e emissão de ticket. De `./protocol`: heartbeat
   padrão, watchdog, classificador de código de fechamento, predicado de record,
   parser de envelope, parser de status, backoff e coerção de sequência. Todos passam
   a ser consumidos por `connection.ts`. **Não removíveis:** de `../api/realtime-api`,
   a marcação de tópico lido e a classe de erro de requisição (ambas usadas no
   callback público de marcação de leitura); de `./protocol`, o classificador de falha
   de autorização (l. 268, **também** usado dentro da região — os dois módulos o
   importam) e o tipo do instantâneo de status (l. 136, 156). Todos os imports de
   `./types` e de `./storage` do provider **ficam**: nenhum deles é usado na região.
   Atenção: o ESLint deste projeto trata símbolo não usado como **warning**, não erro —
   `pnpm lint` passaria mesmo deixando os órfãos. Por isso a Task 2 tem gate de grep.

8. **O bloco `eslint-disable` que envolve os dois efeitos (l. 301 e l. 970) fica como
   está.** Ele continua necessário: a subida da flag de storage pronto (l. 354)
   permanece dentro do efeito. Não estreite, não amplie, não reescreva a justificativa.

9. **`connection.ts` não leva diretiva de client e não importa React.** Mesmo padrão
   de `protocol.ts` e `storage.ts`: toda API de navegador é tocada dentro de corpo de
   função chamada a partir de um efeito, nunca na avaliação do módulo. Existe um teste
   de render no servidor na suíte; efeitos não rodam ali, então nenhum destes caminhos
   é exercitado durante SSR.

10. **`connection.ts` não entra em `features/realtime/index.ts`.** É detalhe interno do
    feature, como os outros dois módulos do refactor. A superfície pública continua
    sendo só o provider, o hook e o tipo de tópico.

11. **`realtime-provider.test.tsx` NÃO importa nada de privado** — só o provider e o
    hook de `./realtime-provider`, o tipo do valor de contexto de `./types` e o
    namespace da API de `../api/realtime-api`. Ele **não deve ser tocado em nenhuma
    linha**: é o instrumento de medição desta tarefa, não o objeto dela. A suíte troca
    a implementação global de socket por uma falsa e usa timers falsos em catorze
    blocos distintos — qualquer deslocamento de ordem de efeitos aparece lá.

**Armadilha de ferramenta 1 (herdada da task 260828-fz2):** `pnpm test -- <arquivo>`
NÃO filtra, roda a suíte inteira. Use `npx vitest run <filtro>` direto, e lembre que o
filtro é REGEX contra o caminho. `npx vitest run realtime` casa com os dois arquivos
de teste do feature.

**Armadilha de ferramenta 2 (herdada da task 260831-kpx):** `frontend` é um
**repositório git próprio**, aninhado na pasta de trabalho que também contém o backend.
Portanto `cd "$(git rev-parse --show-toplevel)"` puro já aterrissa na raiz do frontend a
partir de qualquer subdiretório dele — não concatene o nome da pasta depois, isso
resolve para caminho inexistente e derruba a cadeia `&&` inteira antes de qualquer gate
rodar.

**Armadilha de ferramenta 3 (observada nas duas tasks anteriores):** a suíte completa
tem instabilidade pré-existente sob carga em
`widgets/pedido-dashboard/ui/orders-list.pagination.test.tsx` (timeouts de `waitFor`).
Se aparecer falha lá na Task 3, re-execute **só aquele arquivo** e confirme que passa
isolado antes de suspeitar desta mudança — nenhum arquivo fora de
`features/realtime/model/` é tocado por este plano.

**Sem worktree:** execute direto na árvore de trabalho atual (caminho longo + OneDrive
já quebraram worktree neste projeto).

**Git:** commits vão para `develop` (nunca `main`), um por task, e **nenhum push
acontece sem aprovação explícita da desenvolvedora**.
</discovery_notes>

<tasks>

<task type="auto">
  <name>Task 1: Criar features/realtime/model/connection.ts com a máquina de conexão copiada verbatim atrás de uma função de arranque</name>
  <files>features/realtime/model/connection.ts (novo)</files>
  <action>
Crie `features/realtime/model/connection.ts`. Sem diretiva de client e sem nenhum
import de react, next ou next-auth (ver `<discovery_notes>` item 9).

Abra com um comentário de cabeçalho curto em português, no tom dos cabeçalhos já
existentes em `protocol.ts` e `storage.ts`, dizendo que o módulo concentra o ciclo de
vida do socket realtime — emissão de ticket, handshake, heartbeat com watchdog,
backoff de reconexão, poll de status como fallback, resync autoritativo e desmontagem
— e que ele recebe do provider apenas o token, os slots imperativos e os aplicadores
de estado, para poder ser lido sem montar React.

Imports do módulo, e nenhum outro:
- de `../api/realtime-api`: montagem da URL do socket, consulta de status e emissão de
  ticket;
- de `./protocol`: heartbeat padrão, watchdog de heartbeat, classificador de código de
  fechamento, classificador de falha de autorização, predicado de record, parser de
  envelope de evento, parser de instantâneo de status, backoff de reconexão, coerção
  de sequência, e o tipo do instantâneo de status (import de tipo);
- de `./types`: o tipo do estado de conexão e o tipo do envelope de evento (imports de
  tipo), usados só na assinatura das dependências.

**Bloco 1 — constantes.** Mova as **sete** constantes de módulo do topo de
`realtime-provider.tsx` com exatamente os mesmos nomes e valores que têm hoje. Todas
**privadas**, sem export: nenhuma delas é consumida fora da máquina de conexão
(`<discovery_notes>` item 4). Não traga nenhuma outra declaração do topo do provider.

**Bloco 2 — tipo do runtime mutável.** Mova o tipo local do provider que descreve o
runtime da conexão (as dezoito propriedades: flags de parada e de conexão em curso,
geração de conexão, contador de tentativas, socket, dois controllers de aborto, seis
temporizadores, marca do último recebimento e as duas flags de resync), com o **mesmo
nome** e **privado**, sem export.

**Bloco 3 — tipos públicos da fronteira.** Declare e exporte, nesta ordem:
- `RealtimeCommandSlot` — tipo estrutural com uma única propriedade `current` do tipo
  função sem argumentos e sem retorno. Ele existe justamente para que os três slots
  imperativos do provider atravessem a fronteira sem arrastar o tipo de ref do React
  (`<discovery_notes>` item 3).
- `RealtimeConnectionDeps` — objeto com exatamente onze campos, um por item do
  inventário do `<discovery_notes>` item 3, nesta ordem e com estes nomes:
  `accessToken` (string); `sequenceRef` (objeto com `current` numérico marcado
  `readonly`, para documentar que o módulo só lê); `readAbortControllers` (conjunto de
  controllers de aborto); `requestReconnectRef`, `requestResyncRef` e `stopForAuthRef`
  (os três do tipo do slot acima); `setConnectionState` (recebe o estado de conexão);
  `applyStatusSnapshot` e `applyAuthoritativeStatusSnapshot` (recebem o instantâneo de
  status); `applyEvent` (recebe o envelope e um segundo parâmetro booleano
  **opcional**, para casar com o callback do provider que tem valor padrão);
  `replaceSequence` (recebe um número).

**Bloco 4 — a função de arranque.** Exporte
`startRealtimeConnection(deps: RealtimeConnectionDeps): () => void`.

A primeira instrução do corpo é uma desestruturação de `deps` trazendo os onze campos,
com **um único apelido**: o token entra com o nome que a região já usa hoje para a
variável de token do runtime. Esse apelido é deliberado — é o que permite copiar as
600 linhas seguintes sem editar uma única delas.

Em seguida, cole a região de `realtime-provider.tsx` que vai da criação do runtime
mutável até o `};` que fecha a função de desmontagem devolvida pelo efeito — **byte a
byte, sem uma edição**. Isso inclui, na ordem original: os cinco encerradores de
temporizador/poll, a parada por autorização e a atribuição dela ao slot, o despachante
de snapshot, o poll de status, o arranque do poll, o agendamento de reconexão, o
arranque do heartbeat, o agendamento de reset de tentativas, a rotina de conexão com
todo o corpo do socket, a reconexão imediata, a desconexão para resync, a
reconciliação pós-resync, a atribuição dos outros dois slots, os três handlers de
janela/documento, o registro dos três listeners, o disparo da primeira conexão e a
função de desmontagem. A última instrução do corpo é o `return` dessa função de
desmontagem, que passa a ser o retorno da função de arranque.

Regras não negociáveis na cópia:
- preserve `const` de arrow onde é arrow e declaração de função onde é declaração de
  função, na ordem original — quatro rotinas dependem de hoisting
  (`<discovery_notes>` item 5);
- preserve as três últimas instruções na sequência exata em que estão hoje
  (`<discovery_notes>` item 6);
- preserve **todos** os comentários explicativos em português, palavra por palavra e
  no mesmo ponto do código;
- preserve cada código numérico de fechamento e cada string de motivo de fechamento
  exatamente como estão — a suíte afirma sobre vários deles;
- não reordene condições de guarda, não troque comparação estrita por frouxa, não
  extraia sub-funções novas, não renomeie variável local nenhuma, não adicione log,
  telemetria, `try/catch` novo, parâmetro opcional novo nem `async` onde não havia.

A única mudança sintática legítima em relação ao original é o recuo: o corpo sai de
dentro de um `useEffect` e passa a ser o corpo de uma função de módulo. Reindente, mas
não reescreva.

NÃO toque em `realtime-provider.tsx` nesta task — ele continua com a máquina embutida
e segue compilando e passando os testes normalmente. A duplicação temporária é
esperada e some na Task 2.

NÃO toque em `protocol.ts`, `storage.ts`, `types.ts`, `realtime-api.ts`,
`features/realtime/index.ts` (item 10) nem no arquivo de teste (item 11).
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && test -f package.json && test -f features/realtime/model/connection.ts && npx tsc --noEmit && npx vitest run realtime && test "$(grep -cE '^import .*(react|next/|next-auth)' features/realtime/model/connection.ts)" = "0" && test "$(grep -c 'use client' features/realtime/model/connection.ts)" = "0" && test "$(grep -cE '^export (function startRealtimeConnection|type (RealtimeConnectionDeps|RealtimeCommandSlot))' features/realtime/model/connection.ts)" = "3" && test "$(grep -cE '^const (MAX_MESSAGE_LENGTH|STATUS_POLL_INTERVAL_MS|WEBSOCKET_OPEN_TIMEOUT_MS|REPLAY_HANDSHAKE_TIMEOUT_MS|TICKET_OPEN_MARGIN_MS|TICKET_TTL_FALLBACK_MS|RECONNECT_STABLE_MS) =' features/realtime/model/connection.ts)" = "7" && test "$(grep -c '^type ConnectionRuntime = {' features/realtime/model/connection.ts)" = "1" && test "$(grep -cE '^  (async function connect|function reconnectImmediately|function disconnectForResync|function reconcileAfterResync)\(' features/realtime/model/connection.ts)" = "4" && for token in authorization_stopped heartbeat_timeout connect_timeout replay_handshake_timeout invalid_hello invalid_replay_complete invalid_replay_event message_too_large client_reconnect provider_unmounted read_cursor_expired resync_status_unavailable realtime_ticket_expiry_budget visibilitychange; do grep -q "$token" features/realtime/model/connection.ts || exit 1; done && test "$(wc -l < features/realtime/model/connection.ts)" -gt 600 && test "$(git hash-object features/realtime/model/realtime-provider.tsx)" = "c119ab8fcc4bd74bd1dad1225c0dbd203f251c89" && test "$(git hash-object features/realtime/model/realtime-provider.test.tsx)" = "00adf530d57aa2728919338fa46ef8e1009561c2" && test "$(git hash-object features/realtime/model/protocol.ts)" = "aa48dcf0643f63ae498342c00e121e270b6c7f4b" && test "$(git hash-object features/realtime/model/storage.ts)" = "41a7c3d1eedb0312945171158b0bfe63fdb747be" && test "$(git hash-object features/realtime/index.ts)" = "ba07ec6838902e8371aa23be3986f996bc6d42d3"</automated>
  </verify>
  <done>
`features/realtime/model/connection.ts` existe com as sete constantes privadas, o tipo
do runtime privado, os dois tipos de fronteira exportados e a função de arranque
exportada, contendo a região copiada verbatim e devolvendo a desmontagem. As quatro
declarações que dependem de hoisting continuam sendo declarações de função. O módulo
não importa react/next/next-auth e não tem diretiva de client. `npx tsc --noEmit`
limpo e a suíte de realtime passando (o provider ainda tem a máquina embutida neste
ponto — é esperado). Provider, teste, `protocol.ts`, `storage.ts` e `index.ts` com
blob inalterado.
  </done>
</task>

<!-- planner-discipline-allow: react -->
<!-- planner-discipline-allow: next/ -->
<!-- planner-discipline-allow: next-auth -->
<!-- planner-discipline-allow: use client -->
<!-- planner-discipline-allow: ConnectionRuntime -->
<!-- planner-discipline-allow: RealtimeConnectionDeps -->
<!-- planner-discipline-allow: RealtimeCommandSlot -->
<!-- planner-discipline-allow: startRealtimeConnection -->

<task type="auto">
  <name>Task 2: Esvaziar o efeito de conexão do provider e religá-lo à função de arranque</name>
  <files>features/realtime/model/realtime-provider.tsx</files>
  <action>
Em `features/realtime/model/realtime-provider.tsx`, apague o que foi para
`connection.ts` na Task 1 e religue o efeito. Nada mais no arquivo pode mudar: mesma
ordem de hooks, mesmos nomes de refs e de estado, mesmas listas de dependência, mesmo
corpo de todos os callbacks públicos, mesmos comentários fora da região removida.

**Passo 1 — remoções no topo.** Tire do arquivo as **sete** constantes de módulo
(teto de tamanho de mensagem, intervalo do poll de status, timeout de abertura do
socket, timeout do handshake de replay, margem de abertura de ticket, TTL de fallback
de ticket e janela de estabilidade da reconexão) e o tipo local do runtime mutável.
Depois disso o provider fica sem nenhuma constante de módulo além do contexto React —
isso é esperado (`<discovery_notes>` item 4).

**Passo 2 — remoção da região.** Dentro do efeito de conexão, apague o bloco contíguo
que começa na criação do runtime mutável e termina no fecho da função de desmontagem
devolvida (`<discovery_notes>` item 1). Tudo que vem **antes** dele no mesmo efeito
permanece intocado, linha por linha: a saída antecipada durante carregamento da
sessão; o ramo não autenticado com a limpeza do storage e o reset em memória; a
captura local do token do runtime e a captura local do conjunto de controllers de
leitura; o ramo de troca de conta; a fixação das duas refs de usuário/token ativos; e
o bloco de restauração do estado persistido, incluindo as duas atribuições às
estruturas de dedupe de evento e a subida da flag de storage pronto.

Mantenha as duas capturas locais (token do runtime e conjunto de controllers) exatamente
onde estão: a segunda existe para fixar o valor da ref no momento da montagem, e essa
semântica é o que a desmontagem consome.

**Passo 3 — a nova última instrução do efeito.** No lugar da região removida, uma única
instrução `return` que chama a função de arranque importada, passando um objeto
literal com os onze campos definidos na Task 1, usando forma abreviada onde o nome
local já coincide. Os valores são, em ordem: a captura local do token; a ref de
sequência; a captura local do conjunto de controllers; os três slots imperativos (o de
reconexão manual, o de resync e o de parada por autorização); o setter do estado de
conexão; o aplicador de snapshot mesclado; o aplicador de snapshot autoritativo; o
aplicador de evento; e o substituidor de sequência. Recue o objeto com seis espaços,
para ficar consistente com o resto do corpo do efeito.

**Passo 4 — a lista de dependências não muda.** Continua com os mesmos dez nomes, na
mesma ordem alfabética em que estão hoje. Confira um a um que todos ainda têm uso no
que sobrou do efeito ou no objeto passado — têm: os aplicadores e o substituidor de
sequência viajam no objeto, e os dois substituidores de revisões mais o reset de
estado continuam sendo chamados na restauração e no ramo não autenticado.

**Passo 5 — o bloco `eslint-disable` fica.** Não mexa na abertura acima do efeito de
persistência nem no fecho abaixo do efeito de conexão, e não altere o texto da
justificativa (`<discovery_notes>` item 8).

**Passo 6 — import novo.** Acrescente um import de `./connection` em **uma única
linha**, ao lado dos imports relativos já existentes, trazendo apenas a função de
arranque. Não importe os dois tipos de fronteira: o objeto literal é inferido no ponto
de chamada.

**Passo 7 — enxugar os dois imports que ficaram órfãos.** De `../api/realtime-api`
remova a montagem da URL do socket, a consulta de status e a emissão de ticket;
**mantenha** a marcação de tópico lido e a classe de erro de requisição. De
`./protocol` remova o heartbeat padrão, o watchdog de heartbeat, o classificador de
código de fechamento, o predicado de record, o parser de envelope de evento, o parser
de instantâneo de status, o backoff de reconexão e a coerção de sequência;
**mantenha** o classificador de falha de autorização e o tipo do instantâneo de status
(`<discovery_notes>` item 7). Não toque nos imports de `./types` e `./storage` — todos
os símbolos deles continuam em uso.

Ao terminar, o arquivo não pode conter nenhuma referência à API de socket do
navegador, nenhum registro ou remoção de listener de janela/documento e nenhuma das
sete constantes de tempo/tamanho da conexão.

Não altere `realtime-provider.test.tsx` — nenhuma linha (item 11). Ele é a régua desta
tarefa. Se algum teste falhar, o defeito está na extração, não no teste; falha nos
casos que usam timers falsos aponta para deslocamento na ordem das três últimas
instruções do efeito (item 6) ou para conversão indevida de declaração de função em
arrow (item 5).

Não altere `connection.ts` (ele foi fechado na Task 1), `protocol.ts`, `storage.ts`,
`types.ts`, `realtime-api.ts` nem `features/realtime/index.ts`.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && test -f package.json && npx tsc --noEmit && npx vitest run realtime && test "$(grep -c 'from "./connection"' features/realtime/model/realtime-provider.tsx)" = "1" && test "$(grep -c 'startRealtimeConnection' features/realtime/model/realtime-provider.tsx)" = "2" && P="$(grep -vE '^\s*(//|\*|/\*)' features/realtime/model/realtime-provider.tsx)" && test "$(printf '%s\n' "$P" | grep -c 'WebSocket')" = "0" && test "$(printf '%s\n' "$P" | grep -cE '(add|remove)EventListener')" = "0" && test "$(printf '%s\n' "$P" | grep -cE '(ConnectionRuntime|MAX_MESSAGE_LENGTH|STATUS_POLL_INTERVAL_MS|WEBSOCKET_OPEN_TIMEOUT_MS|REPLAY_HANDSHAKE_TIMEOUT_MS|TICKET_OPEN_MARGIN_MS|TICKET_TTL_FALLBACK_MS|RECONNECT_STABLE_MS)')" = "0" && test "$(printf '%s\n' "$P" | grep -cE '(buildRealtimeWebSocketUrl|requestRealtimeStatus|requestRealtimeTicket|DEFAULT_HEARTBEAT_SECONDS|heartbeatWatchdog|isAuthorizationCloseCode|isRecord|parseEventEnvelope|parseStatusSnapshot|reconnectDelay|toSequence)')" = "0" && test "$(printf '%s\n' "$P" | grep -c 'isAuthorizationFailure')" = "2" && test "$(printf '%s\n' "$P" | grep -c 'markRealtimeTopicRead')" = "2" && test "$(printf '%s\n' "$P" | grep -c 'RealtimeRequestError')" = "2" && test "$(printf '%s\n' "$P" | grep -c 'TopicStatusSnapshot')" = "3" && test "$(grep -cE '^    (accessToken|applyAuthoritativeStatusSnapshot|applyEvent|applyStatusSnapshot|authStatus|replaceReadRevisions|replaceSequence|replaceTopicRevisions|resetClientState|userKey),$' features/realtime/model/realtime-provider.tsx)" = "10" && test "$(grep -c 'react-hooks/set-state-in-effect' features/realtime/model/realtime-provider.tsx)" = "2" && test "$(wc -l < features/realtime/model/realtime-provider.tsx)" -lt 450 && test "$(wc -l < features/realtime/model/realtime-provider.tsx)" -gt 320 && test -z "$(git diff HEAD --name-only -- features/realtime/model/realtime-provider.test.tsx features/realtime/index.ts features/realtime/model/types.ts features/realtime/model/protocol.ts features/realtime/model/storage.ts features/realtime/model/connection.ts features/realtime/api/realtime-api.ts)"</automated>
  </verify>
  <done>
`realtime-provider.tsx` tem exatamente um import de `./connection` e uma única chamada
à função de arranque, que é a última instrução do efeito de conexão. Zero referências
à API de socket, a listeners de janela/documento, ao tipo do runtime e às sete
constantes de conexão. Os nove símbolos órfãos saíram dos dois imports e os quatro que
continuam em uso permanecem. A lista de dez dependências e o bloco `eslint-disable`
estão intactos. O arquivo caiu para menos de 450 linhas. `npx tsc --noEmit` limpo e a
suíte de realtime verde, com o arquivo de teste, `connection.ts`, `protocol.ts`,
`storage.ts`, `types.ts`, `realtime-api.ts` e `index.ts` sem nenhuma alteração na
árvore de trabalho.
  </done>
</task>

<!-- planner-discipline-allow: ConnectionRuntime -->
<!-- planner-discipline-allow: startRealtimeConnection -->
<!-- planner-discipline-allow: isAuthorizationFailure -->
<!-- planner-discipline-allow: markRealtimeTopicRead -->
<!-- planner-discipline-allow: RealtimeRequestError -->
<!-- planner-discipline-allow: TopicStatusSnapshot -->
<!-- planner-discipline-allow: accessToken -->
<!-- planner-discipline-allow: applyAuthoritativeStatusSnapshot -->
<!-- planner-discipline-allow: applyEvent -->
<!-- planner-discipline-allow: applyStatusSnapshot -->
<!-- planner-discipline-allow: authStatus -->
<!-- planner-discipline-allow: replaceReadRevisions -->
<!-- planner-discipline-allow: replaceSequence -->
<!-- planner-discipline-allow: replaceTopicRevisions -->
<!-- planner-discipline-allow: resetClientState -->
<!-- planner-discipline-allow: userKey -->
<!-- planner-discipline-allow: react-hooks/set-state-in-effect -->

<task type="auto">
  <name>Task 3: Gates finais do projeto, verificação de fidelidade do movimento e registro no SUMMARY</name>
  <files>(nenhum arquivo de código — task de verificação)</files>
  <action>
Rode os gates do projeto inteiro, na raiz do frontend, e feche a tarefa.

1. `npx tsc --noEmit` — precisa passar limpo.
2. `npx eslint features/realtime` — sem erro. Confira também que não sobrou
   **warning** de símbolo não usado nos dois arquivos tocados: o ESLint daqui reporta
   isso como aviso e não derruba o comando (`<discovery_notes>` item 7).
3. **Verificação de fidelidade do movimento.** Antes de rodar a suíte completa,
   confirme que a extração não perdeu conteúdo. Rode
   `git diff 64c378a -- features/realtime/model/realtime-provider.tsx --stat` e
   compare o número de linhas removidas com o tamanho de `connection.ts`: o módulo
   novo tem que ser da mesma ordem de grandeza do que saiu do provider (esperado ~600
   linhas removidas contra ~670 criadas, a diferença sendo cabeçalho, imports, tipos
   de fronteira e assinatura). Uma diferença grande para menos significa que algum
   trecho foi perdido no caminho — investigue antes de seguir.
4. `pnpm test` — suíte completa do frontend, como pede a validação desta tarefa. Se
   houver falha, aplique a triagem da **Armadilha de ferramenta 3**: qualquer falha
   fora de `features/realtime/` deve ser re-executada isoladamente com
   `npx vitest run <caminho-do-arquivo>`; se passar isolada, é a instabilidade
   pré-existente sob carga já documentada nas duas tasks anteriores, não regressão —
   registre isso no SUMMARY em vez de "consertar" o teste. Falha **dentro** de
   `features/realtime/` é regressão real desta tarefa e deve ser corrigida no código
   de produção, nunca no arquivo de teste.

Depois, escreva o SUMMARY registrando explicitamente as decisões de projeto que este
plano tomou, para que quem voltar a este código entenda o critério:
- o módulo novo é uma **função de arranque simples, não um hook** — a região extraída
  já era livre de React e mantê-la assim preserva a posição e a lista de dependências
  do efeito original, que é o que a suíte sensível a timing mede;
- as dependências entram por **um objeto de onze campos**, e os três slots imperativos
  atravessam a fronteira com um tipo **estrutural** próprio em vez do tipo de ref do
  React, para o módulo continuar sem importar React;
- a ref de sequência entra marcada como **somente leitura**, documentando no tipo que
  a máquina de conexão só a consulta;
- o conjunto de controllers de leitura foi passado **como o próprio conjunto** e não
  atrás de um callback novo, porque a captura local que o provider já fazia é
  exatamente a semântica que a desmontagem consome — envolvê-la seria mudança não
  pedida;
- as sete constantes de tempo/tamanho ficaram **privadas** no módulo novo (nenhuma tem
  consumidor fora dele), diferente do critério das duas fatias anteriores, onde
  constantes compartilhadas foram exportadas.

Registre também, como follow-up **fora** deste plano: `connection.ts` ainda não tem
teste próprio (a cobertura vem indiretamente pela suíte do provider), mas agora é
testável sem montar React — os candidatos naturais são o poll de status, o backoff e a
validação do handshake. E anote que o refactor de três passos terminou: o provider
saiu de ~1240 linhas (antes da 260831-kpx) para ~390.

Não faça push. Os commits ficam em `develop` aguardando aprovação explícita da
desenvolvedora.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && test -f package.json && npx tsc --noEmit && npx eslint features/realtime && npx vitest run realtime && test "$(git hash-object features/realtime/model/realtime-provider.test.tsx)" = "00adf530d57aa2728919338fa46ef8e1009561c2" && test "$(git hash-object features/realtime/index.ts)" = "ba07ec6838902e8371aa23be3986f996bc6d42d3" && test "$(git hash-object features/realtime/model/types.ts)" = "04834de4eb0d133e82a7811c467ea1a293a683f1" && test "$(git hash-object features/realtime/model/protocol.ts)" = "aa48dcf0643f63ae498342c00e121e270b6c7f4b" && test "$(git hash-object features/realtime/model/storage.ts)" = "41a7c3d1eedb0312945171158b0bfe63fdb747be" && test "$(git hash-object features/realtime/api/realtime-api.ts)" = "fb9d33fa13b4e78d3498937907a08402a1918391" && test -z "$(git status --porcelain -- features/realtime)" && test "$(git rev-parse --abbrev-ref HEAD)" = "develop"</automated>
  </verify>
  <done>
Typecheck, lint do feature e suíte de realtime verdes; verificação de fidelidade do
movimento feita e registrada; suíte completa executada e qualquer falha fora de
`features/realtime/` triada e justificada no SUMMARY. Os seis arquivos que não podiam
mudar têm blob idêntico ao do início da tarefa, não há nada pendente na árvore dentro
de `features/realtime` e o branch continua sendo `develop`. SUMMARY escrito com as
cinco decisões e os follow-ups. Nenhum push feito.
  </done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
| --- | --- |
| backend → socket realtime | Todo frame recebido é entrada não confiável: chega por rede, é JSON arbitrário e alimenta cursor, revisões e dedupe do cliente |
| backend → endpoints REST de ticket/status | Respostas de emissão de ticket e de status atravessam a mesma fronteira e podem substituir o watermark local no caminho autoritativo |
| sessão do usuário → runtime da conexão | O token de acesso e a identidade do usuário ficam presos ao runtime de uma montagem do efeito; logout e troca de conta precisam derrubar esse runtime inteiro |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
| --- | --- | --- | --- | --- |
| T-lxx-01 | Tampering | validação de frames no handler de mensagem movido para `connection.ts` | mitigate | A cópia verbatim preserva integralmente as invariantes de handshake que hoje fecham o socket com código 4002: hello único, sequência do hello igual à pedida, `replay_complete` só depois do hello e casando com o watermark, e evento de replay obrigatoriamente dentro da janela pedida. Nenhuma condição pode ser reordenada ou relaxada — gate de literais de motivo de fechamento na Task 1 e suíte do provider inalterada como prova |
| T-lxx-02 | Denial of Service | teto de tamanho de mensagem e watchdog de heartbeat | mitigate | O teto de 64 KiB (aplicado tanto ao texto quanto ao blob, fechando com 1009) e o watchdog derivado do heartbeat negociado viajam junto com a região. As sete constantes de tempo/tamanho vão com os mesmos valores, gate de grep exigindo as sete presentes em `connection.ts` e zero remanescentes no provider |
| T-lxx-03 | Denial of Service | hot-loop de emissão de ticket / reconexão | mitigate | O backoff exponencial com jitter, a janela de estabilidade que só zera o contador de tentativas após conexão sustentada, o guard de resync em voo e o orçamento mínimo de TTL antes de abrir o socket continuam intactos. A regra "não extraia sub-funções novas, não reordene guardas" existe justamente para não abrir brecha aqui |
| T-lxx-04 | Elevation of Privilege | parada por falha de autorização | mitigate | Os dois caminhos de parada — código de fechamento de autorização e falha de autorização em chamada REST — permanecem, e o slot imperativo continua sendo preenchido **antes** da primeira tentativa de conexão, preservando o ponto de entrada usado pelo callback público de marcação de leitura. A atribuição do slot está dentro da região copiada verbatim, na mesma posição |
| T-lxx-05 | Information Disclosure | socket autenticado sobrevivendo a logout ou troca de conta | mitigate | A desmontagem é o item mais sensível desta extração: ela precisa continuar abortando os dois controllers do runtime e os controllers de leitura compartilhados, limpando os seis temporizadores, desarmando os handlers e fechando o socket com 1000, e removendo os três listeners. Ela viaja como a última instrução da região e volta a ser o valor devolvido pelo mesmo `useEffect`, no mesmo instante — nenhum caminho novo de saída antecipada foi introduzido |
| T-lxx-SC | Tampering | instalação de pacotes | accept | Nenhuma dependência nova é adicionada por este plano — o módulo novo usa apenas API de navegador e módulos já existentes do próprio feature. Não há gate de legitimidade de pacote a executar |

</threat_model>

<verification>
- `npx tsc --noEmit` limpo na raiz do frontend
- `npx eslint features/realtime` sem erro e sem warning novo de símbolo não usado
- `npx vitest run realtime` verde, com `realtime-provider.test.tsx` byte a byte
  idêntico ao estado inicial (blob `00adf53`)
- `pnpm test` executado; falhas fora de `features/realtime/` triadas por re-execução
  isolada contra a instabilidade pré-existente conhecida
- `features/realtime/index.ts`, `types.ts`, `protocol.ts`, `storage.ts` e
  `realtime-api.ts` com blob inalterado — a superfície pública e as camadas vizinhas
  não se moveram
- Zero referência à API de socket, a listeners de janela/documento e às sete
  constantes de conexão em `realtime-provider.tsx`
- Lista de dez dependências do efeito e bloco `eslint-disable` preservados
- Contagem de linhas removidas do provider compatível com o tamanho de `connection.ts`
- Dois commits atômicos em `develop`, sem push
</verification>

<success_criteria>
- `features/realtime/model/connection.ts` existe e concentra o ciclo de vida completo
  do socket realtime, livre de React e sem diretiva de client
- `realtime-provider.tsx` cai de 1010 para ~390 linhas e o efeito de conexão termina
  numa única chamada à função de arranque
- A ordem de execução dentro do efeito e o conteúdo da desmontagem são idênticos aos
  de hoje
- Zero alteração em arquivo de teste e zero alteração na superfície pública do feature
- A suíte sensível a timing passa sem nenhuma adaptação
</success_criteria>

<output>
Create `.planning/quick/260831-lxx-extrair-o-efeito-de-conexao-websocket-li/260831-lxx-SUMMARY.md` when done
</output>
