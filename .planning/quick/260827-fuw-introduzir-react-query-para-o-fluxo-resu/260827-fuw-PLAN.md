---
phase: quick-260827-fuw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - shared/providers/QueryProvider.tsx
  - shared/providers/QueryProvider.test.tsx
  - app/(app)/layout.tsx
  - lib/api/http-client.ts
  - lib/api/http-client.test.ts
  - lib/api/api-error-message.ts
  - lib/api/api-error-message.test.ts
  - features/pedidos/model/use-evolucao-faturamento.ts
  - features/pedidos/model/app-data-provider.tsx
  - features/pedidos/model/app-data-provider.test.tsx
autonomous: false
requirements: [QUICK-260827-FUW]

must_haves:
  truths:
    - "Em /visao-geral o gráfico de evolução de faturamento continua carregando, exibindo dados e reagindo a revisões de realtime exatamente como hoje"
    - "Nenhuma requisição protegida sai antes do Bearer estar instalado no cliente HTTP (sem falsa 401 -> loop de logout)"
    - "Trocar de usuário/token não pinta dados do login anterior: o cache da evolução é descartado"
    - "Falha na primeira carga vira erro visível e retentável; falha em refresh de background mantém o último dashboard bom"
    - "Um erro de API carrega status e corpo estruturado do backend para quem precisar, sem alterar o que os call sites atuais leem"
    - "/pedidos (que só usa resumo) segue sem buscar evolução"
  artifacts:
    - path: "shared/providers/QueryProvider.tsx"
      provides: "QueryClientProvider client-side com defaults que espelham o comportamento atual (sem retry, sem refetch em foco/reconnect)"
      contains: "QueryClientProvider"
    - path: "lib/api/api-error-message.ts"
      provides: "Mapeamento erro desconhecido -> mensagem segura para UI"
      exports: ["apiErrorMessage"]
    - path: "features/pedidos/model/use-evolucao-faturamento.ts"
      provides: "Hook React Query da evolução de faturamento, com a mesma superfície que o provider consumia do useLatestResource"
      exports: ["useEvolucaoFaturamento", "evolucaoFaturamentoQueryKey"]
  key_links:
    - from: "app/(app)/layout.tsx"
      to: "shared/providers/QueryProvider.tsx"
      via: "QueryProvider envolve RealtimeProvider/AppDataProvider — sem ancestral, o hook lança em runtime"
      pattern: "QueryProvider"
    - from: "features/pedidos/model/app-data-provider.tsx"
      to: "features/pedidos/model/use-evolucao-faturamento.ts"
      via: "provider chama o hook e continua publicando evolucaoFaturamento/overviewLoading/overviewError no contexto"
      pattern: "useEvolucaoFaturamento"
    - from: "features/pedidos/model/use-evolucao-faturamento.ts"
      to: "lib/api/api-error-message.ts"
      via: "erro do React Query virou string segura para ErrorState"
      pattern: "apiErrorMessage"
    - from: "features/pedidos/model/app-data-provider.tsx"
      to: "features/pedidos/model/use-coalesced-revision-refresh.ts"
      via: "refresh() do hook devolve Promise<boolean>, contrato exigido pelo coalescedor"
      pattern: "useCoalescedRevisionRefresh"
---

<objective>
Introduzir React Query no frontend por uma porta estreita: instalar e montar o `QueryClientProvider`, tipar o erro do `apiFetch` para carregar o corpo estruturado do backend, e migrar **um** dos dois fluxos do `AppDataProvider` para um hook React Query — preservando 100% da superfície pública de `useAppData()`.

Purpose: o `AppDataProvider` acumula orquestração manual de fetch (`useLatestResource` + efeitos de rota + coalescing) que React Query resolve nativamente. Esta tarefa cria o beachhead (provider + erro tipado + um fluxo migrado com testes verdes) para que a segunda migração seja mecânica.

Output: `@tanstack/react-query` instalado, `QueryProvider` montado no grupo `(app)`, `ApiRequestError` com `status` + `body`, helper `apiErrorMessage`, hook `useEvolucaoFaturamento`, e `app-data-provider.test.tsx` passando sem alterar nenhuma asserção.
</objective>

## Decisão de escopo: migrar `evolucaoFaturamento`, não `resumo`

Levantamento feito no código antes de planejar:

| Critério | `resumo` (`fetchPedidosResumo`) | `evolucaoFaturamento` (`fetchEvolucaoFaturamento`) |
| --- | --- | --- |
| Rotas que consomem | duas: `/visao-geral` **e** `/pedidos` (`usesResumo`) | uma: `/visao-geral` |
| Consumidores do dado | `visao-geral/page.tsx`, `pedidos/page.tsx`, `dashboard-overview.tsx` | só `dashboard-overview.tsx` |
| API imperativa exposta no contexto | sim — `refetchPedidosResumo` é entregue ao `OrdersList` como `refetchOrders` e é chamado após mutações (aprovar produto, salvar grade, job de adequação) | não — só participa de `refetchOverview`, que já agrega os dois |
| Papel no coalescing de realtime | dispara sozinho em `/pedidos` e junto em `/visao-geral` | só junto, e só em `/visao-geral` |
| Alimenta contadores de fila/tolerância | sim (`statsByChannel`, `channelTotalsLoading`, `channelTotalsError`) | não (só a série do gráfico) |

**Decisão: migrar `evolucaoFaturamento` primeiro.** É o fluxo com uma rota, um consumidor, nenhuma invalidação disparada por mutação e nenhuma participação em contadores de fila. Errar nele degrada um gráfico; errar em `resumo` degrada os números de OR nas duas telas principais e o refresh pós-mutação da lista de pedidos — exatamente o "motor ilegível" que faz o time voltar para o Excel. `resumo` fica para a segunda migração, quando o padrão (query key, gating por token, ponte com o coalescedor) já estiver validado por testes.

## Invariantes que NÃO podem quebrar

`features/pedidos/model/app-data-provider.test.tsx` é o oráculo desta tarefa. O cabeçalho dele documenta duas entregas revertidas; leia antes de editar. Em particular:

1. **Ordem token → fetch.** Efeitos de filhos rodam antes dos efeitos do pai. Se o observer do React Query disparar antes de `setAuthToken`, o GET sai sem Bearer, toma 401, e o `apiFetch` traduz 401 em signOut: loop de login em toda rota. O gate é `apiClientReady` (que já cruza `useSyncExternalStore` com o token da sessão).
2. **Carga por rota.** `/parametros` e `/pedidos` não podem pedir `evolucao-faturamento`.
3. **Último dado bom.** Falha de refresh em background vira `overviewRefreshError` com o dashboard ainda pintado; falha de primeira carga vira `overviewError` com esqueleto/erro.

As asserções desse arquivo devem permanecer **literalmente inalteradas**. A única edição permitida é envolver os `render`/`rerender` num `QueryClientProvider`.

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@AGENTS.md
@.claude/CLAUDE.md

# Alvos diretos
@features/pedidos/model/app-data-provider.tsx
@features/pedidos/model/app-data-provider.test.tsx
@features/pedidos/model/use-latest-resource.ts
@features/pedidos/model/use-coalesced-revision-refresh.ts
@lib/api/http-client.ts
@lib/api/http-client.test.ts
@app/(app)/layout.tsx

# Padrões a seguir / contratos a respeitar
@lib/api/fetch-with-timeout.ts
@lib/api/parse-api-error-message.ts
@features/pedidos/api/pedidos.api.ts
@shared/providers/SessionProvider.tsx
@app/(app)/visao-geral/page.tsx
</context>

<tasks>

<task type="checkpoint:human-verify" gate="blocking-human">
  <name>Task 1a: Confirmar legitimidade do pacote antes de instalar</name>
  <what-built>Nada ainda. Esta tarefa existe porque o plano introduz uma dependência npm nova e não há `RESEARCH.md` com auditoria de legitimidade neste repositório — a política de fallback trata o pacote como `[ASSUMED]`, e instalação de pacote ASSUMED exige confirmação humana (supply chain, T-QUICK-SC).</what-built>
  <action>Não instale nada nesta task. Apresente ao desenvolvedor o pacote a instalar (`@tanstack/react-query`, major 5) e os pontos de verificação abaixo, e aguarde aprovação explícita. Checkpoint de legitimidade de pacote não é auto-aprovável, mesmo com auto-advance ligado.</action>
  <how-to-verify>
    1. Abra https://www.npmjs.com/package/@tanstack/react-query
    2. Confirme: publisher é a organização TanStack, repositório aponta para github.com/TanStack/query, e o volume de downloads semanais é de ordem de milhões (não centenas).
    3. Confirme que a versão major que será instalada é a 5.x.
    4. Confirme que o nome está exato — sem typo, sem escopo alternativo.
  </how-to-verify>
  <verify>
    <human-check>Desenvolvedor confirmou publisher, repositório, downloads e major do pacote em npmjs.com.</human-check>
  </verify>
  <done>Aprovação explícita registrada; nenhuma dependência instalada até aqui.</done>
  <resume-signal>Digite "aprovado" para liberar a instalação, ou informe a versão/decisão alternativa.</resume-signal>
</task>

<task type="auto">
  <name>Task 1b: Instalar React Query e montar o QueryProvider no grupo (app)</name>
  <files>package.json, shared/providers/QueryProvider.tsx, shared/providers/QueryProvider.test.tsx, app/(app)/layout.tsx</files>
  <action>
    Antes de escrever código: este repositório roda Next.js 16 e o `AGENTS.md` da raiz é explícito — consulte o guia pertinente em `node_modules/next/dist/docs/` sobre composição de provider client-side dentro de layout de servidor antes de editar `app/(app)/layout.tsx`. Não assuma convenções de versões anteriores.

    Instale a dependência com pnpm (o gerenciador declarado em `package.json` é `pnpm@11.5.2`): adicione `@tanstack/react-query` como dependência de produção. Não adicione as devtools nesta tarefa.

    Crie `shared/providers/QueryProvider.tsx` como componente de cliente, seguindo o padrão de nomenclatura do irmão `SessionProvider.tsx`. Regras obrigatórias:

    - A instância de `QueryClient` deve ser criada **por montagem**, dentro do componente, via inicializador preguiçoso de estado. Criar no escopo do módulo compartilharia cache entre requisições no servidor e, pior, entre usuários — é o mesmo defeito de identidade que motivou a remoção do cache em `sessionStorage` (ver comentário no `app-data-provider.tsx`).
    - Defaults de query escolhidos para **espelhar o comportamento atual** do `useLatestResource`, não os defaults da biblioteca: sem retry automático (hoje uma falha vira erro visível na primeira tentativa, e os testes de falha dependem disso), sem refetch ao focar a janela e sem refetch ao reconectar (hoje não existe nenhum dos dois; quem cuida de reconexão é o `resyncGeneration` do realtime). Defina também um `staleTime` diferente de zero para que remontagens de rota não disparem rajadas de refetch.
    - Documente cada default com um comentário curto de uma linha explicando qual comportamento atual ele preserva. Comentário aqui é contrato, não decoração: sem ele a próxima pessoa "corrige" os defaults e reintroduz retry em cima de um 401.

    Em `app/(app)/layout.tsx`, envolva a árvore existente com `QueryProvider`, posicionando-o **acima** de `RealtimeProvider` e `AppDataProvider` (o `AppDataProvider` vai precisar do client na Task 3). Não toque em `app/layout.tsx`: a árvore de autenticação/login não consome nada de React Query e mantê-la fora reduz o raio de impacto.

    Crie `shared/providers/QueryProvider.test.tsx` cobrindo dois fatos: (a) o provider renderiza seus filhos; (b) um filho que pede o query client recebe um client cujas opções default de query refletem as escolhas acima (leia as opções default pelo próprio client, não por reimplementação do objeto no teste).
  </action>
  <verify>
    <automated>pnpm exec vitest run shared/providers/QueryProvider.test.tsx && pnpm typecheck</automated>
  </verify>
  <done>`@tanstack/react-query` consta em `dependencies` do `package.json`; `QueryProvider` existe como componente de cliente com client por montagem e defaults comentados; `app/(app)/layout.tsx` renderiza `QueryProvider` como ancestral de `RealtimeProvider`; `app/layout.tsx` intocado; o teste novo passa e `pnpm typecheck` fica limpo.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Tipar o erro do apiFetch com status + corpo estruturado</name>
  <files>lib/api/http-client.ts, lib/api/http-client.test.ts, lib/api/api-error-message.ts, lib/api/api-error-message.test.ts</files>
  <behavior>
    - Resposta não-ok com corpo JSON do backend: o erro lançado carrega o status numérico e o objeto desserializado do corpo.
    - Resposta não-ok com corpo vazio, ou com corpo que não é JSON válido (página de erro HTML de proxy, por exemplo): ainda lança erro com o status correto e sem corpo — a falha de leitura/parse nunca substitui nem mascara o status HTTP.
    - Resposta 401 continua acionando o callback de não-autorizado, e continua acionando **antes** de o erro ser lançado.
    - Resposta 204 continua resolvendo sem corpo, sem tentar parse.
    - Caminho de sucesso permanece byte-idêntico em comportamento: os dois testes existentes em `http-client.test.ts` (deadline mantido até o fim do parse; JSON concluído dentro do prazo) passam sem alteração.
    - Call sites que hoje só leem a propriedade de status via a interface `ApiError` continuam compilando e funcionando sem edição.
    - `apiErrorMessage` devolve a mensagem legível do backend quando o corpo permite extraí-la; devolve a mensagem do erro quando é um erro comum de aplicação; e devolve o texto genérico de fallback quando nada é aproveitável.
    - `apiErrorMessage` nunca devolve texto técnico ou sensível: um corpo de erro contendo traceback, URL interna, token ou e-mail não pode vazar para a string retornada.
  </behavior>
  <action>
    Em `lib/api/http-client.ts`, substitua o `Error` genérico por uma classe de erro exportada (nome sugerido: `ApiRequestError`) que estenda `Error`, carregue o status numérico e o corpo desserializado do backend, e **satisfaça a interface `ApiError` já exportada**. Mantenha `ApiError` exportada como está: `widgets/pedido-dashboard/ui/orders-list.tsx` e `features/pedidos/ui/modals/product-grade-detail-modal.tsx` fazem cast para ela em quatro lugares e não devem ser tocados nesta tarefa. Mantenha também a mensagem atual do erro inalterada — o texto do `message` é lido indiretamente por superfícies de UI e mudá-lo aqui espalharia o diff para fora do escopo; a mensagem amigável é responsabilidade do helper novo.

    Para obter o corpo: hoje o `shouldParse` passado ao `fetchJsonWithTimeout` descarta deliberadamente o corpo de respostas não-ok. Passe a permitir a leitura em respostas não-ok também, mantendo a exclusão do 204, e forneça um `parse` próprio que **tolera falha**: em resposta não-ok, corpo malformado ou vazio deve resultar em ausência de corpo, nunca em exceção de parse escapando. Atenção ao contrato do helper: `parse` roda dentro do deadline e qualquer exceção que ele lance sobe no lugar do erro HTTP.

    Registre em comentário no ponto da mudança o tradeoff aceito: ler o corpo de erro passa a consumir o mesmo deadline e o mesmo limite de bytes que já valem para respostas de sucesso, portanto um corpo de erro gigante ou muito lento pode agora emergir como erro de tamanho/timeout em vez do erro de status. É uma falha honesta e dentro do limite que a aplicação já tolera no caminho de sucesso — mas precisa estar escrito, porque não é obvio na leitura.

    Crie `lib/api/api-error-message.ts` exportando `apiErrorMessage(error: unknown): string`. Ele deve, em ordem: extrair a mensagem do corpo estruturado reutilizando `parseApiErrorMessage` de `lib/api/parse-api-error-message.ts` quando o erro for um `ApiRequestError` com corpo; cair para a mensagem do erro quando for um `Error` com mensagem própria e não técnica; e cair para o mesmo texto genérico de fallback que `use-latest-resource.ts` já usa hoje, para que as duas superfícies de erro digam a mesma coisa. Não reimplemente a filtragem de conteúdo técnico/sensível — `parseApiErrorMessage` já a faz e é a mitigação de T-QUICK-01. Não altere `use-latest-resource.ts` nesta tarefa: trocá-lo mexeria também nas mensagens de `resumo` e `parametros`, fora do escopo; a convergência acontece na segunda migração.

    Escreva os testes primeiro, em `lib/api/api-error-message.test.ts` (novo) e estendendo `lib/api/http-client.test.ts` (preservando os dois casos existentes), cobrindo cada item do bloco de comportamento acima.
  </action>
  <verify>
    <automated>pnpm exec vitest run lib/api && pnpm typecheck</automated>
  </verify>
  <done>Erro do `apiFetch` expõe status e corpo desserializado; corpo não-JSON/vazio não mascara o status; 401 ainda dispara o callback antes do throw; 204 inalterado; interface `ApiError` ainda exportada e os quatro call sites que fazem cast para ela seguem sem edição; `apiErrorMessage` exportado e coberto por teste, incluindo o caso de corpo com conteúdo técnico/sensível; toda a suíte de `lib/api` verde.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Migrar evolucaoFaturamento para um hook React Query</name>
  <files>features/pedidos/model/use-evolucao-faturamento.ts, features/pedidos/model/app-data-provider.tsx, features/pedidos/model/app-data-provider.test.tsx</files>
  <behavior>
    - Em `/visao-geral`, a evolução é buscada uma vez, e nenhuma requisição sai antes de o Bearer estar instalado.
    - Em `/pedidos` e `/parametros`, a evolução não é buscada.
    - Uma revisão de realtime em `/visao-geral` refaz resumo e evolução como uma unidade, com rajadas coalescidas — sem regressão no contrato de retorno booleano exigido por `useCoalescedRevisionRefresh`.
    - Troca de token descarta o dado em cache da evolução: nenhum dado do login anterior aparece.
    - Primeira carga com falha produz `overviewError` preenchido e `overviewLoading` falso após a falha; o botão de retry refaz a busca e limpa o erro.
    - Falha em refresh de background com dado já carregado produz `overviewRefreshError`, mantendo `overviewError` nulo, `overviewLoading` falso e `resumo` presente.
    - `dashboard-overview.tsx`, `visao-geral/page.tsx` e `pedidos/page.tsx` não precisam de nenhuma edição.
  </behavior>
  <action>
    Antes de escrever o hook: confirme na versão instalada de `@tanstack/react-query` (tipos em `node_modules` e/ou docs via Context7) a semântica exata dos campos que você vai usar para reconstruir `loadedOnce` e `error`. Este ponto é o de maior risco da tarefa — a diferença entre "tem dado bom e o refresh falhou" e "nunca carregou" é o que separa `overviewRefreshError` de `overviewError`, e os testes existentes cobrem os dois. Não derive esses campos de memória; verifique nos tipos instalados e deixe o teste decidir.

    Crie `features/pedidos/model/use-evolucao-faturamento.ts` (componente de cliente) exportando a query key estável e um hook `useEvolucaoFaturamento` que recebe um flag de habilitação e devolve exatamente a superfície que o provider consumia do `useLatestResource`: o array de dados, um booleano de "carregou ao menos uma vez", a mensagem de erro já mapeada para string ou nulo, e um `refresh` que devolve `Promise<boolean>`.

    Pontos obrigatórios do hook:

    - Fonte de dados: `fetchEvolucaoFaturamento` de `features/pedidos/api/pedidos.api.ts`, repassando o sinal de cancelamento que o React Query fornece à função de query. Não crie um segundo caminho de fetch.
    - A query key **não pode conter o token de acesso** (T-QUICK-02): a invalidação por identidade de usuário é feita por remoção explícita do cache, não por chave. Exporte a key para que o provider possa removê-la.
    - "Carregou ao menos uma vez" deve ser derivado de um campo que só é escrito em sucesso de fetch. Não use `initialData` para o array vazio, porque instalar dado inicial marca a query como tendo dado e derrubaria o esqueleto de carregamento; devolva o fallback de array vazio a partir de uma constante estável no escopo do módulo para não quebrar a identidade referencial de quem memoiza sobre ele (`dashboard-overview.tsx` memoiza a série por `evolucaoFaturamento`).
    - Mensagem de erro via `apiErrorMessage` da Task 2, devolvendo nulo quando não há erro.
    - `refresh` deve traduzir o resultado do refetch em booleano usando o campo de sucesso que os tipos instalados expõem. Registre em comentário que o refetch ignora o flag de habilitação na v5 — é seguro aqui porque os dois chamadores (`refetchOverview` e o agregado de revisão) só rodam em `/visao-geral`, mas é uma armadilha para quem reaproveitar o hook.

    Em `features/pedidos/model/app-data-provider.tsx`:

    - Mova o cálculo de `apiClientReady` para **antes** das chamadas de hook de dados (ele só depende de `authStatus`, `accessToken` e `installedAccessToken`, todos disponíveis no topo) e habilite a query com `apiClientReady` combinado com a rota ser `visao-geral`. Esse gate é o que preserva a invariante 1 das notas acima: sem ele o observer da query dispara no mount do provider, antes do efeito que instala o token.
    - Remova a chamada de `useLatestResource` da evolução e tudo que ela destruturava, substituindo pelos valores do hook novo. Mantenha o `useLatestResource` do `resumo` intacto.
    - Remova o ramo da evolução do efeito de carga por rota; quem passa a decidir é o flag de habilitação da query. Preserve no efeito a chamada de instalação do token e o ramo do `resumo`.
    - No efeito de troca de token, substitua o reset da evolução pela remoção da query do cache, obtendo o client via o hook de acesso ao query client. Mantenha o reset do `resumo` e a limpeza do pedido selecionado, e mantenha o comentário existente sobre o cache antigo em `sessionStorage` — ele explica por que o descarte por identidade é obrigatório.
    - Mantenha **idênticas** as fórmulas de `erroDeCarga`, `overviewLoading`, `overviewError` e `overviewRefreshError`, apenas trocando as variáveis de origem. Não reescreva a lógica de "último dado bom": ela é o que o teste de refresh em background verifica.
    - Atualize as dependências do `useMemo` do valor de contexto e a composição de `refetchOverviewAsync` para o `refresh` do hook. A interface `AppDataContextType` não muda.

    Em `features/pedidos/model/app-data-provider.test.tsx`: envolva os `render`/`rerender` num `QueryClientProvider` com um client de teste sem retry e com garbage collection desabilitada ou instância nova por teste, para que um caso não herde cache do anterior. **Não altere nenhuma asserção existente.** O mock de `@/lib/api/http-client` do arquivo exporta apenas `setAuthToken` e `apiFetch` — se o hook novo importar mais alguma coisa desse módulo, o mock precisa acompanhar; prefira não importar.

    Se algum teste existente só passar com asserção alterada, pare e reporte: significa que o comportamento mudou, não que o teste está velho.
  </action>
  <verify>
    <automated>pnpm exec vitest run features/pedidos/model app/\(app\)/visao-geral app/\(app\)/pedidos widgets/pedido-dashboard && pnpm typecheck && pnpm lint</automated>
  </verify>
  <done>`useEvolucaoFaturamento` existe e é a única fonte da evolução; `AppDataProvider` não usa mais `useLatestResource` para evolução, mas ainda publica `evolucaoFaturamento`, `overviewLoading`, `overviewError`, `overviewRefreshError`, `refetchOverview`, `refetchPedidosResumo`, `erroDeCarga` e `tentarNovamenteRecursos` com a mesma semântica; `AppDataContextType` inalterada; `app-data-provider.test.tsx` passa com asserções originais; nenhum arquivo de `widgets/` ou `app/(app)/*/page.tsx` editado; typecheck e lint limpos.</done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
| --- | --- |
| backend HTTP response → frontend | corpo de erro do backend passa a ser desserializado e pode alcançar a UI |
| sessão do usuário → cache em memória do React Query | dado de negócio de um token passa a viver num cache com ciclo de vida próprio |
| registry npm → bundle da aplicação | dependência nova entra no runtime do cliente |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
| --- | --- | --- | --- | --- |
| T-QUICK-01 | Information Disclosure | `lib/api/http-client.ts` + `lib/api/api-error-message.ts` | mitigate | Só texto aprovado por `parseApiErrorMessage` (que já filtra traceback/URL/token/e-mail/CPF e trunca em 240 chars) chega à UI; o corpo cru fica disponível apenas programaticamente e nunca é renderizado. Teste explícito no bloco de comportamento da Task 2. |
| T-QUICK-02 | Information Disclosure | query key de `use-evolucao-faturamento.ts` | mitigate | Token de acesso proibido na query key; isolamento por usuário é feito por remoção explícita do cache no efeito de troca de token (Task 3). |
| T-QUICK-03 | Spoofing / Denial of Service | observer da query dentro do `AppDataProvider` | mitigate | Habilitação da query condicionada a `apiClientReady`, impedindo GET protegido sem Bearer — evita falsa 401 traduzida em signOut e o loop de login em toda rota. Coberto pelos testes de ordem já existentes. |
| T-QUICK-04 | Denial of Service | leitura do corpo de erro no `apiFetch` | accept | A leitura reusa o mesmo deadline e o mesmo teto de bytes já aceitos no caminho de sucesso; um corpo de erro anômalo emerge como erro de timeout/tamanho, não como travamento. Tradeoff registrado em comentário no código. |
| T-QUICK-SC | Tampering | instalação de `@tanstack/react-query` via pnpm | mitigate | Sem `RESEARCH.md` com auditoria de legitimidade neste repositório, o pacote é tratado como `[ASSUMED]`: checkpoint humano bloqueante (Task 1a) antes do install, com verificação de publisher, repositório, downloads e versão em npmjs.com. Não auto-aprovável. |

</threat_model>

<verification>

1. `pnpm typecheck` limpo.
2. `pnpm lint` limpo.
3. `pnpm test` (suíte completa) — comparar com o baseline antes de culpar a mudança: há instabilidade conhecida de ~5 testes do vitest completo neste workspace. Rode a suíte em `git stash` primeiro se algo falhar fora dos arquivos tocados.
4. `pnpm exec vitest run features/pedidos/model/app-data-provider.test.tsx` verde **com as asserções originais**.
5. Inspeção manual do diff de `app-data-provider.test.tsx`: a única mudança deve ser o wrapper de provider.
6. `git diff --stat` não deve listar nenhum arquivo em `widgets/`, `app/(app)/visao-geral/page.tsx`, `app/(app)/pedidos/page.tsx`, `features/pedidos/model/use-latest-resource.ts`, `entities/usuario/` nem `design-system/`.

</verification>

<success_criteria>

- [ ] `@tanstack/react-query` em `dependencies`, instalado após aprovação do checkpoint de legitimidade
- [ ] `QueryProvider` client-side com client por montagem e defaults que espelham o comportamento atual, montado no layout do grupo `(app)`
- [ ] `ApiRequestError` carrega status + corpo estruturado; interface `ApiError` preservada; nenhum dos quatro call sites que fazem cast para ela editado
- [ ] `apiErrorMessage` exportado, testado, e incapaz de vazar texto técnico ou sensível
- [ ] `evolucaoFaturamento` servido por React Query, com `useAppData()` byte-compatível para todos os consumidores
- [ ] `app-data-provider.test.tsx` verde sem alteração de asserção
- [ ] `resumo` intocado (segunda migração), `AppDataProvider` ainda existe, `entities/usuario/api/` intocado
- [ ] typecheck e lint limpos

</success_criteria>

<output>
Ao concluir, registre o resultado em `.planning/quick/260827-fuw-introduzir-react-query-para-o-fluxo-resu/260827-fuw-SUMMARY.md` e adicione a linha correspondente na tabela "Quick Tasks Completed" de `.planning/STATE.md`.

Commits: Conventional Commits com escopo, atômicos por task. Commit e push apenas em `develop`, nunca em `main`, e apenas se solicitado.
</output>
