---
phase: 260828-emx
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - widgets/pedido-dashboard/model/use-adequacao-processing.ts
  - widgets/pedido-dashboard/model/use-adequacao-processing.test.tsx
  - widgets/pedido-dashboard/ui/orders-list.tsx
autonomous: true
requirements: [QUICK-260828-emx]

must_haves:
  truths:
    - "O hook de processamento de adequação vive em widgets/pedido-dashboard/model/ e é a única definição do fluxo"
    - "orders-list.tsx consome esse hook e não guarda mais nenhuma das funções/refs do fluxo de mutação"
    - "orders-list.processing.test.tsx continua passando sem uma linha alterada"
    - "Existe um teste unitário que exercita o hook isolado, sem renderizar OrdersList"
    - "A chave idempotente sobrevive ao retry do MESMO payload e só roda em falha terminal retryable"
    - "O GET de status continua sendo a única confirmação de conclusão; realtime só antecipa o poll"
  artifacts:
    - path: "widgets/pedido-dashboard/model/use-adequacao-processing.ts"
      provides: "Hook useAdequacaoProcessing — submissão, polling, retry e estado de progresso da OR"
      exports: ["useAdequacaoProcessing"]
      min_lines: 250
    - path: "widgets/pedido-dashboard/model/use-adequacao-processing.test.tsx"
      provides: "Teste unitário do hook isolado via renderHook"
      min_lines: 80
    - path: "widgets/pedido-dashboard/ui/orders-list.tsx"
      provides: "Componente que delega o fluxo de mutação ao hook"
  key_links:
    - from: "widgets/pedido-dashboard/ui/orders-list.tsx"
      to: "widgets/pedido-dashboard/model/use-adequacao-processing.ts"
      via: "import + chamada do hook, recebendo setConfirmModal e devolvendo isProcessingOr/startAdequacaoAttempt/handleRetryAdequacao"
      pattern: "useAdequacaoProcessing"
    - from: "widgets/pedido-dashboard/model/use-adequacao-processing.ts"
      to: "features/pedidos/api/pedidos.api"
      via: "submitAdequacaoJob para agendar/reutilizar o job"
      pattern: "submitAdequacaoJob"
    - from: "widgets/pedido-dashboard/model/use-adequacao-processing.ts"
      to: "features/pedidos/model/adequacao-job-poller"
      via: "pollAdequacaoJob com sleep injetado (wake por realtime)"
      pattern: "pollAdequacaoJob"
---

<objective>
Extrair a fatia de mutação de adequação de `widgets/pedido-dashboard/ui/orders-list.tsx` (2069 linhas) para um hook novo em `widgets/pedido-dashboard/model/`.

Purpose: primeira fatia de um refactor maior do arquivo, feito um hook por vez. Esta fatia é a mais crítica do arquivo (idempotência, polling e retry do processamento durável) e por isso sai primeiro, isolada e com teste próprio.

Output: `use-adequacao-processing.ts` (hook), `use-adequacao-processing.test.tsx` (teste unitário novo) e `orders-list.tsx` religado ao hook.

**Isto é um movimento estrutural, não uma reescrita.** Nenhum comportamento observável muda. Os corpos das funções movidas são copiados como estão; só mudam (a) onde o código vive, (b) de onde vêm as dependências que antes eram closure sobre o componente.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@widgets/pedido-dashboard/ui/orders-list.tsx
@widgets/pedido-dashboard/ui/orders-list.processing.test.tsx
@features/pedidos/model/use-realtime-resource-refresh.ts
@features/pedidos/model/use-pedidos-queues.ts
@features/pedidos/model/adequacao-job-poller.ts
@features/pedidos/ui/modals/confirm-alert-modal.tsx

## Convenções já verificadas neste repositório

- Hooks de `model/` são kebab-case `use-*.ts`, abrem com `"use client";`, expõem uma interface de opções e trazem comentários explicativos em português (ver `features/pedidos/model/use-realtime-resource-refresh.ts`).
- Testes de hook usam `renderHook` de `@testing-library/react`, arquivo colocalizado `*.test.tsx` (ver `features/pedidos/model/use-pedidos-queues.test.tsx`).
- `widgets/pedido-dashboard/model/` **ainda não existe** — é criado por este plano, irmão de `lib/` e `ui/` que já existem lá. Não é padrão novo: espelha `features/pedidos/model/`.
- Vitest: `include: ["**/*.test.{ts,tsx}"]`, alias `@` → raiz, `globals: true`, `jsdom`.
- `pnpm lint` é `eslint .`; `react-hooks/exhaustive-deps` entra como **warning**, não quebra o comando.

## Inventário verificado do que é (e do que NÃO é) desta fatia

Confirmado por grep em todo o repositório: os identificadores abaixo só existem em `orders-list.tsx` e só servem a este fluxo.

**Move para o hook** (referências de linha do arquivo atual):

| Linhas | O quê |
| --- | --- |
| 330-336 | `interface AdequacaoAttempt` |
| 338-345 | `type AdequacaoRetry` |
| 347-362 | helper de rótulo de status |
| 364-383 | helper de copy de sucesso |
| 385-393 | os dois helpers de erro de abort |
| 491-496 | estado `isProcessingOr` + refs `processingOrRef`, `adequacaoAbortRef`, `adequacaoPollWakeRef`, `adequacaoRetryRef`, `ordersListMountedRef` |
| 504-513 | efeito de mount/unmount (marca montado, aborta em voo, acorda o poll, zera o ref de processando) |
| 581-582 | refs `latestOrdersRevisionRef` e `observedOrdersRevisionRef` |
| 584-586 | efeito que atualiza `latestOrdersRevisionRef` |
| 588-595 | comentário + efeito que acorda o poll quando a revisão de `orders` muda |
| 597-627 | `waitForAdequacaoPollOrRealtime` |
| 899-1087 | `executeAdequacaoAttempt` |
| 1089-1116 | `startAdequacaoAttempt` |
| 1118-1133 | `handleRetryAdequacao` |

**FICA em `orders-list.tsx`** (verificado, não mover):

- `confirmModal` / `setConfirmModal` (L490) — **é compartilhado**: usado por `handleSendDraft`, `triggerConfirmOrSemAdequacao`, `triggerConfirmOrComAdequacao`, `avisarOrIndividualIndisponivel`, `aprovarProduto` e pelo render do `ConfirmAlertModal`. Por decisão travada, permanece no componente e é **passado para dentro do hook**.
- `const { topicRevisions } = useRealtime();` (L580) — `topicRevisions.history` continua sendo usado na L653.
- `historySorting` (L628-631) e `fetchHistoryProducts` (L632-644) — **não** são desta fatia: alimentam o `usePagedResource` da aba histórico. Estão fisicamente no meio do bloco, mas o vínculo com a mutação é zero. Ficam onde estão.
- `handleEfetuarOrSemAdequacao` / `handleEfetuarOrComAdequacao` (L1135-1137) — wrappers de uma linha, passam a chamar o `startAdequacaoAttempt` devolvido pelo hook.
- `triggerConfirmOrSemAdequacao` / `triggerConfirmOrComAdequacao` (L877-893).
- Tudo o mais: `aprovarProduto`, `avisarOrIndividualIndisponivel`, ações por linha, busca/filtro/ordenação, paginação server-side, rascunho de comunicação.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Criar o hook useAdequacaoProcessing com a fatia movida</name>
  <files>widgets/pedido-dashboard/model/use-adequacao-processing.ts</files>
  <action>
Criar o diretório `widgets/pedido-dashboard/model/` e o arquivo `use-adequacao-processing.ts` (extensão `.ts` — não há JSX). Abrir com `"use client";`, seguindo `features/pedidos/model/use-realtime-resource-refresh.ts`.

Copiar para este arquivo, **sem reescrever a lógica**, os blocos listados na tabela "Move para o hook" do `<context>`. Os corpos das funções são copiados como estão; a única mudança permitida é a origem das dependências que antes eram closure sobre o componente. Mover junto os tipos e helpers de módulo (`AdequacaoAttempt`, `AdequacaoRetry`, rótulo de status, copy de sucesso, os dois helpers de abort) mantendo-os privados do módulo — nenhum deles é usado fora desta fatia.

Contrato do hook:

Interface de opções `UseAdequacaoProcessingOptions` com os campos: `selectedChannel` (mesmo union `'Todos' | 'Franquia' | 'Multimarca'` da prop do componente); `ordersRevision: number`; `usingServerOrders: boolean`; `reloadAllOrders: () => Promise<boolean>`; `refetchSummary?: () => boolean | Promise<boolean>`; `setConfirmModal` tipado como `Dispatch<SetStateAction<ConfirmModalState | null>>` importando o tipo de `@/features/pedidos/ui/modals/confirm-alert-modal`.

Retorno: objeto com `isProcessingOr: boolean`, `startAdequacaoAttempt: (mode: AdequacaoMode) => void` e `handleRetryAdequacao: () => void`. `waitForAdequacaoPollOrRealtime` permanece interna, não é devolvida.

Mapeamento das dependências de closure:

- `selectedChannel` → opção de mesmo nome (usado ao montar a intenção e ao comparar `sameIntent`).
- `topicRevisions.orders` → opção `ordersRevision`; o hook **não** chama `useRealtime()`. Isso mantém uma única assinatura de realtime na árvore e preserva o mock existente do teste de integração.
- `usingServerOrders` e `reloadAllOrders` → opções de mesmo nome.
- `injectedRefetchOrders` → opção `refetchSummary`. **Atenção:** é a prop crua `refetchOrders` de `OrdersList`, NÃO o `refetchOrders` memoizado da L460. O fluxo lê o valor devolvido (`false` → sucesso vira aviso) e o memoizado devolve `void` e ainda dispara `reloadAllOrders` de novo — passar o errado quebra o caso "resumo não pôde ser concluída" e duplica fetch.
- `setConfirmModal` → opção de mesmo nome, injetada; todas as chamadas de progresso/erro/sucesso passam a usá-la. Incluí-la nos arrays de dependências dos `useCallback` — a identidade de um setter de `useState` é estável por garantia do React, então isso não muda nada em runtime, e sem isso o `exhaustive-deps` reclama. Não desligar a regra com comentário.

Detalhes que precisam sair byte-equivalentes (são os invariantes documentados nos comentários do código original — copiar os comentários junto):

- A mesma chave idempotente sobrevive a retry do MESMO payload; só uma falha TERMINAL marcada `retryable` (ou um 409 na submissão) cria intenção/chave nova.
- O POST só agenda/reutiliza um job; a conclusão vem exclusivamente do GET de status. Um evento de realtime não substitui o GET — só encerra a espera atual para o poll consultar mais cedo.
- `attempt.accepted = accepted;` depois da submissão bem-sucedida — é a mutação que faz o retry de polling reaproveitar o mesmo job em vez de repetir o POST. Manter.
- A guarda de reentrância por `processingOrRef` no topo, antes de qualquer `setState`.
- O `finally` só limpa se o `AbortController` ainda for o corrente, e só chama o setter de processando se ainda estiver montado.
- As duas checagens de `mounted || signal.aborted` antes de confirmar sucesso, e a checagem de `terminal.mode`/`terminal.channel` contra a intenção antes de aplicar qualquer confirmação na tela.
- No `waitFor`, o cleanup só zera o ref de wake se ele ainda apontar para o próprio handler desta espera.

Preservar a ordem de declaração dos três efeitos entre si: primeiro o de mount/unmount, depois o que atualiza a revisão mais recente, depois o que acorda o poll. A ordem de cleanup no unmount depende disso.

Acrescentar um bloco JSDoc curto no topo do hook, em português, dizendo que ele é dono do ciclo submissão → polling → retry da OR e que a confirmação vem só do GET de status. Não reproduzir nele o nome de nenhum símbolo removido do componente.
  </action>
  <verify>
    <automated>test -f widgets/pedido-dashboard/model/use-adequacao-processing.ts && grep -q "export function useAdequacaoProcessing" widgets/pedido-dashboard/model/use-adequacao-processing.ts && grep -q "submitAdequacaoJob" widgets/pedido-dashboard/model/use-adequacao-processing.ts && grep -q "pollAdequacaoJob" widgets/pedido-dashboard/model/use-adequacao-processing.ts && pnpm typecheck && pnpm lint</automated>
  </verify>
  <done>O arquivo existe, exporta `useAdequacaoProcessing`, contém o ciclo completo de submissão/polling/retry, e `pnpm typecheck` + `pnpm lint` passam. `orders-list.tsx` ainda não foi tocado — a suíte continua verde porque nada mudou nele.</done>
</task>

<task type="auto">
  <name>Task 2: Religar orders-list.tsx ao hook e remover o codigo movido</name>
  <files>widgets/pedido-dashboard/ui/orders-list.tsx</files>
  <action>
Remover de `orders-list.tsx` todos os blocos da tabela "Move para o hook" e passar a consumir o hook.

Ponto de chamada: logo depois da linha que desestrutura `topicRevisions` de `useRealtime()` (L580 atual), ocupando o espaço que hoje é L581-627. Essa posição mantém o hook depois de `reloadAllOrders` (L457), do estado do modal de confirmação (L490) e do `useRealtime()`, e antes do bloco de histórico — que é exatamente onde as dependências ficam disponíveis.

Desestruturar `isProcessingOr`, `startAdequacaoAttempt` e `handleRetryAdequacao` do retorno, passando: `selectedChannel`; `ordersRevision: topicRevisions.orders`; `usingServerOrders`; `reloadAllOrders`; `refetchSummary: injectedRefetchOrders` (a prop crua, não o callback memoizado da L460); `setConfirmModal`.

Manter intactos os dois wrappers de uma linha que hoje chamam a função de início de tentativa com `'sem_adequar'` e `'adequar'` — agora apontando para o `startAdequacaoAttempt` vindo do hook. O JSX do `ConfirmAlertModal` (L2037-2044) não muda uma vírgula: continua recebendo `onRetry={handleRetryAdequacao}` e `pending={isProcessingOr}`, agora resolvidos pelo hook.

Preservar sem tocar: `historySorting` e `fetchHistoryProducts` (L628-644), que ficam fisicamente no meio do trecho removido mas não são desta fatia; o estado do modal de confirmação e todos os seus outros usuários; `aprovarProduto`; `avisarOrIndividualIndisponivel`; ações por linha; busca/filtro/ordenação; paginação; rascunho de comunicação.

Podar os imports que ficaram órfãos: de `@/features/pedidos/api/pedidos.api` saem `submitAdequacaoJob` e os tipos `AdequacaoJobAccepted`, `AdequacaoJobResult`, `AdequacaoJobSnapshot`, `AdequacaoJobStatus` e `AdequacaoMode` (os wrappers passam literais, então o tipo não é mais necessário no componente); o bloco inteiro de import de `@/features/pedidos/model/adequacao-job-poller` sai. Continuam necessários: `approveProduct`, `fetchProductNumberedPage`, `ProductProjection`, `ProductSort`, `SortOrder`, `ApiError` (usado no envio do rascunho), `useRealtime`, `ConfirmModalState`. Acrescentar o import do hook novo por caminho com alias `@/widgets/pedido-dashboard/model/use-adequacao-processing`, coerente com os demais imports do arquivo.

Não deixar comentário de "movido para X" no lugar do código removido — o histórico do git já registra isso.
  </action>
  <verify>
    <automated>grep -q "useAdequacaoProcessing" widgets/pedido-dashboard/ui/orders-list.tsx && ! grep -q "const executeAdequacaoAttempt" widgets/pedido-dashboard/ui/orders-list.tsx && ! grep -q "const startAdequacaoAttempt" widgets/pedido-dashboard/ui/orders-list.tsx && ! grep -q "adequacaoRetryRef" widgets/pedido-dashboard/ui/orders-list.tsx && ! grep -q "adequacaoPollWakeRef" widgets/pedido-dashboard/ui/orders-list.tsx && ! grep -q "ordersListMountedRef" widgets/pedido-dashboard/ui/orders-list.tsx && grep -q "fetchHistoryProducts" widgets/pedido-dashboard/ui/orders-list.tsx && grep -q "setConfirmModal" widgets/pedido-dashboard/ui/orders-list.tsx && pnpm typecheck && pnpm lint && pnpm test -- widgets/pedido-dashboard/ui/orders-list.processing.test.tsx</automated>
  </verify>
  <done>`orders-list.tsx` importa e chama o hook; nenhuma das funções/refs da fatia sobrou no componente; `fetchHistoryProducts` e o estado do modal de confirmação continuam lá; typecheck e lint passam; `orders-list.processing.test.tsx` passa **sem nenhuma alteração no arquivo de teste** (se ele precisou ser editado para passar, o movimento não foi estrutural — reverter e corrigir o hook).</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Teste unitario do hook isolado e gates completos</name>
  <files>widgets/pedido-dashboard/model/use-adequacao-processing.test.tsx</files>
  <behavior>
    - Submissão feliz: `startAdequacaoAttempt('sem_adequar')` chama `submitAdequacaoJob` uma vez com o modo, o canal e uma chave idempotente; ao terminar com `succeeded`, `reloadAllOrders` e `refetchSummary` são chamados e o setter do modal recebe `type: 'success'`.
    - Reentrância: duas chamadas seguidas antes da conclusão produzem **uma** submissão só, e `isProcessingOr` fica `true` durante o voo.
    - Falha de polling: `pollAdequacaoJob` rejeitando com erro de polling deixa o modal em `type: 'alert'` com `retryLabel` de verificação; `handleRetryAdequacao` repete só o polling — `submitAdequacaoJob` continua com uma chamada e o mesmo `jobId` é reconsultado.
    - Chave idempotente: falha de rede no POST preserva a chave (a segunda submissão usa a mesma); falha terminal `failed` + `retryable` seguida de `handleRetryAdequacao` gera chave **diferente**.
    - Terminal divergente: snapshot com `mode` ou `channel` diferentes da intenção não produz modal de sucesso.
    - Desmontagem: desmontar com uma tentativa em voo aborta o `AbortSignal` entregue a `submitAdequacaoJob`.
  </behavior>
  <action>
Criar `widgets/pedido-dashboard/model/use-adequacao-processing.test.tsx` exercitando o hook **isolado**, sem renderizar `OrdersList`.

Usar `renderHook` de `@testing-library/react`, seguindo o estilo de `features/pedidos/model/use-pedidos-queues.test.tsx`. Mockar via `vi.hoisted` + `vi.mock`: `@/features/pedidos/api/pedidos.api` (precisa expor `submitAdequacaoJob`) e `@/features/pedidos/model/adequacao-job-poller` (preservando o erro real de polling com `importOriginal`, como já faz o teste de integração). Não é preciso mockar `@/features/realtime`: o hook recebe a revisão por parâmetro — cobrir a antecipação do poll por realtime é opcional aqui, já que o teste de integração existente cobre esse caminho ponta a ponta.

Passar `setConfirmModal` como `vi.fn()` e fazer as asserções de UX sobre os objetos que ele recebe (`type`, `retryLabel`, `progress.label`), em vez de procurar texto na tela. Fornecer `reloadAllOrders` e `refetchSummary` como `vi.fn()` resolvendo `true` por padrão.

Reaproveitar as fábricas de `AdequacaoJobAccepted` e `AdequacaoJobSnapshot` no mesmo formato do teste de integração (jobIds em UUID, `result` com as quatro contagens). Não importar essas fábricas do outro arquivo de teste — duplicá-las localmente mantém os dois testes independentes.

Cobrir exatamente os casos listados em `<behavior>`. Não replicar aqui os casos que só fazem sentido pela UI (progresso renderizado, botão desabilitado) — esses continuam sendo do teste de integração.

Fechar rodando a suíte completa. Falhas de timeout em `orders-list.pagination.test.tsx` sob carga da suíte cheia são instabilidade pré-existente já confirmada no baseline: **não** tentar corrigi-las e não deixar que bloqueiem a entrega — mas se elas aparecerem, reconfirmar isolando esse arquivo (`pnpm test -- widgets/pedido-dashboard/ui/orders-list.pagination.test.tsx`) e registrar o resultado no SUMMARY. Qualquer falha **fora** desse arquivo é regressão e precisa ser corrigida antes de fechar.
  </action>
  <verify>
    <automated>pnpm test -- widgets/pedido-dashboard/model/use-adequacao-processing.test.tsx && pnpm test -- widgets/pedido-dashboard/ui/orders-list.processing.test.tsx && pnpm typecheck && pnpm lint && pnpm test</automated>
  </verify>
  <done>O teste unitário do hook passa isolado, o teste de integração continua passando sem edição, typecheck e lint limpos, e `pnpm test` não apresenta nenhuma falha nova fora da instabilidade conhecida de `orders-list.pagination.test.tsx`.</done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
| --- | --- |
| navegador → API de processamento | O POST de agendamento e o GET de status atravessam a fronteira; a chave idempotente é o que impede processamento duplicado do lado do servidor |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
| --- | --- | --- | --- | --- |
| T-260828-emx-01 | Tampering | ciclo de submissão da OR | mitigate | Refactor puramente estrutural: a chave idempotente, a guarda de reentrância e a regra de rotação de chave são copiadas sem alteração e cobertas por teste unitário novo (Task 3) além do teste de integração existente |
| T-260828-emx-02 | Repudiation | confirmação de conclusão | mitigate | O GET de status permanece a única fonte de confirmação; a checagem de `mode`/`channel` do snapshot contra a intenção é preservada e testada |
| T-260828-emx-SC | Tampering | instalação de pacotes | accept | Nenhum pacote novo é instalado — o hook só reusa dependências já presentes |

</threat_model>

<verification>
1. `pnpm typecheck` limpo.
2. `pnpm lint` limpo.
3. `pnpm test` sem falhas novas (baseline conhecido: timeouts intermitentes em `orders-list.pagination.test.tsx` sob carga da suíte completa).
4. `widgets/pedido-dashboard/ui/orders-list.processing.test.tsx` passa **sem nenhuma linha alterada** — é a prova de que o comportamento foi preservado.
5. `widgets/pedido-dashboard/ui/orders-list.tsx` encolheu ~280 linhas e não contém mais nenhum símbolo da fatia de mutação.
</verification>

<success_criteria>
- `widgets/pedido-dashboard/model/use-adequacao-processing.ts` é a única definição do ciclo submissão → polling → retry da adequação.
- `orders-list.tsx` delega o fluxo ao hook, mantendo o estado do modal de confirmação (compartilhado com outras ações) no componente.
- Existe teste unitário do hook em isolamento cobrindo idempotência, reentrância, retry de polling e abort na desmontagem.
- Nada fora do escopo travado foi tocado: aprovação por produto, ações por linha, busca/filtro/ordenação, paginação e rascunho de comunicação seguem intactos.
- Três commits atômicos na branch `develop`, um por task.
</success_criteria>

<output>
Create `.planning/quick/260828-emx-extrair-a-muta-o-de-adequa-o-de-ordersli/260828-emx-SUMMARY.md` when done.
</output>
